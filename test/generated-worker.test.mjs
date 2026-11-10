import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { gzipSync } from 'node:zlib';
import { createServer } from 'vite';

const ROOT = '11111111111111111111111111111111';
const CHAPTER = '22222222222222222222222222222222';
const OTHER = '33333333333333333333333333333333';
const dashed = (id) => id.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
const CONFIG = {
  myDomain: 'notes.example.com',
  notionUrl: `https://source-workspace.notion.site/${ROOT}`,
  slugs: [['chapter', `https://source-workspace.notion.site/${OTHER}`]],
  pageTitle: '', pageDescription: '', googleFont: '', customScript: '', customCss: '',
  optionImage: {}, pageMetadata: {}, structuredData: { enabled: false, schemaType: 'WebPage' },
  branding: {}, socialPreview: {}, seo: {}, analytics: {}, caching: { enabled: false },
  customHtml: {}, custom404: {}, subdomainRedirects: [], redirectRules: [],
  rss: { enabled: false }, i18n: { enabled: false, defaultLocale: 'en' },
  ogImageGeneration: { enabled: false },
};
let generate;
let worker;
let isolates = 0;
// Each import is a separate module instance, like a new isolate
async function loadWorker(config = {}) {
  const source = `${generate({ ...CONFIG, ...config })}\n// isolate ${isolates++}`;
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
}

before(async () => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
  try {
    ({ default: generate } = await vite.ssrLoadModule('/src/code.ts'));
    worker = await loadWorker();
  } finally {
    await vite.close();
  }
});

// In-memory stand-in for caches.default, shared by every worker instance
function stubEdgeCache(t) {
  const store = new Map();
  globalThis.caches = {
    default: {
      match: async (key) => store.get(key)?.clone(),
      put: async (key, response) => { store.set(key, response); },
    },
  };
  t.after(() => { delete globalThis.caches; });
}

// Runs a request and waits for its ctx.waitUntil work, such as cache writes
async function run(instance, request) {
  const pending = [];
  const response = await instance.fetch(request, {}, { waitUntil: (promise) => pending.push(promise) });
  await Promise.all(pending);
  return response;
}

async function forward(t, body, referer, extraHeaders = {}, path = '/api/v3/getPublicPageData') {
  const upstream = t.mock.method(globalThis, 'fetch', async () => Response.json({ spaceDomain: 'source-workspace' }));
  const request = new Request('https://notes.example.com' + path, {
    method: 'POST',
    body: typeof body === 'string' || ArrayBuffer.isView(body) ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(referer ? { Referer: referer } : {}), ...extraHeaders },
  });
  const response = await worker.fetch(request, {}, { waitUntil() {} });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal(upstream.mock.calls.length, 1);
  const [url, init] = upstream.mock.calls[0].arguments;
  assert.equal(new URL(url).hostname, 'source-workspace.notion.site');
  return { body: init.body, headers: new Headers(init.headers) };
}

// Request shapes from the maintainer's current-client capture:
// https://github.com/classmethod/worknot/pull/176#pullrequestreview-5610620394
// These are protocol fixtures, not a new live mobile-browser reproduction.
test('mobile peek restores site context while preserving the explicit item blockId', async (t) => {
  const body = { blockId: dashed(CHAPTER), requestedOnPublicDomain: false };
  const forwarded = await forward(t, body, `https://notes.example.com/?p=${CHAPTER}&pm=s`);
  assert.deepEqual(JSON.parse(forwarded.body), {
    ...body, spaceDomain: 'source-workspace', requestedOnPublicDomain: true,
  });
});

for (const [slug, pageId] of [['', ROOT], ['chapter', OTHER]]) {
  test(`desktop peek keeps its ${slug || 'root'} container rather than promoting ?p=`, async (t) => {
    const body = {
      type: 'block-space', name: 'page', slug, spaceDomain: 'notes',
      peekViewBlockId: dashed(CHAPTER), peekMode: 's', requestedOnPublicDomain: true,
    };
    const forwarded = await forward(t, body, `https://notes.example.com/${slug}?p=${CHAPTER}&pm=s`);
    assert.deepEqual(JSON.parse(forwarded.body), {
      ...body, blockId: dashed(pageId), spaceDomain: 'source-workspace',
    });
  });
}

