// Rendering regression check for the generated worker (#149).
// Generates a worker for the public Notion test page, runs it with `wrangler dev`
// and loads the page through it in Chromium. Every check also runs against the
// page on notion.site, so failures that Notion itself has are reported separately.
//
// Usage: npm run check:render            (RUNS=3 to retry flaky Notion responses more)
// Requires Chromium for Playwright: npx playwright install chromium
// Exit codes: 0 = pass, 1 = rendering regression, 2 = the check could not run

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const DOMAIN = "render-check.example.com";
const NOTION_SITE = "https://succinct-scar-f20.notion.site";
const ROOT_PAGE = "3e6558d7de1781bb89a9fb6adc4012d6";
const SUBPAGE = "3e6558d7de17817da2dcd0227d6062e0";
const DB_ITEM = "3e6558d7de1781258e84de9616a91c0e";
const PORT = Number(process.env.PORT || 8799);
const RUNS = Number(process.env.RUNS || 2);

const DB_VIEWS = ["table", "board", "gallery", "list", "calendar", "timeline"];

const TARGETS = {
  worker: {
    origin: `https://${DOMAIN}`,
    root: "/",
    isRoot: (p) => p === "/",
    isSubpage: (p) => p === "/subpage",
  },
  notion: {
    origin: NOTION_SITE,
    root: `/${ROOT_PAGE}`,
    isRoot: (p) => p.endsWith(ROOT_PAGE),
    isSubpage: (p) => p.endsWith(SUBPAGE),
  },
};

async function generateWorker(dir) {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });
  try {
    const { default: code } = await vite.ssrLoadModule("/src/code.ts");
    const script = code({
      myDomain: DOMAIN,
      notionUrl: `${NOTION_SITE}/${ROOT_PAGE}`,
      slugs: [["subpage", `${NOTION_SITE}/${SUBPAGE}`]],
      pageTitle: "",
      pageDescription: "",
      googleFont: "",
      customScript: "",
      customCss: "",
      optionImage: {},
      pageMetadata: {},
      structuredData: { enabled: false, schemaType: "WebPage" },
      branding: {},
      socialPreview: {},
      seo: {},
      analytics: {},
      caching: { enabled: false },
      customHtml: {},
      custom404: {},
      subdomainRedirects: [],
      redirectRules: [],
      rss: { enabled: false },
      i18n: { enabled: false, defaultLocale: "en" },
      ogImageGeneration: { enabled: false },
    });
    // wrangler dev listens on a local port; keep upstream fetches on the default port
    const patched = script.replace(
      "let url = new URL(request.url);",
      "let url = new URL(request.url); url.port = '';",
    );
    if (patched === script) throw new Error("Could not patch the worker for local use");
    fs.writeFileSync(path.join(dir, "worker.js"), patched);
    fs.writeFileSync(
      path.join(dir, "wrangler.jsonc"),
      JSON.stringify({ name: "worknot-render-check", main: "worker.js", compatibility_date: "2026-03-11" }),
    );
  } finally {
    await vite.close();
  }
}

function startWrangler(dir) {
  const bin = path.resolve("node_modules/.bin/wrangler");
  const proc = spawn(bin, ["dev", "--local-protocol", "https", "--port", String(PORT)], {
    cwd: dir,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  });
  return new Promise((resolve, reject) => {
    let log = "";
    const timer = setTimeout(() => reject(new Error(`wrangler dev did not start:\n${log}`)), 90000);
    const onData = (data) => {
      log += data;
      if (log.includes("Ready on")) {
        clearTimeout(timer);
        resolve(proc);
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("exit", (code) => reject(new Error(`wrangler dev exited (${code}):\n${log}`)));
  });
}

async function openPage(browser, target) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    serviceWorkers: "block",
    viewport: { width: 1280, height: 1000 },
  });
  const failures = [];
  const origin = new URL(target.origin).host;
  context.on("response", (response) => {
    const url = new URL(response.url());
    // 401s are expected for account-only endpoints on public pages
    if (url.host === origin && response.status() >= 400 && response.status() !== 401) {
      failures.push(`${response.status()} ${url.pathname}`);
    }
  });
  await context.route(`https://${DOMAIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    try {
      const response = await route.fetch({
        url: `https://127.0.0.1:${PORT}${url.pathname}${url.search}`,
        headers: request.headers(),
        maxRedirects: 0,
      });
      await route.fulfill({ response });
    } catch {
      await route.abort().catch(() => {});
    }
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message.slice(0, 200)));
  await page.goto(target.origin + target.root, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page
    .waitForFunction(() => document.querySelectorAll(".notion-collection_view-block").length > 0, null, {
      timeout: 40000,
    })
    .catch(() => {});
  await page.waitForTimeout(4000);
  return { context, page, errors, failures, target };
}

const state = (page) =>
  page.evaluate(() => ({
    host: location.host,
    path: location.pathname,
    h1: document.querySelector("h1")?.innerText.trim(),
    text: document.body.innerText,
  }));

