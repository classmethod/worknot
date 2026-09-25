export interface ImageOptions {
  imageResizeType?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageQuality?: number;
  imageFormat?: string;
  imageFit?: string;
  imageBlur?: number;
  imageAnim?: boolean;
  imageMetadata?: string;
}

export interface PageAlternate {
  locale: string;
  slug: string;
  url?: string;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  ogImage?: string;
  alternates?: PageAlternate[];
}

export interface StructuredDataOptions {
  enabled: boolean;
  schemaType: "WebPage" | "Article" | "Organization";
  organizationName?: string;
  logoUrl?: string;
}

export interface BrandingOptions {
  siteName?: string;
  brandReplacement?: string;
  twitterHandle?: string;
  faviconUrl?: string;
}

export interface SocialPreviewOptions {
  defaultImage?: string;
  imageWidth?: number;
  imageHeight?: number;
  twitterCardType?: "summary" | "summary_large_image";
  locale?: string;
}

export interface SeoOptions {
  aiAttribution?: string;
  robotsRules?: string;
}

export interface AnalyticsOptions {
  googleTagId?: string;
  facebookPixelId?: string;
}

export interface CachingOptions {
  enabled: boolean;
  htmlTtl?: number;
  staticAssetsTtl?: number;
  imageTtl?: number;
}

export interface CustomHtmlOptions {
  headerHtml?: string;
  headHtml?: string;
}

export interface Custom404Options {
  notionUrl?: string;
}

export interface SubdomainRedirect {
  subdomain: string;
  redirectUrl: string;
}

export interface RedirectRule {
  from: string;
  to: string;
  permanent: boolean;
}

export interface RssOptions {
  enabled: boolean;
  title?: string;
  description?: string;
  language?: string;
}

export interface I18nOptions {
  enabled: boolean;
  defaultLocale: string;
}

export interface OgImageGenerationOptions {
  enabled: boolean;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontUrl?: string;
}

// Covers Latin and Japanese; pinned so the rendered images stay stable
export const DEFAULT_OG_FONT_URL =
  "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@Sans2.004/Sans/SubsetOTF/JP/NotoSansJP-Bold.otf";

export interface CodeData {
  myDomain: string;
  notionUrl: string;
  slugs: [string, string][];
  pageTitle: string;
  pageDescription: string;
  googleFont: string;
  customScript: string;
  customCss: string;
  optionImage: ImageOptions;
  pageMetadata: Record<string, PageMetadata>;
  structuredData: StructuredDataOptions;
  branding: BrandingOptions;
  socialPreview: SocialPreviewOptions;
  seo: SeoOptions;
  analytics: AnalyticsOptions;
  caching: CachingOptions;
  customHtml: CustomHtmlOptions;
  custom404: Custom404Options;
  subdomainRedirects: SubdomainRedirect[];
  redirectRules: RedirectRule[];
  rss: RssOptions;
  i18n: I18nOptions;
  ogImageGeneration: OgImageGenerationOptions;
}

function getId(url: string): string {
  try {
    const link = new URL(url);
    // A database item opened as a peek carries its own page ID in ?p=
    const peek = link.searchParams.get("p");
    if (peek && /^[0-9a-f]{32}$/.test(peek)) return peek;
    const id = link.pathname.replace(/\/+$/, "").slice(-32);
    if (id.match(/[0-9a-f]{32}/)) return id;
    return "";
  } catch {
    return "";
  }
}

// Percent-encode a path the way it arrives in request.url (e.g. non-ASCII).
function encodePath(path: string): string {
  try {
    return new URL(path, "https://example.com").pathname;
  } catch {
    return path;
  }
}

// Serialize user input as a JS string literal.
function str(value: string | undefined): string {
  return JSON.stringify(value || "");
}

// Serialize multi-line user input as a JS template literal, keeping it readable.
function tpl(value: string | undefined): string {
  const escaped = (value || "")
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
  return "`" + escaped + "`";
}