test('mobile item keeps its explicit blockId when the URL path identifies the container', async (t) => {
  const body = { blockId: dashed(CHAPTER), requestedOnPublicDomain: false };
  const forwarded = await forward(t, body, `https://notes.example.com/${ROOT}?p=${CHAPTER}`);
  assert.deepEqual(JSON.parse(forwarded.body), {
    ...body, spaceDomain: 'source-workspace', requestedOnPublicDomain: true,
  });
});

test('ordinary page requests retain their blockId and Notion routing headers', async (t) => {
  const body = {
    type: 'block-space', name: 'page', blockId: dashed(CHAPTER),
    spaceDomain: 'notes', requestedOnPublicDomain: true,
  };
  const forwarded = await forward(t, body, undefined, {
    'x-notion-cell': 'cell-test', 'notion-client-version': 'test-version',
  });
  assert.deepEqual(JSON.parse(forwarded.body), { ...body, spaceDomain: 'source-workspace' });
  assert.equal(forwarded.headers.get('x-notion-cell'), 'cell-test');
  assert.equal(forwarded.headers.get('notion-client-version'), 'test-version');
});

test('requests already containing the correct published-site context stay unchanged', async (t) => {
  const body = { blockId: dashed(CHAPTER), spaceDomain: 'source-workspace', requestedOnPublicDomain: true };
  const forwarded = await forward(t, body, `https://notes.example.com/${CHAPTER}`);
  assert.deepEqual(JSON.parse(forwarded.body), body);
});

test('compressed telemetry remains byte-for-byte intact after the upstream rebase', async (t) => {
  const bytes = gzipSync(Buffer.from('[]'));
  const forwarded = await forward(t, bytes, undefined, { 'Content-Encoding': 'gzip' }, '/api/v3/etClient');
  assert.deepEqual(Buffer.from(forwarded.body), bytes);
  assert.equal(forwarded.headers.get('content-encoding'), 'gzip');
});

test('malformed JSON passes through without fabricated site context', async (t) => {
  const forwarded = await forward(t, '{invalid', undefined);
  assert.equal(forwarded.body, '{invalid');
});

// Returns the user agent the worker sends to Notion for a page request
async function pageFetchUserAgent(t, headers) {
  globalThis.HTMLRewriter = class { on() { return this; } transform(response) { return response; } };
  t.after(() => { delete globalThis.HTMLRewriter; });
  const upstream = t.mock.method(globalThis, 'fetch', async () => new Response('<html></html>', {
    headers: { 'Content-Type': 'text/html' },
  }));
  await run(worker, new Request('https://notes.example.com/chapter', { headers }));
  return new Headers(upstream.mock.calls[0].arguments[1].headers).get('user-agent');
}

const WORKNOT_BOT = 'Mozilla/5.0 (compatible; WorknotBot/1.0; +https://worknot.classmethod.live/)';
const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