// Each check returns an error message, or null when it passes.
const CHECKS = {
  "page renders": async ({ page }) => {
    const s = await state(page);
    if (s.text.includes("couldn’t be found")) return "Notion shows 'page not found'";
    return s.h1 === "Worknot Render Check" ? null : `unexpected heading: ${s.h1}`;
  },
  "database views": async ({ page }) => {
    const missing = [];
    for (const view of DB_VIEWS) {
      if (!(await page.$(`.notion-${view}-view`))) missing.push(view);
    }
    return missing.length ? `missing views: ${missing.join(", ")}` : null;
  },
  "database rows and formula": async ({ page }) => {
    const text = (await state(page)).text;
    return ["Item Alpha", "Item Beta", "Item Gamma", "40", "60"].every((t) => text.includes(t))
      ? null
      : "rows or formula values are missing";
  },
  "images load": async ({ page }) => {
    const broken = await page.evaluate(() =>
      [...document.querySelectorAll("img")]
        .filter((img) => img.getAttribute("src")?.startsWith("/image/") && !(img.complete && img.naturalWidth > 0))
        .map((img) => img.getAttribute("src").slice(0, 80)),
    );
    const count = await page.$$eval("img[src^='/image/']", (imgs) => imgs.length);
    if (count < 2) return `expected cover and uploaded image, found ${count}`;
    return broken.length ? `broken images: ${broken.join(", ")}` : null;
  },
  "pdf and file blocks": async ({ page }) => {
    if (!(await page.$(".notion-pdf-block"))) return "PDF block missing";
    if (!(await page.$(".notion-file-block"))) return "file block missing";
    return null;
  },
  "mermaid diagram": async ({ page }) =>
    (await page.$(".notion-code-block svg")) ? null : "mermaid diagram not rendered",
  "embeds and bookmarks": async ({ page }) => {
    const embeds = await page.$$(".notion-embed-block, .notion-bookmark-block, .notion-tweet-block");
    return embeds.length ? null : "skip: no embed or bookmark blocks on the test page";
  },
  "anchor link": async ({ page, target }) => {
    await page.click(".notion-table_of_contents-block a >> text=Anchor target", { timeout: 10000 });
    await page.waitForTimeout(1500);
    const s = await state(page);
    return target.isRoot(s.path) && s.h1 === "Worknot Render Check" ? null : `navigated away to ${s.path}`;
  },
  "database item stays on domain": async ({ page, target }) => {
    await page.click(`.notion-collection_view-block a[href*="${DB_ITEM}"]`, { timeout: 10000 });
    await page.waitForTimeout(5000);
    const s = await state(page);
    if (s.host !== new URL(target.origin).host) return `left the site: ${s.host}`;
    return s.text.includes("Item Beta body text") ? null : "item page did not render";
  },
  "navigation and history": async ({ page, target }) => {
    await page.waitForSelector(".notion-page-content", { timeout: 40000 });
    await page.click(".notion-page-content a >> text=Render Check Subpage", { timeout: 10000 });
    await page.waitForTimeout(5000);
    let s = await state(page);
    if (!target.isSubpage(s.path) || s.h1 !== "Render Check Subpage") return `after click: ${s.path} "${s.h1}"`;
    await page.goBack();
    await page.waitForTimeout(4000);
    s = await state(page);
    if (!target.isRoot(s.path) || s.h1 !== "Worknot Render Check") return `after back: ${s.path} "${s.h1}"`;
    await page.goForward();
    await page.waitForTimeout(4000);
    s = await state(page);
    return target.isSubpage(s.path) && s.h1 === "Render Check Subpage" ? null : `after forward: ${s.path} "${s.h1}"`;
  },
  "no errors": async ({ errors, failures }) => {
    const problems = [...errors, ...failures];
    return problems.length ? problems.slice(0, 5).join("; ") : null;
  },
};

const GROUPS = [
  ["page renders", "database views", "database rows and formula", "images load", "pdf and file blocks", "mermaid diagram", "embeds and bookmarks", "anchor link", "no errors"],
  // Checks that navigate run on a page of their own
  ["database item stays on domain"],
  ["navigation and history"],
];

async function runChecks(browser, target) {
  const results = Object.fromEntries(Object.keys(CHECKS).map((name) => [name, []]));
  for (let run = 0; run < RUNS; run++) {
    for (const group of GROUPS) {
      const session = await openPage(browser, target);
      for (const name of group) {
        results[name].push(await CHECKS[name](session).catch((e) => e.message.split("\n")[0]));
      }
      await session.context.close();
    }
    // Retry only while some check has not passed yet
    if (!Object.values(results).some((r) => r.every((e) => e && !e.startsWith("skip:")))) break;
  }
  return results;
}

const passed = (attempts) => attempts.some((e) => e === null);
const skipped = (attempts) => attempts.every((e) => e?.startsWith("skip:"));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "worknot-render-"));
let wrangler;
let browser;
let exitCode = 2;
try {
  await generateWorker(dir);
  wrangler = await startWrangler(dir);
  browser = await chromium.launch({ args: ["--disable-blink-features=AutomationControlled"] });
  const worker = await runChecks(browser, TARGETS.worker);
  const notion = await runChecks(browser, TARGETS.notion);
  let failed = false;
  for (const name of Object.keys(CHECKS)) {
    let status = "PASS";
    if (skipped(worker[name])) status = "SKIP";
    else if (!passed(worker[name])) status = passed(notion[name]) ? "FAIL" : "NOTION";
    if (status === "FAIL") failed = true;
    const detail = status === "PASS" ? "" : `  ${worker[name].at(-1)}`;
    console.log(`${status.padEnd(6)} ${name}${detail}`);
  }
  console.log("\nFAIL = broken through Worknot only. NOTION = also broken on notion.site.");
  exitCode = failed ? 1 : 0;
} catch (error) {
  console.error(`Render check could not run: ${error.message}`);
} finally {
  await browser?.close();
  wrangler?.kill();
  fs.rmSync(dir, { recursive: true, force: true });
}
process.exit(exitCode);