// Short content hash, used to version the worker's edge cache.
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export default function code(data: CodeData): string {
  const {
    myDomain,
    notionUrl,
    slugs,
    pageTitle,
    pageDescription,
    googleFont,
    customScript,
    customCss,
    optionImage,
    pageMetadata,
    structuredData,
    branding,
    socialPreview,
    seo,
    analytics,
    caching,
    customHtml,
    custom404,
    subdomainRedirects,
    redirectRules,
    rss,
    i18n,
    ogImageGeneration,
  } = data;
  let url = myDomain.trim().toLowerCase().replace("https://", "").replace("http://", "");
  if (url.slice(-1) === "/") url = url.slice(0, url.length - 1);

  const script = `  /* CONFIGURATION STARTS HERE */

  /* Step 1: enter your domain name like something.example.com */
  const MY_DOMAIN = ${str(url)};

  /*
   * Step 2: enter your URL slug to page ID mapping
   * The key on the left is the slug (without the slash)
   * The value on the right is the Notion page ID
   */
  const SLUG_TO_PAGE = {
    '': ${str(getId(notionUrl))},
${slugs
  .map(([pageUrl, notionPageUrl]) => {
    const id = getId(notionPageUrl);
    if (!id || !pageUrl) return "";
    return `    ${str(pageUrl)}: ${str(id)},\n`;
  })
  .join("")}  };

  /* Step 3: enter your page title and description for SEO purposes */
  const PAGE_TITLE = ${str(pageTitle)};
  const PAGE_DESCRIPTION = ${str(pageDescription)};

  /*
   * Step 3.1: enter per-page metadata for better SEO (optional)
   * Each key is a slug, each value contains title, description, and ogImage
   */
  const PAGE_METADATA = ${JSON.stringify(pageMetadata || {}, null, 4).replace(/\n/g, "\n  ")};

  /*
   * Step 3.2: structured data configuration for rich search results (optional)
   * Enable to add JSON-LD schema markup to your pages
   */
  const STRUCTURED_DATA_ENABLED = ${structuredData?.enabled || false};
  const SCHEMA_TYPE = ${str(structuredData?.schemaType || "WebPage")};
  const ORGANIZATION_NAME = ${str(structuredData?.organizationName)};
  const LOGO_URL = ${str(structuredData?.logoUrl)};

  /*
   * Step 3.3: branding configuration (optional)
   * Replace Notion branding with your own and add social media handles
   */
  const SITE_NAME = ${str(branding?.siteName)};
  const BRAND_REPLACEMENT = ${str(branding?.brandReplacement)};
  const TWITTER_HANDLE = ${str(branding?.twitterHandle)};
  const FAVICON_URL = ${str(branding?.faviconUrl)};

  /*
   * Step 3.3.1: social preview configuration (optional)
   * Enhance Open Graph and Twitter Card meta tags for better link previews
   */
  const DEFAULT_OG_IMAGE = ${str(socialPreview?.defaultImage)};
  const OG_IMAGE_WIDTH = ${socialPreview?.imageWidth || 1200};
  const OG_IMAGE_HEIGHT = ${socialPreview?.imageHeight || 630};
  const TWITTER_CARD_TYPE = ${str(socialPreview?.twitterCardType || "summary_large_image")};
  const OG_LOCALE = ${str(socialPreview?.locale)};

  /*
   * Step 3.4: SEO configuration (optional)
   * AI attribution for proper citation in AI-generated content
   * robots.txt rules (the sitemap line is added automatically)
   */
  const AI_ATTRIBUTION = ${str(seo?.aiAttribution)};
  const ROBOTS_RULES = ${tpl(seo?.robotsRules?.trim())};

  /*
   * Step 3.5: analytics configuration (optional)
   * Add your Google Analytics 4 Measurement ID and/or Facebook Pixel ID for built-in tracking
   */
  const GOOGLE_TAG_ID = ${str(analytics?.googleTagId?.trim().toUpperCase())};
  const FACEBOOK_PIXEL_ID = ${str(analytics?.facebookPixelId?.trim())};

  /*
   * Step 3.5.1: caching configuration (optional)
   * Add Cache-Control headers for better performance
   */
  const CACHING_ENABLED = ${caching?.enabled || false};
  const HTML_TTL = ${caching?.htmlTtl || 60};
  const STATIC_ASSETS_TTL = ${caching?.staticAssetsTtl || 86400};
  const IMAGE_TTL = ${caching?.imageTtl || 604800};

  /*
   * Step 3.6: custom HTML header injection (optional)
   * Add custom HTML to the top of the page body (e.g., navigation, announcements)
   */
  const CUSTOM_HEADER = ${tpl(customHtml?.headerHtml)};

  /*
   * Step 3.6.1: custom <head> HTML injection (optional)
   * Add HTML at the start of <head> (e.g., site verification meta tags, consent scripts)
   */
  const CUSTOM_HEAD = ${tpl(customHtml?.headHtml)};

  /*
   * Step 3.7: custom 404 page configuration (optional)
   * Specify a Notion page ID to display when a page is not found
   */
  const CUSTOM_404_PAGE_ID = ${str(custom404?.notionUrl ? getId(custom404.notionUrl) : "")};

  /*
   * Step 3.7: subdomain redirect configuration (optional)
   * Redirect subdomains (e.g., www) to the main domain or other URLs
   */
  const SUBDOMAIN_REDIRECTS = {
${
  subdomainRedirects
    ?.filter((r) => r.subdomain && r.redirectUrl)
    .map(
      (r) =>
        `    ${str(r.subdomain.trim().toLowerCase())}: ${str(r.redirectUrl.trim().replace(/\/+$/, ""))},\n`,
    )
    .join("") || ""
}  };

  /*
   * Step 3.8: custom redirect rules (optional)
   * Redirect specific paths to other paths or external URLs (301/302)
   * A trailing * matches any path with that prefix; a trailing * in "to" appends the rest
   */
  const REDIRECT_RULES = [
${
  redirectRules
    ?.filter((r) => r.from && r.to)
    .map(
      (r) =>
        `    { from: ${str(encodePath(r.from.trim()))}, to: ${str(r.to.trim())}, permanent: ${!!r.permanent} },\n`,
    )
    .join("") || ""
}  ];

  /*
   * Step 3.9: RSS feed configuration (optional)
   * Generate an RSS 2.0 feed at /rss.xml for blog-style sites
   */
  const RSS_ENABLED = ${rss?.enabled || false};
  const RSS_TITLE = ${str(rss?.title)};
  const RSS_DESCRIPTION = ${str(rss?.description)};
  const RSS_LANGUAGE = ${str(rss?.language || "en-us")};

  /*
   * Step 3.10: Internationalization (i18n) configuration (optional)
   * Add hreflang tags for multilingual SEO
   */
  const I18N_ENABLED = ${i18n?.enabled || false};
  const DEFAULT_LOCALE = ${str(i18n?.defaultLocale || "en")};

  /*
   * Step 3.11: Dynamic OG Image Generation (optional)
   * Auto-generate Open Graph images from page titles
   * Add an Images binding named IMAGES to this Worker to serve PNG images,
   * which X, Facebook and LinkedIn require. Without it, SVG is served.
   */
  const OG_IMAGE_GENERATION_ENABLED = ${ogImageGeneration?.enabled || false};
  const OG_IMAGE_BG_COLOR = ${str(ogImageGeneration?.backgroundColor || "#1a1a2e")};
  const OG_IMAGE_TEXT_COLOR = ${str(ogImageGeneration?.textColor || "#ffffff")};
  const OG_IMAGE_FONT_SIZE = ${ogImageGeneration?.fontSize || 64};
  const OG_IMAGE_FONT_URL = ${str(ogImageGeneration?.fontUrl?.trim() || DEFAULT_OG_FONT_URL)};

  /* Step 4: enter a Google Font name, you can choose from https://fonts.google.com */
  const GOOGLE_FONT = ${str(googleFont.trim())};

  /* Step 5: enter any custom scripts and styles you'd like */
  const CUSTOM_SCRIPT = ${tpl(customScript)};
  const CUSTOM_CSS = ${tpl(customCss)};

  /*
   * Step 6: enter your preference of image optimization
   * Set to 'resize' to enable Cloudflare Image Resizing
   * Requires Image Resizing to be enabled in Cloudflare dashboard
   * See: https://developers.cloudflare.com/images/transform-images/transform-via-workers/
   */
  const IMAGE_OPTIMIZATION = ${str(optionImage.imageResizeType)};
  // If you choose 'resize' above, configure the options below
  const IMAGE_RESIZE_OPTIONS = {
    width: ${optionImage.imageWidth ? Math.trunc(optionImage.imageWidth) : "undefined"},
    height: ${optionImage.imageHeight ? Math.trunc(optionImage.imageHeight) : "undefined"},
    quality: ${optionImage.imageQuality ? Math.trunc(optionImage.imageQuality) : "undefined"},
    format: ${str(optionImage.imageFormat || "auto")},
    fit: ${str(optionImage.imageFit || "scale-down")},
    blur: ${optionImage.imageBlur || "undefined"},
    anim: ${optionImage.imageAnim === false ? "false" : "true"},
    metadata: ${str(optionImage.imageMetadata || "none")}
  };

  /* CONFIGURATION ENDS HERE */

  // Changes whenever this script changes, so cached rewrites never outlive it
  const CACHE_VERSION = '__CACHE_VERSION__';

  const PAGE_TO_SLUG = {};
  const slugs = [];
  const pages = [];
  Object.keys(SLUG_TO_PAGE).forEach(slug => {
    const page = SLUG_TO_PAGE[slug];
    slugs.push(slug);
    pages.push(page);
    PAGE_TO_SLUG[page] = slug;
  });

  // Map a request path to its slug, or null. Non-ASCII slugs arrive percent-encoded.
  function pathToSlug(pathname) {
    const path = pathname.slice(1);
    try {
      const decoded = decodeURIComponent(path);
      if (Object.hasOwn(SLUG_TO_PAGE, decoded)) return decoded;
    } catch (e) {}
    return Object.hasOwn(SLUG_TO_PAGE, path) ? path : null;
  }

  export default {
    async fetch(request, env, ctx) {
      return fetchAndApply(request, env, ctx);
    }
  };

  // Workers don't negotiate format 'auto' themselves, so pick it from the Accept header
  function negotiateImageFormat(request) {
    const accept = request.headers.get('Accept') || '';
    if (accept.includes('image/avif')) return 'avif';
    if (accept.includes('image/webp')) return 'webp';
    return '';
  }

  function rewriteImageOptions(request) {
    let options = {cf:{}};
    if (IMAGE_OPTIMIZATION === 'resize') {
      // Build image options, excluding undefined values
      const imageOpts = {};
      if (IMAGE_RESIZE_OPTIONS.width !== undefined) imageOpts.width = IMAGE_RESIZE_OPTIONS.width;
      if (IMAGE_RESIZE_OPTIONS.height !== undefined) imageOpts.height = IMAGE_RESIZE_OPTIONS.height;
      if (IMAGE_RESIZE_OPTIONS.quality !== undefined) imageOpts.quality = IMAGE_RESIZE_OPTIONS.quality;
      const format = IMAGE_RESIZE_OPTIONS.format === 'auto' ? negotiateImageFormat(request) : IMAGE_RESIZE_OPTIONS.format;
      if (format) imageOpts.format = format;
      if (IMAGE_RESIZE_OPTIONS.fit && IMAGE_RESIZE_OPTIONS.fit !== '') imageOpts.fit = IMAGE_RESIZE_OPTIONS.fit;
      if (IMAGE_RESIZE_OPTIONS.blur !== undefined) imageOpts.blur = IMAGE_RESIZE_OPTIONS.blur;
      if (IMAGE_RESIZE_OPTIONS.anim !== undefined) imageOpts.anim = IMAGE_RESIZE_OPTIONS.anim;
      if (IMAGE_RESIZE_OPTIONS.metadata && IMAGE_RESIZE_OPTIONS.metadata !== '') imageOpts.metadata = IMAGE_RESIZE_OPTIONS.metadata;
      options.cf.image = imageOpts;
    }
    return options;
  }

  // Apply Cache-Control headers based on content type (Issue #33)
  function applyCacheHeaders(response, url, contentType) {
    if (!CACHING_ENABLED) return response;

    const newResponse = new Response(response.body, response);
    const pathname = url.pathname;

    // Static assets (JS, CSS, fonts)
    if (pathname.match(/\\.(js|css|woff2?|ttf|eot)$/)) {
      newResponse.headers.set('Cache-Control', \`public, max-age=\${STATIC_ASSETS_TTL}, immutable\`);
    }
    // Images
    else if (pathname.startsWith('/image') || pathname.match(/\\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/)) {
      newResponse.headers.set('Cache-Control', \`public, max-age=\${IMAGE_TTL}\`);
    }
    // HTML pages
    else if (!contentType || contentType.includes('text/html')) {
      newResponse.headers.set('Cache-Control', \`public, max-age=\${HTML_TTL}, stale-while-revalidate=60\`);
    }

    return newResponse;
  }

  function matchRedirectRule(rule, pathname) {
    if (!rule.from.endsWith('*')) return pathname === rule.from ? rule.to : null;
    const prefix = rule.from.slice(0, -1);
    if (!pathname.startsWith(prefix)) return null;
    return rule.to.endsWith('*') ? rule.to.slice(0, -1) + pathname.slice(prefix.length) : rule.to;
  }

  // Notion's JS chunks are content-hashed and the same for every visitor, so keep
  // the rewritten copy in the edge cache instead of rewriting it on each request.
  // Only a handful of chunks contain Notion domains; the rest pass through as is.
  async function fetchJs(request, url, ctx) {
    const cache = caches.default;
    const cacheKey = new URL(request.url);
    cacheKey.searchParams.set('worknot', CACHE_VERSION);
    const cached = await cache.match(cacheKey.toString());
    if (cached) return cached;
    const upstream = await fetch(url.toString());
    let body = await upstream.text();
    if (body.includes('notion.site') || body.includes('www.notion.so')) body = rewriteJsBody(body);
    const response = new Response(body, upstream);
    response.headers.set('Content-Type', 'text/javascript');
    response.headers.delete('Set-Cookie');
    if (upstream.ok && isAssetCacheable(upstream)) {
      ctx.waitUntil(cache.put(cacheKey.toString(), response.clone()));
    }
    return response;
  }

  function isAssetCacheable(response) {
    const cacheControl = response.headers.get('Cache-Control') || '';
    return cacheControl.includes('immutable') || /max-age=[1-9]/.test(cacheControl);
  }

  function generateSitemap() {
    let sitemap = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    slugs.forEach(
      (slug) =>
        (sitemap +=
          '<url><loc>' + escapeXml('https://' + MY_DOMAIN + '/' + encodeURI(slug)) + '</loc></url>')
    );
    sitemap += '</urlset>';
    return sitemap;
  }

  function generateRssFeed() {
    const title = RSS_TITLE || MY_DOMAIN;
    const description = RSS_DESCRIPTION || \`RSS feed for \${MY_DOMAIN}\`;
    const buildDate = new Date().toUTCString();
    let rss = '<?xml version="1.0" encoding="UTF-8"?>';
    rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">';
    rss += '<channel>';
    rss += \`<title>\${escapeXml(title)}</title>\`;
    rss += \`<link>https://\${MY_DOMAIN}</link>\`;
    rss += \`<description>\${escapeXml(description)}</description>\`;
    rss += \`<language>\${RSS_LANGUAGE}</language>\`;
    rss += \`<lastBuildDate>\${buildDate}</lastBuildDate>\`;
    rss += \`<atom:link href="https://\${MY_DOMAIN}/rss.xml" rel="self" type="application/rss+xml"/>\`;
    slugs.forEach((slug) => {
      const pageId = SLUG_TO_PAGE[slug];
      const metadata = PAGE_METADATA[slug] || {};
      const itemTitle = metadata.title || PAGE_TITLE || slug || 'Home';
      const itemDescription = metadata.description || PAGE_DESCRIPTION || '';
      const itemUrl = escapeXml('https://' + MY_DOMAIN + (slug ? '/' + encodeURI(slug) : ''));
      rss += '<item>';
      rss += \`<title>\${escapeXml(itemTitle)}</title>\`;
      rss += \`<link>\${itemUrl}</link>\`;
      rss += \`<guid isPermaLink="true">\${itemUrl}</guid>\`;
      if (itemDescription) {
        rss += \`<description>\${escapeXml(itemDescription)}</description>\`;
      }
      rss += '</item>';
    });
    rss += '</channel>';
    rss += '</rss>';
    return rss;
  }

  function escapeXml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // The Images binding only takes #RRGGBB or #RRGGBBAA, so expand #RGB and #RGBA
  function sanitizeColor(color) {
    if (/^#[0-9a-fA-F]{3,4}$/.test(color)) return '#' + color.slice(1).replace(/./g, '$&$&');
    return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color) ? color : '#000000';
  }

  // Estimate how wide text renders; CJK and emoji take about a full em
  function textWidth(text, size) {
    return Array.from(text).reduce((width, char) => width + (/[\\u2e80-\\uffff]/.test(char) ? 1 : 0.65) * size, 0);
  }

  // Break text into lines that fit the OG image, ending with an ellipsis if cut
  function wrapText(text, size, maxLines) {
    const maxWidth = 1040;
    const lines = [];
    let line = '';
    for (const char of Array.from(text.trim())) {
      if (line && textWidth(line + char, size) > maxWidth) {
        const space = line.lastIndexOf(' ');
        const cut = space > 0 && char !== ' ' ? space : line.length;
        lines.push(line.slice(0, cut).trim());
        line = line.slice(cut).trimStart();
      }
      line += char;
    }
    lines.push(line.trim());
    const kept = lines.filter(Boolean);
    if (kept.length > maxLines) {
      const last = Array.from(kept[maxLines - 1]);
      while (last.length && textWidth(last.join('') + '\\u2026', size) > maxWidth) last.pop();
      kept.length = maxLines;
      kept[maxLines - 1] = last.join('') + '\\u2026';
    }
    return kept;
  }

  function crc32(bytes) {
    let crc = -1;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ -1) >>> 0;
  }

  function pngChunk(type, data) {
    const chunk = new Uint8Array(12 + data.length);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, data.length);
    chunk.set(new TextEncoder().encode(type), 4);
    chunk.set(data, 8);
    view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
    return chunk;
  }

  // One-color canvas (1-bit palette PNG) for the Images binding to draw text on
  async function solidPng(width, height, color) {
    const palette = new Uint8Array([1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)));
    const header = new Uint8Array(13);
    const view = new DataView(header.buffer);
    view.setUint32(0, width);
    view.setUint32(4, height);
    header.set([1, 3, 0, 0, 0], 8);
    // Each row is a filter byte followed by zero bits, i.e. palette entry 0
    const pixels = new Uint8Array(height * (1 + Math.ceil(width / 8)));
    const compressed = await new Response(new Blob([pixels]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer();
    return new Blob([
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      pngChunk('IHDR', header),
      pngChunk('PLTE', palette),
      pngChunk('IDAT', new Uint8Array(compressed)),
      pngChunk('IEND', new Uint8Array(0)),
    ]);
  }

  // The default font has no emoji glyphs, so drop them instead of drawing boxes
  const EMOJI = /\\p{Emoji_Presentation}|[\\u200d\\ufe0f\\u20e3]|[\\u{1F1E6}-\\u{1F1FF}]/gu;
  const stripEmoji = (text) => text.replace(EMOJI, '').replace(/\\s+/g, ' ');

  // X, Facebook and LinkedIn ignore SVG, so draw a PNG with the Images binding
  async function renderOgPng(env, title, siteName, bgColor, textColor, fontSize) {
    const font = { url: OG_IMAGE_FONT_URL };
    const lineHeight = Math.round(fontSize * 1.3);
    // Shrinks a line only if the width estimate was too low
    const fit = { width: 1040, fit: 'scale-down' };
    const text = (content, size) => env.IMAGES.text(content, { font, color: textColor, size }).transform(fit);
    const maxLines = Math.max(1, Math.min(3, Math.floor(440 / lineHeight)));
    const lines = wrapText(stripEmoji(title), fontSize, maxLines);
    let top = Math.max(40, Math.round(290 - (lines.length * lineHeight) / 2));
    const canvas = await solidPng(1200, 630, bgColor);
    let image = env.IMAGES.input(canvas.stream());
    for (const line of lines) {
      image = image.draw(text(line, fontSize), { top, left: 80 });
      top += lineHeight;
    }
    const siteLine = wrapText(stripEmoji(siteName), 32, 1)[0];
    if (siteLine) {
      image = image.draw(text(siteLine, 32), { bottom: 60, left: 80, opacity: 0.7 });
    }
    return (await image.output({ format: 'image/png' })).response({
      headers: { 'Cache-Control': 'public, max-age=604800' },
    });
  }

  async function generateOgImage(slug, env, ctx, request) {
    // Only pages this site links to; anything else would render and cache a new image
    if (!Object.hasOwn(SLUG_TO_PAGE, slug) && slug !== '404') {
      return new Response('Not found', { status: 404 });
    }
    const metadata = PAGE_METADATA[slug] || {};
    const title = metadata.title || PAGE_TITLE || MY_DOMAIN;
    const siteName = SITE_NAME || MY_DOMAIN;
    const bgColor = sanitizeColor(OG_IMAGE_BG_COLOR);
    const textColor = sanitizeColor(OG_IMAGE_TEXT_COLOR);
    const fontSize = Math.max(12, Math.min(200, parseInt(OG_IMAGE_FONT_SIZE) || 64));
    let maxAge = 604800;

    if (env.IMAGES && OG_IMAGE_FONT_URL) {
      const cache = caches.default;
      const cacheKey = new URL('/og-image/' + encodeURIComponent(slug) + '?worknot=' + CACHE_VERSION, request.url).toString();
      try {
        const cached = await cache.match(cacheKey);
        if (cached) return cached;
        const png = await renderOgPng(env, title, siteName, bgColor, textColor, fontSize);
        ctx.waitUntil(cache.put(cacheKey, png.clone()));
        return png;
      } catch (error) {
        console.error(JSON.stringify({ message: 'OG image PNG rendering failed, serving SVG', error: String(error) }));
        // Retry the PNG soon instead of pinning the fallback for a week
        maxAge = 300;
      }
    }

    // Truncate before escaping so an entity like &amp; is never cut in half
    const chars = Array.from(title);
    const escapedTitle = escapeHtml(chars.length > 40 ? chars.slice(0, 40).join('') + '...' : title);
    const escapedSiteName = escapeHtml(siteName);

    const svg = \`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="\${bgColor}"/>
      <text x="100" y="280" font-size="\${fontSize}" fill="\${textColor}" font-family="system-ui, -apple-system, sans-serif" font-weight="bold">
        \${escapedTitle}
      </text>
      <text x="100" y="550" font-size="32" fill="\${textColor}" font-family="system-ui, -apple-system, sans-serif" opacity="0.7">
        \${escapedSiteName}
      </text>
    </svg>\`;

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=' + maxAge,
      },
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  function handleOptions(request) {
    if (request.headers.get('Origin') !== null &&
      request.headers.get('Access-Control-Request-Method') !== null &&
      request.headers.get('Access-Control-Request-Headers') !== null) {
      // Handle CORS pre-flight request.
      return new Response(null, {
        headers: corsHeaders
      });
    } else {
      // Handle standard OPTIONS request.
      return new Response(null, {
        headers: {
          'Allow': 'GET, HEAD, POST, PUT, OPTIONS',
        }
      });
    }
  }

  const NOTION_SITE_DOMAIN = (() => {
    try {
      return new URL(${str(notionUrl)}).hostname;
    } catch {
      return 'www.notion.so';
    }
  })();

  function rewriteDomainInBody(body) {
    return body
      .replace(/[a-z0-9-]+\\.notion\\.site/g, MY_DOMAIN)
      .replace(/www\\.notion\\.so/g, MY_DOMAIN);
  }

  // Compute parent domain for publicDomainName rewrite
  // e.g., "sensitive-information.classmethod.live" → "classmethod.live"
  // This allows Notion's client to extract the subdomain as the space domain
  const PARENT_DOMAIN = MY_DOMAIN.split('.').slice(1).join('.');

  // The custom subdomain that Notion's client extracts from the hostname
  // e.g., "sensitive-information" from "sensitive-information.classmethod.live"
  const CUSTOM_SPACE_DOMAIN = MY_DOMAIN.split('.')[0];

  // The original Notion space domain from the Notion site URL
  // e.g., "succinct-scar-f20" from "succinct-scar-f20.notion.site"
  const NOTION_SPACE_DOMAIN = NOTION_SITE_DOMAIN.split('.')[0];

  function rewriteJsBody(body) {
    return rewriteDomainInBody(body)
      .replace(/"notion\\.site"/g, '"' + PARENT_DOMAIN + '"');
  }

  // API bodies carry page content, so only rewrite links to this site:
  // its notion.site domain and notion.so links to page IDs (internal page links).
  function rewriteApiBody(body) {
    return body
      .replaceAll(NOTION_SITE_DOMAIN, MY_DOMAIN)
      .replace(/https?:\\/\\/www\\.notion\\.so\\/(?=(?:[\\w-]+\\/)?[\\w%-]*[0-9a-f]{32})/g, 'https://' + MY_DOMAIN + '/');
  }

  // Swap the space domain only in the fields that hold it, never in page content.
  const SPACE_DOMAIN_KEYS = ['spaceDomain', 'domain', 'domain_name'];
  function swapSpaceDomain(value, from, to, key) {
    if (Array.isArray(value)) {
      return value.map((item) => swapSpaceDomain(item, from, to, key));
    }
    if (value && typeof value === 'object') {
      for (const k of Object.keys(value)) {
        const fieldKey = key === 'publicDomains' && k === 'name' ? 'domain' : k;
        value[k] = swapSpaceDomain(value[k], from, to, fieldKey);
      }
      return value;
    }
    return value === from && SPACE_DOMAIN_KEYS.includes(key) ? to : value;
  }

  function swapSpaceDomainInJson(body, from, to) {
    if (from === to || !body.includes('"' + from + '"')) return body;
    try {
      return JSON.stringify(swapSpaceDomain(JSON.parse(body), from, to, ''));
    } catch (e) {
      return body;
    }
  }

  const PAGE_FETCH_HEADERS = {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9'
  };

  // Forward Notion routing headers (e.g. x-notion-cell for fanout requests).
  // Without them Notion keeps answering with fanoutData and pages render as 404.
  function buildApiHeaders(request) {
    const headers = {
      'content-type': 'application/json;charset=UTF-8',
      'user-agent': PAGE_FETCH_HEADERS['user-agent']
    };
    for (const [key, value] of request.headers) {
      if (key.startsWith('x-notion-') || key.startsWith('notion-')) headers[key] = value;
    }
    return headers;
  }

  // Notion sets notion_check_cookie_consent (whether the visitor must consent
  // to tracking) for its notion.site domain, which browsers reject here.
  // Without it the client assumes consent and loads marketing trackers.
  function rescopeConsentCookie(response) {
    const cookies = response.headers.getSetCookie();
    if (!cookies.some((cookie) => cookie.startsWith('notion_check_cookie_consent='))) return response;
    const rescoped = new Response(response.body, response);
    rescoped.headers.delete('Set-Cookie');
    for (const cookie of cookies) {
      rescoped.headers.append('Set-Cookie', cookie.startsWith('notion_check_cookie_consent=')
        ? cookie.replace(/;\\s*Domain=[^;]*/i, '')
        : cookie);
    }
    return rescoped;
  }

  async function fetchAndApply(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    try {
      return rescopeConsentCookie(await handleRequest(request, env, ctx));
    } catch (error) {
      console.error(JSON.stringify({ message: 'request failed', path: new URL(request.url).pathname, error: String(error) }));
      return new Response(
        \`<!DOCTYPE html><html><head><title>Service Unavailable</title></head>
        <body style="font-family:system-ui;text-align:center;padding:60px 20px">
        <h1>502 Bad Gateway</h1>
        <p>The upstream server is temporarily unavailable. Please try again later.</p>
        </body></html>\`,
        { status: 502, headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
      );
    }
  }

  async function handleRequest(request, env, ctx) {
    let url = new URL(request.url);

    // Handle subdomain redirects (Issue #15)
    const hostname = url.hostname;
    const domainParts = MY_DOMAIN.split('.');
    const hostParts = hostname.split('.');
    // Check if the request is for a subdomain of the main domain
    if (hostParts.length > domainParts.length) {
      const subdomain = hostParts.slice(0, hostParts.length - domainParts.length).join('.');
      const mainDomainFromHost = hostParts.slice(hostParts.length - domainParts.length).join('.');
      if (mainDomainFromHost === MY_DOMAIN && Object.hasOwn(SUBDOMAIN_REDIRECTS, subdomain)) {
        const redirectBase = SUBDOMAIN_REDIRECTS[subdomain];
        const redirectUrl = redirectBase + url.pathname + url.search;
        return Response.redirect(redirectUrl, 301);
      }
    }

    // Handle custom redirect rules (Issue #32)
    for (const rule of REDIRECT_RULES) {
      const target = matchRedirectRule(rule, url.pathname);
      if (target !== null) {
        let redirectUrl = target.startsWith('http')
          ? target
          : 'https://' + MY_DOMAIN + target;
        if (url.search && !redirectUrl.includes('?')) redirectUrl += url.search;
        return Response.redirect(redirectUrl, rule.permanent ? 301 : 302);
      }
    }

    // Intercept Notion login redirect - redirect back to root
    if (url.pathname === '/login') {
      return Response.redirect('https://' + MY_DOMAIN + '/', 302);
    }

    // Use the original Notion site domain instead of www.notion.so
    url.hostname = NOTION_SITE_DOMAIN;
    if (url.pathname === '/robots.txt') {
      return new Response((ROBOTS_RULES || 'User-agent: *\\nAllow: /') + '\\n\\nSitemap: https://' + MY_DOMAIN + '/sitemap.xml\\n');
    }
    if (url.pathname === '/sitemap.xml') {
      let response = new Response(generateSitemap());
      response.headers.set('content-type', 'application/xml');
      return response;
    }
    if (url.pathname === '/rss.xml' && RSS_ENABLED) {
      let response = new Response(generateRssFeed());
      response.headers.set('content-type', 'application/rss+xml; charset=utf-8');
      return response;
    }
    // Handle dynamic OG image generation (Issue #36)
    if (url.pathname.startsWith('/og-image/') && OG_IMAGE_GENERATION_ENABLED) {
      let slug = url.pathname.replace('/og-image/', '');
      try {
        slug = decodeURIComponent(slug);
      } catch (e) {}
      return generateOgImage(slug, env, ctx, request);
    }
    // Pretty links have no trailing slash; keep links like /about/ working
    const trimmedPath = url.pathname.replace(/\\/+$/, '');
    if (trimmedPath && trimmedPath !== url.pathname && pathToSlug(trimmedPath) !== null) {
      return Response.redirect('https://' + MY_DOMAIN + trimmedPath + url.search, 301);
    }
    if (isUnknownPageNavigation(request, url.pathname)) {
      return notFoundResponse(url);
    }
    // The Notion client would load the page ID from the URL, so skip the custom 404 page
    if (await isForeignPageNavigation(request, url.pathname)) {
      return notFoundResponse(url, true);
    }
    let response;
    const matchedSlug = pathToSlug(url.pathname);
    const isAppJs = url.pathname.startsWith('/app') && url.pathname.endsWith('js');
    const isAssetJs = url.pathname.startsWith('/_assets/') && url.pathname.endsWith('.js');
    if (isAppJs || isAssetJs) {
      return applyCacheHeaders(await fetchJs(request, url, ctx), url, 'text/javascript');
    } else if (url.pathname.startsWith('/api/v3/getPublicPageData')) {
      // Rewrite request body: replace custom space domain with original Notion space domain
      let reqBody = swapSpaceDomainInJson(await request.text(), CUSTOM_SPACE_DOMAIN, NOTION_SPACE_DOMAIN);
      // Inject correct blockId if absent. The client omits blockId whenever the
      // browser URL doesn't contain a 32-hex page ID (root "/" and pretty slugs
      // like "/about"). Without this, all slug pages render the root page (#90).
      try {
        const reqJson = JSON.parse(reqBody);
        if (!reqJson.blockId) {
          let pageId = '';
          const referer = request.headers.get('Referer');
          if (referer) {
            try {
              const refPath = new URL(referer).pathname;
              const slug = pathToSlug(refPath);
              if (slug !== null) {
                pageId = SLUG_TO_PAGE[slug];
              } else {
                const match = refPath.match(/[0-9a-f]{32}/);
                // Any other document path was served as the custom 404 page
                pageId = match ? match[0] : CUSTOM_404_PAGE_ID;
              }
            } catch (e) {}
          }
          if (!pageId) pageId = SLUG_TO_PAGE[''] || '';
          if (pageId) {
            reqJson.blockId = pageId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
            reqBody = JSON.stringify(reqJson);
          }
        }
      } catch (e) {}
      // Proxy getPublicPageData and rewrite domain info
      response = await fetch(url.toString(), {
        body: reqBody,
        headers: buildApiHeaders(request),
        method: 'POST',
      });
      let body = await response.text();
      // Rewrite domain info to prevent redirect
      body = rewriteApiBody(body);
      // Also rewrite specific fields that cause redirects or interstitial pages
      try {
        const json = JSON.parse(body);
        if (json.spaceDomain) json.spaceDomain = CUSTOM_SPACE_DOMAIN;
        if (json.publicDomainName) json.publicDomainName = PARENT_DOMAIN;
        // Remove requireInterstitial to prevent "page not found" error
        delete json.requireInterstitial;
        // Set requestedOnExternalDomain to false to avoid external domain checks
        json.requestedOnExternalDomain = false;
        body = JSON.stringify(json);
      } catch (e) {
        // If JSON parsing fails, continue with string replacement
      }
      response = new Response(body, response);
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.delete('Content-Security-Policy');
      return response;
    } else if (url.pathname.startsWith('/api/')) {
      // Rewrite request body: replace custom space domain with original Notion space domain
      const reqBody = swapSpaceDomainInJson(await request.text(), CUSTOM_SPACE_DOMAIN, NOTION_SPACE_DOMAIN);
      response = await fetch(url.toString(), {
        body: reqBody,
        headers: buildApiHeaders(request),
        method: 'POST',
      });
      let body = await response.text();
      body = rewriteApiBody(body);
      // Rewrite Notion space domain back to custom domain in response
      body = swapSpaceDomainInJson(body, NOTION_SPACE_DOMAIN, CUSTOM_SPACE_DOMAIN);
      response = new Response(body, response);
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.delete('Content-Security-Policy');
      return response;
    } else if (IMAGE_OPTIMIZATION === 'resize' && /^\\/images?\\//.test(url.pathname)) {
      let response = await fetch(url, rewriteImageOptions(request));
      if (IMAGE_RESIZE_OPTIONS.format === 'auto') {
        response = new Response(response.body, response);
        response.headers.append('Vary', 'Accept');
      }
      return applyCacheHeaders(response, url, 'image');
    } else if (matchedSlug !== null) {
      const pageId = SLUG_TO_PAGE[matchedSlug];
      url.pathname = '/' + pageId;
      response = await fetch(url.toString(), {
        headers: PAGE_FETCH_HEADERS,
      });
      response = new Response(response.body, response);
      response.headers.delete('Content-Security-Policy');
      response.headers.delete('X-Content-Security-Policy');
      return appendJavascript(response, SLUG_TO_PAGE, matchedSlug, url);
    } else {
      response = await fetch(url.toString(), {
        headers: PAGE_FETCH_HEADERS,
      });
      // HTMLRewriter parses any body regardless of Content-Type, so stream
      // non-HTML responses (CSS, images, files) through untouched
      const contentType = response.headers.get('Content-Type') || '';
      if (!contentType.includes('text/html')) {
        return applyCacheHeaders(response, url, contentType);
      }
      response = new Response(response.body, response);
      response.headers.delete('Content-Security-Policy');
      response.headers.delete('X-Content-Security-Policy');
    }

    // Handle 404 with custom page if configured (Issue #12)
    if (response.status === 404 && CUSTOM_404_PAGE_ID !== '') {
      await response.body?.cancel();
      return notFoundResponse(url);
    }

    // Get current slug from page ID for canonical URL
    const pageIdMatch = url.pathname.match(/[0-9a-f]{32}/);
    const pageId = pageIdMatch ? pageIdMatch[0] : '';
    const currentSlug = PAGE_TO_SLUG[pageId] || '';

    return appendJavascript(response, SLUG_TO_PAGE, currentSlug, url);
  }

  class MetaRewriter {
    constructor(slug) {
      this.slug = slug;
      // Get page-specific metadata or use defaults (Issue #11)
      this.metadata = PAGE_METADATA[slug] || {};
    }
    element(element) {
      const pageTitle = this.metadata.title || PAGE_TITLE;
      const pageDescription = this.metadata.description || PAGE_DESCRIPTION;
      const ogImage = this.metadata.ogImage;

      // Remove noindex meta tag for SEO (Issue #8)
      if (element.getAttribute('name') === 'robots') {
        const content = element.getAttribute('content');
        if (content && content.includes('noindex')) {
          element.remove();
          return;
        }
      }
      // Set og:site_name - use SITE_NAME if configured, otherwise MY_DOMAIN (Issue #18)
      if (element.getAttribute('property') === 'og:site_name') {
        if (SITE_NAME !== '') {
          element.setAttribute('content', SITE_NAME);
        } else if (MY_DOMAIN !== '') {
          element.setAttribute('content', MY_DOMAIN);
        }
      }
      // Replace 'Notion' branding in meta content (Issue #18)
      if (BRAND_REPLACEMENT !== '') {
        const content = element.getAttribute('content');
        if (content && content.includes('Notion')) {
          element.setAttribute('content', content.replace(/Notion/g, BRAND_REPLACEMENT));
        }
      }
      if (pageTitle !== '') {
        if (element.getAttribute('property') === 'og:title'
          || element.getAttribute('name') === 'twitter:title') {
          element.setAttribute('content', pageTitle);
        }
        if (element.tagName === 'title') {
          element.setInnerContent(pageTitle);
        }
      }
      if (pageDescription !== '') {
        if (element.getAttribute('name') === 'description'
          || element.getAttribute('property') === 'og:description'
          || element.getAttribute('name') === 'twitter:description') {
          element.setAttribute('content', pageDescription);
        }
      }
      // Set custom OG image if specified, fallback to default (Issue #11, #34)
      const effectiveOgImage = ogImage || DEFAULT_OG_IMAGE;
      if (effectiveOgImage && (element.getAttribute('property') === 'og:image'
        || element.getAttribute('name') === 'twitter:image')) {
        element.setAttribute('content', effectiveOgImage);
      }
      // Set canonical URL for og:url and twitter:url (Issue #9)
      if (element.getAttribute('property') === 'og:url'
        || element.getAttribute('name') === 'twitter:url') {
        const canonicalUrl = 'https://' + MY_DOMAIN + (this.slug ? '/' + this.slug : '');
        element.setAttribute('content', canonicalUrl);
      }
      if (element.getAttribute('name') === 'apple-itunes-app') {
        element.remove();
      }
    }
  }

  class LinkRewriter {
    element(element) {
      // Remove Notion's default favicon links when custom favicon is set (Issue #16)
      if (FAVICON_URL !== '') {
        const rel = element.getAttribute('rel');
        if (rel && (rel.includes('icon') || rel === 'apple-touch-icon')) {
          element.remove();
        }
      }
    }
  }

  class HeadRewriter {
    constructor(slug) {
      this.slug = slug;
      // Get page-specific metadata or use defaults (Issue #11)
      this.metadata = PAGE_METADATA[slug] || {};
    }
    element(element) {
      // Add custom <head> HTML first so it runs before Notion's scripts (Issue #147)
      if (CUSTOM_HEAD !== '') {
        element.prepend(CUSTOM_HEAD, { html: true });
      }
      // Add canonical URL and robots meta tag for SEO (Issue #8 & #9)
      const canonicalUrl = 'https://' + MY_DOMAIN + (this.slug ? '/' + this.slug : '');
      element.append(\`<link rel="canonical" href="\${escapeHtml(canonicalUrl)}">\`, { html: true });
      element.append(\`<meta name="robots" content="index, follow">\`, { html: true });

      // Add custom favicon if configured (Issue #16)
      if (FAVICON_URL !== '') {
        element.append(\`<link rel="icon" href="\${escapeHtml(FAVICON_URL)}" type="image/x-icon">\`, { html: true });
        element.append(\`<link rel="shortcut icon" href="\${escapeHtml(FAVICON_URL)}" type="image/x-icon">\`, { html: true });
        element.append(\`<link rel="apple-touch-icon" href="\${escapeHtml(FAVICON_URL)}">\`, { html: true });
      }

      // Add Google Analytics 4 if configured (Issue #14)
      if (GOOGLE_TAG_ID !== '') {
        element.append(\`<script async src="https://www.googletagmanager.com/gtag/js?id=\${GOOGLE_TAG_ID}"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '\${GOOGLE_TAG_ID}');
        </script>\`, { html: true });
      }

      // Add Facebook Pixel if configured (Issue #31)
      if (FACEBOOK_PIXEL_ID !== '') {
        element.append(\`<script>
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '\${FACEBOOK_PIXEL_ID}');
          fbq('track', 'PageView');
        </script>
        <noscript><img height="1" width="1" style="display:none"
          src="https://www.facebook.com/tr?id=\${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1"
        /></noscript>\`, { html: true });
      }

      // Add Twitter/X meta tags for social cards (Issue #19)
      if (TWITTER_HANDLE !== '') {
        element.append(\`<meta name="twitter:site" content="\${escapeHtml(TWITTER_HANDLE)}">\`, { html: true });
        element.append(\`<meta name="twitter:creator" content="\${escapeHtml(TWITTER_HANDLE)}">\`, { html: true });
      }

      // Add enhanced Open Graph and Twitter Card tags (Issue #34)
      element.append(\`<meta property="og:type" content="website">\`, { html: true });
      element.append(\`<meta name="twitter:card" content="\${TWITTER_CARD_TYPE}">\`, { html: true });

      // Add OG image dimensions if image is set
      const effectiveOgImage = this.metadata.ogImage || DEFAULT_OG_IMAGE;
      if (effectiveOgImage) {
        element.append(\`<meta property="og:image:width" content="\${OG_IMAGE_WIDTH}">\`, { html: true });
        element.append(\`<meta property="og:image:height" content="\${OG_IMAGE_HEIGHT}">\`, { html: true });
      }

      // Add locale if configured
      if (OG_LOCALE !== '') {
        element.append(\`<meta property="og:locale" content="\${escapeHtml(OG_LOCALE)}">\`, { html: true });
      }

      // Add auto-generated OG image if no custom image is set (Issue #36)
      if (!effectiveOgImage && OG_IMAGE_GENERATION_ENABLED) {
        const generatedUrl = \`https://\${MY_DOMAIN}/og-image/\${this.slug}\`;
        element.append(\`<meta property="og:image" content="\${escapeHtml(generatedUrl)}">\`, { html: true });
        element.append(\`<meta property="og:image:width" content="1200">\`, { html: true });
        element.append(\`<meta property="og:image:height" content="630">\`, { html: true });
        element.append(\`<meta name="twitter:image" content="\${escapeHtml(generatedUrl)}">\`, { html: true });
      }

      // Add hreflang tags for multilingual SEO (Issue #35)
      if (I18N_ENABLED) {
        // Self-referencing hreflang for current page
        element.append(\`<link rel="alternate" hreflang="\${escapeHtml(DEFAULT_LOCALE)}" href="\${escapeHtml(canonicalUrl)}">\`, { html: true });

        // Add alternate language versions from page metadata
        const pageAlternates = this.metadata.alternates || [];
        for (const alt of pageAlternates) {
          if (!alt.locale || !(alt.url || alt.slug)) continue;
          // "Slug or URL": use a full URL as is and resolve a slug on this domain
          const href = alt.url || (/^https?:\\/\\//.test(alt.slug)
            ? alt.slug
            : \`https://\${MY_DOMAIN}/\${alt.slug.replace(/^\\/+/, '')}\`);
          element.append(\`<link rel="alternate" hreflang="\${escapeHtml(alt.locale)}" href="\${escapeHtml(href)}">\`, { html: true });
        }

        // x-default for language/region selector pages
        element.append(\`<link rel="alternate" hreflang="x-default" href="\${escapeHtml(canonicalUrl)}">\`, { html: true });
      }

      // Add AI crawler attribution meta tags (Issue #13)
      if (AI_ATTRIBUTION !== '') {
        element.append(\`<meta name="ai:source_url" content="\${escapeHtml(canonicalUrl)}">\`, { html: true });
        element.append(\`<meta name="ai:source_attribution" content="\${escapeHtml(AI_ATTRIBUTION)}">\`, { html: true });
      }

      // Add JSON-LD structured data for rich search results (Issue #10)
      if (STRUCTURED_DATA_ENABLED) {
        const pageTitle = this.metadata.title || PAGE_TITLE;
        const pageDescription = this.metadata.description || PAGE_DESCRIPTION;
        const structuredData = {
          "@context": "https://schema.org",
          "@type": SCHEMA_TYPE,
          "name": pageTitle,
          "description": pageDescription,
          "url": canonicalUrl
        };
        // Add publisher info for Article schema type
        if (SCHEMA_TYPE === 'Article' || SCHEMA_TYPE === 'WebPage') {
          structuredData.publisher = {
            "@type": "Organization",
            "name": ORGANIZATION_NAME || MY_DOMAIN,
            "url": \`https://\${MY_DOMAIN}\`
          };
          if (LOGO_URL) {
            structuredData.publisher.logo = {
              "@type": "ImageObject",
              "url": LOGO_URL
            };
          }
        }
        // Add Organization-specific fields
        if (SCHEMA_TYPE === 'Organization') {
          structuredData.name = ORGANIZATION_NAME || MY_DOMAIN;
          if (LOGO_URL) {
            structuredData.logo = LOGO_URL;
          }
        }
        element.append(\`<script type="application/ld+json">\${JSON.stringify(structuredData).replace(/</g, '\\\\u003c')}</script>\`, { html: true });
      }

      if (GOOGLE_FONT !== '') {
        element.append(\`<link href="https://fonts.googleapis.com/css?family=\${GOOGLE_FONT.replace(/ /g, '+')}:Regular,Bold,Italic&display=swap" rel="stylesheet">
        <style>* { font-family: "\${GOOGLE_FONT}" !important; }</style>\`, {
          html: true
        });
      }
      element.append(\`<style>
      div.notion-topbar > div > div:nth-child(3) { display: none !important; }
      div.notion-topbar > div > div:nth-child(4) { display: none !important; }
      div.notion-topbar > div > div:nth-child(5) { display: none !important; }
      div.notion-topbar > div > div:nth-child(6) { display: none !important; }
      div.notion-topbar-mobile > div:nth-child(3) { display: none !important; }
      div.notion-topbar-mobile > div:nth-child(4) { display: none !important; }
      div.notion-topbar > div > div:nth-child(1n).toggle-mode { display: block !important; }
      div.notion-topbar-mobile > div:nth-child(1n).toggle-mode { display: block !important; }
      </style>\`, {
        html: true
      })
    }
  }

  // Titles and descriptions the client script keeps after Notion rewrites them
  const CLIENT_META = JSON.stringify({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    brand: SITE_NAME || BRAND_REPLACEMENT,
    pages: PAGE_METADATA,
  }).replace(/</g, '\\\\u003c');

  class BodyRewriter {
    constructor(SLUG_TO_PAGE, notFound) {
      this.SLUG_TO_PAGE = SLUG_TO_PAGE;
      this.notFound = notFound;
    }
    element(element) {
      // Add custom header HTML at the top of body if configured (Issue #20)
      if (CUSTOM_HEADER !== '') {
        element.prepend(CUSTOM_HEADER, { html: true });
      }
      element.append(\`<div style="display:none">Powered by <a href="http://worknot.classmethod.cf">Worknot</a></div>
      <script>
      if (window.CONFIG) window.CONFIG.domainBaseUrl = 'https://\${MY_DOMAIN}';
      const SLUG_TO_PAGE = \${JSON.stringify(this.SLUG_TO_PAGE).replace(/</g, '\\\\u003c')};
      // Keep the requested URL when the custom 404 page is shown
      const NOT_FOUND_PATH = \${this.notFound} ? location.pathname : null;
      const PAGE_TO_SLUG = {};
      const slugs = [];
      const pages = [];
      const el = document.createElement('div');
      let redirected = false;
      Object.keys(SLUG_TO_PAGE).forEach(slug => {
        const page = SLUG_TO_PAGE[slug];
        slugs.push(slug);
        pages.push(page);
        PAGE_TO_SLUG[page] = slug;
      });
      function getPage() {
        const match = location.pathname.match(/[0-9a-f]{32}/);
        return match ? match[0] : '';
      }
      function getSlug() {
        try {
          return decodeURIComponent(location.pathname.slice(1));
        } catch (e) {
          return location.pathname.slice(1);
        }
      }
      function updateSlug() {
        const slug = PAGE_TO_SLUG[getPage()];
        if (slug != null) {
          history.replaceState(history.state, '', '/' + slug);
        }
      }
      function onDark() {
        el.innerHTML = '<div title="Change to Light Mode" style="margin-left: auto; margin-right: 14px; min-width: 0px;"><div role="button" tabindex="0" style="user-select: none; transition: background 120ms ease-in 0s; cursor: pointer; border-radius: 44px;"><div style="display: flex; flex-shrink: 0; height: 14px; width: 26px; border-radius: 44px; padding: 2px; box-sizing: content-box; background: rgb(46, 170, 220); transition: background 200ms ease 0s, box-shadow 200ms ease 0s;"><div style="width: 14px; height: 14px; border-radius: 44px; background: white; transition: transform 200ms ease-out 0s, background 200ms ease-out 0s; transform: translateX(12px) translateY(0px);"></div></div></div></div>';
        document.body.classList.add('dark');
        window.__console?.environment?.ThemeStore?.setState({ mode: 'dark' });
      };
      function onLight() {
        el.innerHTML = '<div title="Change to Dark Mode" style="margin-left: auto; margin-right: 14px; min-width: 0px;"><div role="button" tabindex="0" style="user-select: none; transition: background 120ms ease-in 0s; cursor: pointer; border-radius: 44px;"><div style="display: flex; flex-shrink: 0; height: 14px; width: 26px; border-radius: 44px; padding: 2px; box-sizing: content-box; background: rgba(135, 131, 120, 0.3); transition: background 200ms ease 0s, box-shadow 200ms ease 0s;"><div style="width: 14px; height: 14px; border-radius: 44px; background: white; transition: transform 200ms ease-out 0s, background 200ms ease-out 0s; transform: translateX(0px) translateY(0px);"></div></div></div></div>';
        document.body.classList.remove('dark');
        window.__console?.environment?.ThemeStore?.setState({ mode: 'light' });
      }
      function toggle() {
        if (document.body.classList.contains('dark')) {
          onLight();
        } else {
          onDark();
        }
      }
      function addDarkModeButton(device) {
        const nav = device === 'web' ? document.querySelector('.notion-topbar').firstChild : document.querySelector('.notion-topbar-mobile');
        el.className = 'toggle-mode';
        el.addEventListener('click', toggle);
        nav.appendChild(el);
        onLight();
      }
      // Notion sets its own title and meta tags after load; keep the configured ones
      const META = \${CLIENT_META};
      function setContent(selector, value) {
        const tag = document.querySelector(selector);
        if (tag && value && tag.getAttribute('content') !== value) tag.setAttribute('content', value);
      }
      function applyMeta() {
        const slug = location.pathname === NOT_FOUND_PATH ? '404'
          : PAGE_TO_SLUG[getPage()] ?? (slugs.includes(getSlug()) ? getSlug() : '');
        const page = META.pages[slug] || {};
        let title = page.title || META.title;
        if (!title && META.brand && document.title.endsWith(' | Notion')) {
          title = document.title.slice(0, -' | Notion'.length) + ' | ' + META.brand;
        }
        if (title && document.title !== title) document.title = title;
        setContent('meta[property="og:title"]', title);
        setContent('meta[name="twitter:title"]', title);
        const description = page.description || META.description;
        setContent('meta[name="description"]', description);
        setContent('meta[property="og:description"]', description);
        setContent('meta[name="twitter:description"]', description);
      }
      new MutationObserver(applyMeta).observe(document.head, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['content'],
      });
      const observer = new MutationObserver(function() {
        if (redirected) return;
        const nav = document.querySelector('.notion-topbar');
        const mobileNav = document.querySelector('.notion-topbar-mobile');
        if (nav && nav.firstChild && nav.firstChild.firstChild
          || mobileNav && mobileNav.firstChild) {
          redirected = true;
          updateSlug();
          // Notion only exposes ThemeStore via __console in debug sessions
          if (window.__console?.environment?.ThemeStore) addDarkModeButton(nav ? 'web' : 'mobile');
          const onpopstate = window.onpopstate;
          window.onpopstate = function() {
            if (slugs.includes(getSlug())) {
              const page = SLUG_TO_PAGE[getSlug()];
              if (page) {
                history.replaceState(history.state, 'bypass', '/' + page);
              }
            }
            if (onpopstate) onpopstate.apply(this, [].slice.call(arguments));
            updateSlug();
          };
        }
      });
      observer.observe(document.querySelector('#notion-app'), {
        childList: true,
        subtree: true,
      });
      setTimeout(function() {
        if (!redirected) {
          redirected = true;
          updateSlug();
          const onpopstate = window.onpopstate;
          window.onpopstate = function() {
            if (slugs.includes(getSlug())) {
              const page = SLUG_TO_PAGE[getSlug()];
              if (page) {
                history.replaceState(history.state, 'bypass', '/' + page);
              }
            }
            if (onpopstate) onpopstate.apply(this, [].slice.call(arguments));
            updateSlug();
          };
        }
      }, 2000);
      const replaceState = window.history.replaceState;
      window.history.replaceState = function(state) {
        if (arguments[1] !== 'bypass' && (slugs.includes(getSlug()) || location.pathname === NOT_FOUND_PATH)) return;
        return replaceState.apply(window.history, arguments);
      };
      const pushState = window.history.pushState;
      window.history.pushState = function(state) {
        const dest = new URL(location.protocol + location.host + arguments[2]);
        const idMatch = dest.pathname.match(/[0-9a-f]{32}/);
        const id = idMatch ? idMatch[0] : '';
        if (id && pages.includes(id)) {
          arguments[2] = '/' + PAGE_TO_SLUG[id];
        }
        return pushState.apply(window.history, arguments);
      };
      const open = window.XMLHttpRequest.prototype.open;
      window.XMLHttpRequest.prototype.open = function() {
        arguments[1] = arguments[1].replace('\${MY_DOMAIN}', '\${NOTION_SITE_DOMAIN}');
        return open.apply(this, [].slice.call(arguments));
      };
    </script>\${CUSTOM_SCRIPT}<style>\${CUSTOM_CSS}\</style>\`, {
        html: true
      });
    }
  }

  // Notion answers 200 with its app shell for any path, so decide here whether a
  // page navigation points at a real page: the root, a slug, or a page ID.
  function isPageNavigation(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return false;
    const dest = request.headers.get('Sec-Fetch-Dest');
    return dest ? dest === 'document' : (request.headers.get('Accept') || '').includes('text/html');
  }

  // Paths opened directly in the browser that are not pages (images, files)
  const NON_PAGE_PATH = /^\\/(image|images|f|signed|api|_assets)\\//;

  function isUnknownPageNavigation(request, pathname) {
    if (!isPageNavigation(request) || NON_PAGE_PATH.test(pathname)) return false;
    if (/[0-9a-f]{32}/.test(pathname) || /\\.[a-z0-9]+$/i.test(pathname)) return false;
    return pathToSlug(pathname) === null;
  }

  // Any public Notion page renders when its ID is requested on this domain, so
  // check that unmapped page IDs belong to this site's workspace. Cached per isolate.
  const pageIsForeign = new Map();

  async function isForeignPageNavigation(request, pathname) {
    const match = pathname.match(/[0-9a-f]{32}/);
    if (!match || PAGE_TO_SLUG[match[0]] !== undefined || !NOTION_SITE_DOMAIN.endsWith('.notion.site')) return false;
    if (!isPageNavigation(request) || NON_PAGE_PATH.test(pathname)) return false;
    const pageId = match[0];
    if (pageIsForeign.has(pageId)) return pageIsForeign.get(pageId);
    try {
      const response = await fetch('https://' + NOTION_SITE_DOMAIN + '/api/v3/getPublicPageData', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': PAGE_FETCH_HEADERS['user-agent'] },
        body: JSON.stringify({
          type: 'block-space',
          name: 'page',
          blockId: pageId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5'),
          spaceDomain: NOTION_SPACE_DOMAIN,
          requestedOnPublicDomain: true,
        }),
      });
      if (!response.ok) {
        await response.body?.cancel();
        return false;
      }
      const data = await response.json();
      const foreign = !!data.spaceDomain && data.spaceDomain !== NOTION_SPACE_DOMAIN && data.publicDomainName !== NOTION_SPACE_DOMAIN;
      if (pageIsForeign.size > 1000) pageIsForeign.clear();
      pageIsForeign.set(pageId, foreign);
      return foreign;
    } catch (e) {
      // Serve the page this time, but don't cache a transient failure
      return false;
    }
  }

  async function notFoundResponse(url, plain) {
    if (plain || CUSTOM_404_PAGE_ID === '') {
      return new Response(
        \`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found</title></head>
        <body style="font-family:system-ui;text-align:center;padding:60px 20px">
        <h1>404</h1>
        <p>This page could not be found.</p>
        <p><a href="/">Go to the home page</a></p>
        </body></html>\`,
        { status: 404, headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
      );
    }
    const notFoundUrl = new URL(url);
    notFoundUrl.hostname = NOTION_SITE_DOMAIN;
    notFoundUrl.pathname = '/' + CUSTOM_404_PAGE_ID;
    const page = await fetch(notFoundUrl.toString(), {
      headers: PAGE_FETCH_HEADERS,
    });
    // Return custom 404 page content with 404 status
    const response = new Response(page.body, {
      status: 404,
      statusText: 'Not Found',
      headers: page.headers,
    });
    response.headers.delete('Content-Security-Policy');
    response.headers.delete('X-Content-Security-Policy');
    return appendJavascript(response, SLUG_TO_PAGE, '404', url);
  }

  async function appendJavascript(res, SLUG_TO_PAGE, slug, url) {
    const metaRewriter = new MetaRewriter(slug);
    const headRewriter = new HeadRewriter(slug);
    const linkRewriter = new LinkRewriter();
    const contentType = res.headers.get('content-type');
    let transformed = new HTMLRewriter()
      .on('title', metaRewriter)
      .on('meta', metaRewriter)
      .on('link', linkRewriter)
      .on('head', headRewriter)
      .on('body', new BodyRewriter(SLUG_TO_PAGE, res.status === 404))
      .transform(res);
    return applyCacheHeaders(transformed, url, contentType);
  }`;
  return script.replace("__CACHE_VERSION__", hash(script));
}