for (const [visitor, headers, expected] of [
  ['GPTBot', { 'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)' }, WORKNOT_BOT],
  ['ChatGPT-User', { 'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot' }, WORKNOT_BOT],
  ['Googlebot', { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }, WORKNOT_BOT],
  ['an agent asking for Markdown', { 'User-Agent': 'curl/8.7.1', Accept: 'text/markdown' }, WORKNOT_BOT],
  ['a browser', { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' }, CHROME],
  ['a CUBOT phone', { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36' }, CHROME],
]) {
  test(`pages for ${visitor} are fetched as ${expected === WORKNOT_BOT ? 'a crawler' : 'a browser'}`, async (t) => {
    assert.equal(await pageFetchUserAgent(t, headers), expected);
  });
}

test('cross-origin preflight requests get no CORS headers', async (t) => {
  const upstream = t.mock.method(globalThis, 'fetch', async () => new Response());
  const response = await run(worker, new Request('https://notes.example.com/api/v3/getPublicPageData', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://other.example',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  }));
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal(upstream.mock.calls.length, 0);
});

test('a query string does not bypass the JS chunk cache', async (t) => {
  stubEdgeCache(t);
  const upstream = t.mock.method(globalThis, 'fetch', async () => new Response('chunk', {
    headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
  }));
  for (const query of ['?a=1', '?b=2']) {
    const response = await run(worker, new Request(`https://notes.example.com/_assets/chunk-abc.js${query}`));
    assert.equal(await response.text(), 'chunk');
  }
  assert.equal(upstream.mock.calls.length, 1);
  assert.equal(upstream.mock.calls[0].arguments[0], 'https://source-workspace.notion.site/_assets/chunk-abc.js');
});

test('new isolates reuse the cached foreign page check', async (t) => {
  stubEdgeCache(t);
  const upstream = t.mock.method(globalThis, 'fetch', async () => Response.json({ spaceDomain: 'other-workspace' }));
  const foreignPage = '44444444444444444444444444444444';
  for (const instance of [worker, await loadWorker()]) {
    const response = await run(instance, new Request(`https://notes.example.com/${foreignPage}`, {
      headers: { 'Sec-Fetch-Dest': 'document' },
    }));
    assert.equal(response.status, 404);
  }
  assert.equal(upstream.mock.calls.length, 1);
});

test('a failed foreign page check is not cached', async (t) => {
  stubEdgeCache(t);
  const upstream = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }));
  const page = '55555555555555555555555555555555';
  for (const instance of [await loadWorker(), await loadWorker()]) {
    const response = await run(instance, new Request(`https://notes.example.com/${page}`, {
      headers: { 'Sec-Fetch-Dest': 'document' },
    }));
    // The page is served, so the upstream 503 passes through
    assert.equal(response.status, 503);
  }
  const checks = upstream.mock.calls.filter((call) => call.arguments[0].endsWith('/api/v3/getPublicPageData'));
  assert.equal(checks.length, 2);
});

async function robotsTxt(seo) {
  const response = await run(await loadWorker({ seo }), new Request('https://notes.example.com/robots.txt'));
  return response.text();
}

const SITEMAP = '\n\nSitemap: https://notes.example.com/sitemap.xml\n';

test('robots.txt is unchanged without Content Signals', async () => {
  assert.equal(await robotsTxt({}), `User-agent: *\nAllow: /${SITEMAP}`);
});

test('Content Signals keep a fixed order and skip unset or invalid values', async () => {
  const signals = { 'ai-train': 'no', 'ai-input': 'maybe', search: 'yes' };
  assert.equal(await robotsTxt({ contentSignals: signals }),
    `User-agent: *\nContent-Signal: search=yes, ai-train=no\nAllow: /${SITEMAP}`);
});

test('Content Signals join the existing group for all crawlers', async () => {
  const robotsRules = 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nUser-agent: Bingbot\nDisallow: /private';
  assert.equal(await robotsTxt({ robotsRules, contentSignals: { 'ai-train': 'no' } }),
    `User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nUser-agent: Bingbot\nContent-Signal: ai-train=no\nDisallow: /private${SITEMAP}`);
});

test('Content Signals add a group for all crawlers when the rules have none', async () => {
  const robotsRules = 'User-agent: GPTBot\nDisallow: /';
  assert.equal(await robotsTxt({ robotsRules, contentSignals: { 'ai-train': 'no' } }),
    `User-agent: *\nContent-Signal: ai-train=no\n\nUser-agent: GPTBot\nDisallow: /${SITEMAP}`);
});

// Requests a page and returns the HTMLRewriter handlers the worker registers for it
async function rewriteHandlers(t, path, config) {
  const handlers = {};
  globalThis.HTMLRewriter = class {
    on(selector, handler) { handlers[selector] = handler; return this; }
    transform(response) { return response; }
  };
  t.after(() => { delete globalThis.HTMLRewriter; });
  t.mock.method(globalThis, 'fetch', async () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }));
  await run(await loadWorker(config), new Request(`https://notes.example.com${path}`));
  return handlers;
}

// What the head and meta handlers produce: appended <head> HTML, og:url, and the <title> text if set
function rewrittenHead(handlers) {
  const head = { appended: [], append(html) { head.appended.push(html); }, prepend() {} };
  handlers.head.element(head);
  const attributes = { property: 'og:url' };
  handlers.meta.element({
    getAttribute: (name) => attributes[name] ?? null,
    setAttribute: (name, value) => { attributes[name] = value; },
  });
  const title = { tagName: 'title', text: null, getAttribute: () => null, setInnerContent: (text) => { title.text = text; } };
  handlers.title.element(title);
  return {
    canonical: head.appended.find((html) => html.startsWith('<link rel="canonical"'))?.match(/href="([^"]*)"/)[1],
    ogUrl: attributes.content,
    ogImage: head.appended.find((html) => html.startsWith('<meta property="og:image" '))?.match(/content="([^"]*)"/)[1],
    title: title.text,
  };
}

const HOME_METADATA = {
  pageMetadata: { '': { title: 'Home title' } },
  ogImageGeneration: { enabled: true },
};
const UNMAPPED = '44444444444444444444444444444444';

test('a page without a slug is canonical at its page ID, without home page metadata', async (t) => {
  const head = rewrittenHead(await rewriteHandlers(t, `/Some-Page-${UNMAPPED}`, HOME_METADATA));
  assert.deepEqual(head, {
    canonical: `https://notes.example.com/${UNMAPPED}`,
    ogUrl: `https://notes.example.com/${UNMAPPED}`,
    ogImage: undefined,
    title: null,
  });
});

test('a mapped page opened by page ID is canonical at its slug', async (t) => {
  const head = rewrittenHead(await rewriteHandlers(t, `/${OTHER}`, HOME_METADATA));
  assert.equal(head.canonical, 'https://notes.example.com/chapter');
  assert.equal(head.ogImage, 'https://notes.example.com/og-image/chapter');
});

test('the home page keeps its canonical URL and metadata', async (t) => {
  const head = rewrittenHead(await rewriteHandlers(t, '/', HOME_METADATA));
  assert.deepEqual(head, {
    canonical: 'https://notes.example.com',
    ogUrl: 'https://notes.example.com',
    ogImage: 'https://notes.example.com/og-image/',
    title: 'Home title',
  });
});

test('generated client keeps canonical metadata after Notion rewrites it on each route', async (t) => {
  const handlers = await rewriteHandlers(t, '/', HOME_METADATA);
  const appended = [];
  handlers.body.element({ append: (html) => appended.push(html) });
  const script = appended.join('').match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'worker should append its client script');

  function tag(attribute, value) {
    const attributes = { [attribute]: value };
    return {
      getAttribute: (name) => attributes[name] ?? null,
      setAttribute: (name, next) => { attributes[name] = next; },
    };
  }
  const tags = {
    canonical: [tag('href', 'https://notes.example.com'), tag('href', 'https://notes.example.com')],
    ogUrl: [tag('content', 'https://notes.example.com'), tag('content', 'https://notes.example.com')],
    twitterUrl: [tag('content', 'https://notes.example.com'), tag('content', 'https://notes.example.com')],
  };
  const selectors = new Map([
    ['link[rel="canonical"]', tags.canonical],
    ['meta[property="og:url"]', tags.ogUrl],
    ['meta[name="twitter:url"]', tags.twitterUrl],
  ]);
  const observers = [];
  class TestMutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target, options) { this.target = target; this.options = options; }
  }
  const location = { protocol: 'https:', host: 'notes.example.com', pathname: '/' };
  const history = {};
  const window = { history, XMLHttpRequest: { prototype: {} } };
  const document = {
    head: {},
    title: '',
    createElement: () => ({}),
    querySelector: () => null,
    querySelectorAll: (selector) => selectors.get(selector) || [],
  };

  runInNewContext(script, {
    window, document, location, history, MutationObserver: TestMutationObserver, URL,
    setTimeout: () => 0,
  });

  const headObserver = observers.find((observer) => observer.target === document.head);
  assert.ok(headObserver, 'client should observe document.head');
  assert.ok(headObserver.options.attributeFilter.includes('href'));

  function simulateNotionHeadRewrite() {
    for (const item of tags.canonical) item.setAttribute('href', '/Notion-Title-11111111111111111111111111111111');
    for (const item of tags.ogUrl) item.setAttribute('content', '/Notion-Title-11111111111111111111111111111111');
    for (const item of tags.twitterUrl) item.setAttribute('content', '/Notion-Title-11111111111111111111111111111111');
    headObserver.callback([]);
  }
  function expectCanonical(path) {
    const expected = 'https://notes.example.com' + path;
    for (const item of tags.canonical) assert.equal(item.getAttribute('href'), expected);
    for (const item of tags.ogUrl) assert.equal(item.getAttribute('content'), expected);
    for (const item of tags.twitterUrl) assert.equal(item.getAttribute('content'), expected);
  }

  for (const [pathname, canonical] of [
    ['/', ''],
    ['/chapter', '/chapter'],
    [`/Some-Page-${OTHER}`, '/chapter'],
    [`/Some-Page-${UNMAPPED}`, `/${UNMAPPED}`],
  ]) {
    location.pathname = pathname;
    simulateNotionHeadRewrite();
    expectCanonical(canonical);
  }
});
