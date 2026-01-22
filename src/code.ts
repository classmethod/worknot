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

export interface PageMetadata {
  title?: string;
  description?: string;
  ogImage?: string;
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

export interface SeoOptions {
  aiAttribution?: string;
}

export interface AnalyticsOptions {
  googleTagId?: string;
  facebookPixelId?: string;
}

export interface CustomHtmlOptions {
  headerHtml?: string;
}

export interface Custom404Options {
  notionUrl?: string;
}

export interface SubdomainRedirect {
  subdomain: string;
  redirectUrl: string;
}

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
  seo: SeoOptions;
  analytics: AnalyticsOptions;
  customHtml: CustomHtmlOptions;
  custom404: Custom404Options;
  subdomainRedirects: SubdomainRedirect[];
}

function getId(url: string): string {
  try {
    const id = new URL(url).pathname.slice(-32);
    if (id.match(/[0-9a-f]{32}/)) return id;
    return "";
  } catch {
    return "";
  }
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
    seo,
    analytics,
    customHtml,
    custom404,
    subdomainRedirects,
  } = data;
  let url = myDomain.replace("https://", "").replace("http://", "");
  if (url.slice(-1) === "/") url = url.slice(0, url.length - 1);

  return `  /* CONFIGURATION STARTS HERE */

  /* Step 1: enter your domain name like something.example.com */
  const MY_DOMAIN = '${url}';

  /*
   * Step 2: enter your URL slug to page ID mapping
   * The key on the left is the slug (without the slash)
   * The value on the right is the Notion page ID
   */
  const SLUG_TO_PAGE = {
    '': '${getId(notionUrl)}',
${slugs
  .map(([pageUrl, notionPageUrl]) => {
    const id = getId(notionPageUrl);
    if (!id || !pageUrl) return "";
    return `    '${pageUrl}': '${id}',\n`;
  })
  .join("")}  };

  /* Step 3: enter your page title and description for SEO purposes */
  const PAGE_TITLE = '${pageTitle || ""}';
  const PAGE_DESCRIPTION = '${pageDescription || ""}';

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
  const SCHEMA_TYPE = '${structuredData?.schemaType || "WebPage"}';
  const ORGANIZATION_NAME = '${structuredData?.organizationName || ""}';
  const LOGO_URL = '${structuredData?.logoUrl || ""}';

  /*
   * Step 3.3: branding configuration (optional)
   * Replace Notion branding with your own and add social media handles
   */
  const SITE_NAME = '${branding?.siteName || ""}';
  const BRAND_REPLACEMENT = '${branding?.brandReplacement || ""}';
  const TWITTER_HANDLE = '${branding?.twitterHandle || ""}';
  const FAVICON_URL = '${branding?.faviconUrl || ""}';

  /*
   * Step 3.4: SEO configuration (optional)
   * AI attribution for proper citation in AI-generated content
   */
  const AI_ATTRIBUTION = '${seo?.aiAttribution || ""}';

  /*
   * Step 3.5: analytics configuration (optional)
   * Add your Google Analytics 4 Measurement ID and/or Facebook Pixel ID for built-in tracking
   */
  const GOOGLE_TAG_ID = '${analytics?.googleTagId || ""}';
  const FACEBOOK_PIXEL_ID = '${analytics?.facebookPixelId || ""}';

  /*
   * Step 3.6: custom HTML header injection (optional)
   * Add custom HTML to the top of the page body (e.g., navigation, announcements)
   */
  const CUSTOM_HEADER = \`${customHtml?.headerHtml || ""}\`;

  /*
   * Step 3.7: custom 404 page configuration (optional)
   * Specify a Notion page ID to display when a page is not found
   */
  const CUSTOM_404_PAGE_ID = '${custom404?.notionUrl ? getId(custom404.notionUrl) : ""}';

  /*
   * Step 3.7: subdomain redirect configuration (optional)
   * Redirect subdomains (e.g., www) to the main domain or other URLs
   */
  const SUBDOMAIN_REDIRECTS = {
${
  subdomainRedirects
    ?.filter((r) => r.subdomain && r.redirectUrl)
    .map((r) => `    '${r.subdomain}': '${r.redirectUrl}',\n`)
    .join("") || ""
}  };

  /* Step 4: enter a Google Font name, you can choose from https://fonts.google.com */
  const GOOGLE_FONT = '${googleFont || ""}';

  /* Step 5: enter any custom scripts and styles you'd like */
  const CUSTOM_SCRIPT = \`${customScript || ""}\`;
  const CUSTOM_CSS = \`${customCss || ""}\`;

  /*
   * Step 6: enter your preference of image optimization
   * Set to 'resize' to enable Cloudflare Image Resizing
   * Requires Image Resizing to be enabled in Cloudflare dashboard
   * See: https://developers.cloudflare.com/images/transform-images/transform-via-workers/
   */
  const IMAGE_OPTIMIZATION = \`${optionImage.imageResizeType || ""}\`;
  // If you choose 'resize' above, configure the options below
  const IMAGE_RESIZE_OPTIONS = {
    width: ${optionImage.imageWidth ? Math.trunc(optionImage.imageWidth) : "undefined"},
    height: ${optionImage.imageHeight ? Math.trunc(optionImage.imageHeight) : "undefined"},
    quality: ${optionImage.imageQuality ? Math.trunc(optionImage.imageQuality) : "undefined"},
    format: '${optionImage.imageFormat || "auto"}',
    fit: '${optionImage.imageFit || "scale-down"}',
    blur: ${optionImage.imageBlur || "undefined"},
    anim: ${optionImage.imageAnim === false ? "false" : "true"},
    metadata: '${optionImage.imageMetadata || "none"}'
  };

  /* CONFIGURATION ENDS HERE */

  const PAGE_TO_SLUG = {};
  const slugs = [];
  const pages = [];
  Object.keys(SLUG_TO_PAGE).forEach(slug => {
    const page = SLUG_TO_PAGE[slug];
    slugs.push(slug);
    pages.push(page);
    PAGE_TO_SLUG[page] = slug;
  });

  addEventListener('fetch', event => {
    event.respondWith(fetchAndApply(event.request));
  });

  function rewriteImageOptions() {
    let options = {cf:{}};
    if (IMAGE_OPTIMIZATION === 'resize') {
      // Build image options, excluding undefined values
      const imageOpts = {};
      if (IMAGE_RESIZE_OPTIONS.width !== undefined) imageOpts.width = IMAGE_RESIZE_OPTIONS.width;
      if (IMAGE_RESIZE_OPTIONS.height !== undefined) imageOpts.height = IMAGE_RESIZE_OPTIONS.height;
      if (IMAGE_RESIZE_OPTIONS.quality !== undefined) imageOpts.quality = IMAGE_RESIZE_OPTIONS.quality;
      if (IMAGE_RESIZE_OPTIONS.format && IMAGE_RESIZE_OPTIONS.format !== '') imageOpts.format = IMAGE_RESIZE_OPTIONS.format;
      if (IMAGE_RESIZE_OPTIONS.fit && IMAGE_RESIZE_OPTIONS.fit !== '') imageOpts.fit = IMAGE_RESIZE_OPTIONS.fit;
      if (IMAGE_RESIZE_OPTIONS.blur !== undefined) imageOpts.blur = IMAGE_RESIZE_OPTIONS.blur;
      if (IMAGE_RESIZE_OPTIONS.anim !== undefined) imageOpts.anim = IMAGE_RESIZE_OPTIONS.anim;
      if (IMAGE_RESIZE_OPTIONS.metadata && IMAGE_RESIZE_OPTIONS.metadata !== '') imageOpts.metadata = IMAGE_RESIZE_OPTIONS.metadata;
      options.cf.image = imageOpts;
    }
    return options;
  }

  function generateSitemap() {
    let sitemap = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    slugs.forEach(
      (slug) =>
        (sitemap +=
          '<url><loc>https://' + MY_DOMAIN + '/' + slug + '</loc></url>')
    );
    sitemap += '</urlset>';
    return sitemap;
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

  // Extract Notion site domain from the original Notion URL
  const NOTION_SITE_DOMAIN = (() => {
    try {
      const notionHost = new URL('${notionUrl}').hostname;
      return notionHost;
    } catch {
      return 'www.notion.so';
    }
  })();

  // Rewrite domain references in API response body
  function rewriteDomainInBody(body) {
    // Replace *.notion.site domain with custom domain
    let result = body.replace(/[a-z0-9-]+\\.notion\\.site/g, MY_DOMAIN);
    // Also replace www.notion.so references
    result = result.replace(/www\\.notion\\.so/g, MY_DOMAIN);
    return result;
  }

  async function fetchAndApply(request) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    let url = new URL(request.url);

    // Handle subdomain redirects (Issue #15)
    const hostname = url.hostname;
    const domainParts = MY_DOMAIN.split('.');
    const hostParts = hostname.split('.');
    // Check if the request is for a subdomain of the main domain
    if (hostParts.length > domainParts.length) {
      const subdomain = hostParts.slice(0, hostParts.length - domainParts.length).join('.');
      const mainDomainFromHost = hostParts.slice(hostParts.length - domainParts.length).join('.');
      if (mainDomainFromHost === MY_DOMAIN && SUBDOMAIN_REDIRECTS[subdomain]) {
        const redirectBase = SUBDOMAIN_REDIRECTS[subdomain];
        const redirectUrl = redirectBase + url.pathname + url.search;
        return Response.redirect(redirectUrl, 301);
      }
    }

    // Use the original Notion site domain instead of www.notion.so
    url.hostname = NOTION_SITE_DOMAIN;
    if (url.pathname === '/robots.txt') {
      return new Response('Sitemap: https://' + MY_DOMAIN + '/sitemap.xml');
    }
    if (url.pathname === '/sitemap.xml') {
      let response = new Response(generateSitemap());
      response.headers.set('content-type', 'application/xml');
      return response;
    }
    let response;
    if (url.pathname.startsWith('/app') && url.pathname.endsWith('js')) {
      response = await fetch(url.toString());
      let body = await response.text();
      body = rewriteDomainInBody(body);
      response = new Response(body, response);
      response.headers.set('Content-Type', 'application/x-javascript');
      return response;
    } else if (url.pathname.startsWith('/_assets/') && url.pathname.endsWith('.js')) {
      // Handle Notion's new asset paths
      response = await fetch(url.toString());
      let body = await response.text();
      body = rewriteDomainInBody(body);
      response = new Response(body, response);
      response.headers.set('Content-Type', 'application/javascript');
      return response;
    } else if (url.pathname.startsWith('/api/v3/getPublicPageData')) {
      // Proxy getPublicPageData and rewrite domain info
      response = await fetch(url.toString(), {
        body: request.body,
        headers: {
          'content-type': 'application/json;charset=UTF-8',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        method: 'POST',
      });
      let body = await response.text();
      // Rewrite domain info to prevent redirect
      body = rewriteDomainInBody(body);
      // Also rewrite specific fields that cause redirects or interstitial pages
      try {
        const json = JSON.parse(body);
        if (json.spaceDomain) json.spaceDomain = MY_DOMAIN.split('.')[0];
        if (json.publicDomainName) json.publicDomainName = MY_DOMAIN;
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
    } else if (url.pathname.startsWith('/api/v3/syncRecordValuesMain') ||
               url.pathname.startsWith('/api/v3/syncRecordValuesSpaceInitial') ||
               url.pathname.startsWith('/api/v3/getPublicSpaceData')) {
      // Rewrite domain info in sync/space API responses to prevent redirect
      response = await fetch(url.toString(), {
        body: request.body,
        headers: {
          'content-type': 'application/json;charset=UTF-8',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        method: 'POST',
      });
      let body = await response.text();
      body = rewriteDomainInBody(body);
      response = new Response(body, response);
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.delete('Content-Security-Policy');
      return response;
    } else if ((url.pathname.startsWith('/api'))) {
      // Forward other API requests
      response = await fetch(url.toString(), {
        body: request.body,
        headers: {
          'content-type': 'application/json;charset=UTF-8',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        method: 'POST',
      });
      let body = await response.text();
      body = rewriteDomainInBody(body);
      response = new Response(body, response);
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.delete('Content-Security-Policy');
      return response;
    } else if (url.pathname.startsWith('/image') && IMAGE_OPTIMIZATION !== 'none') {
      const response = await fetch(url, rewriteImageOptions());
      return response;
    } else if (slugs.indexOf(url.pathname.slice(1)) > -1) {
      const pageId = SLUG_TO_PAGE[url.pathname.slice(1)];
       return Response.redirect('https://' + MY_DOMAIN + '/' + pageId, 302);
    } else {
      response = await fetch(url.toString(), {
        body: request.body,
        headers: request.headers,
        method: request.method,
      });
      response = new Response(response.body, response);
      response.headers.delete('Content-Security-Policy');
      response.headers.delete('X-Content-Security-Policy');
    }

    // Handle 404 with custom page if configured (Issue #12)
    if (response.status === 404 && CUSTOM_404_PAGE_ID !== '') {
      const notFoundUrl = new URL(url);
      notFoundUrl.pathname = '/' + CUSTOM_404_PAGE_ID;
      const notFoundResponse = await fetch(notFoundUrl.toString(), {
        headers: request.headers,
        method: 'GET',
      });
      // Return custom 404 page content with 404 status
      response = new Response(notFoundResponse.body, {
        status: 404,
        statusText: 'Not Found',
        headers: notFoundResponse.headers,
      });
      response.headers.delete('Content-Security-Policy');
      response.headers.delete('X-Content-Security-Policy');
      return appendJavascript(response, SLUG_TO_PAGE, '404');
    }

    // Get current slug from page ID for canonical URL
    const pageId = url.pathname.slice(-32);
    const currentSlug = PAGE_TO_SLUG[pageId] || '';

    return appendJavascript(response, SLUG_TO_PAGE, currentSlug);
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
      // Set custom OG image if specified (Issue #11)
      if (ogImage && (element.getAttribute('property') === 'og:image'
        || element.getAttribute('name') === 'twitter:image')) {
        element.setAttribute('content', ogImage);
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
      // Add canonical URL and robots meta tag for SEO (Issue #8 & #9)
      const canonicalUrl = 'https://' + MY_DOMAIN + (this.slug ? '/' + this.slug : '');
      element.append(\`<link rel="canonical" href="\${canonicalUrl}">\`, { html: true });
      element.append(\`<meta name="robots" content="index, follow">\`, { html: true });

      // Add custom favicon if configured (Issue #16)
      if (FAVICON_URL !== '') {
        element.append(\`<link rel="icon" href="\${FAVICON_URL}" type="image/x-icon">\`, { html: true });
        element.append(\`<link rel="shortcut icon" href="\${FAVICON_URL}" type="image/x-icon">\`, { html: true });
        element.append(\`<link rel="apple-touch-icon" href="\${FAVICON_URL}">\`, { html: true });
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
        element.append(\`<meta name="twitter:site" content="\${TWITTER_HANDLE}">\`, { html: true });
        element.append(\`<meta name="twitter:creator" content="\${TWITTER_HANDLE}">\`, { html: true });
      }

      // Add AI crawler attribution meta tags (Issue #13)
      if (AI_ATTRIBUTION !== '') {
        element.append(\`<meta name="ai:source_url" content="\${canonicalUrl}">\`, { html: true });
        element.append(\`<meta name="ai:source_attribution" content="\${AI_ATTRIBUTION}">\`, { html: true });
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
        element.append(\`<script type="application/ld+json">\${JSON.stringify(structuredData)}</script>\`, { html: true });
      }

      if (GOOGLE_FONT !== '') {
        element.append(\`<link href="https://fonts.googleapis.com/css?family=\${GOOGLE_FONT.replace(' ', '+')}:Regular,Bold,Italic&display=swap" rel="stylesheet">
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

  class BodyRewriter {
    constructor(SLUG_TO_PAGE) {
      this.SLUG_TO_PAGE = SLUG_TO_PAGE;
    }
    element(element) {
      // Add custom header HTML at the top of body if configured (Issue #20)
      if (CUSTOM_HEADER !== '') {
        element.prepend(CUSTOM_HEADER, { html: true });
      }
      element.append(\`<div style="display:none">Powered by <a href="http://worknot.classmethod.cf">Worknot</a></div>
      <script>
      window.CONFIG.domainBaseUrl = 'https://\${MY_DOMAIN}';
      const SLUG_TO_PAGE = \${JSON.stringify(this.SLUG_TO_PAGE)};
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
        return location.pathname.slice(-32);
      }
      function getSlug() {
        return location.pathname.slice(1);
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
        __console.environment.ThemeStore.setState({ mode: 'dark' });
      };
      function onLight() {
        el.innerHTML = '<div title="Change to Dark Mode" style="margin-left: auto; margin-right: 14px; min-width: 0px;"><div role="button" tabindex="0" style="user-select: none; transition: background 120ms ease-in 0s; cursor: pointer; border-radius: 44px;"><div style="display: flex; flex-shrink: 0; height: 14px; width: 26px; border-radius: 44px; padding: 2px; box-sizing: content-box; background: rgba(135, 131, 120, 0.3); transition: background 200ms ease 0s, box-shadow 200ms ease 0s;"><div style="width: 14px; height: 14px; border-radius: 44px; background: white; transition: transform 200ms ease-out 0s, background 200ms ease-out 0s; transform: translateX(0px) translateY(0px);"></div></div></div></div>';
        document.body.classList.remove('dark');
        __console.environment.ThemeStore.setState({ mode: 'light' });
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
      const observer = new MutationObserver(function() {
        if (redirected) return;
        const nav = document.querySelector('.notion-topbar');
        const mobileNav = document.querySelector('.notion-topbar-mobile');
        if (nav && nav.firstChild && nav.firstChild.firstChild
          || mobileNav && mobileNav.firstChild) {
          redirected = true;
          updateSlug();
          addDarkModeButton(nav ? 'web' : 'mobile');
          const onpopstate = window.onpopstate;
          window.onpopstate = function() {
            if (slugs.includes(getSlug())) {
              const page = SLUG_TO_PAGE[getSlug()];
              if (page) {
                history.replaceState(history.state, 'bypass', '/' + page);
              }
            }
            onpopstate.apply(this, [].slice.call(arguments));
            updateSlug();
          };
        }
      });
      observer.observe(document.querySelector('#notion-app'), {
        childList: true,
        subtree: true,
      });
      const replaceState = window.history.replaceState;
      window.history.replaceState = function(state) {
        if (arguments[1] !== 'bypass' && slugs.includes(getSlug())) return;
        return replaceState.apply(window.history, arguments);
      };
      const pushState = window.history.pushState;
      window.history.pushState = function(state) {
        const dest = new URL(location.protocol + location.host + arguments[2]);
        const id = dest.pathname.slice(-32);
        if (pages.includes(id)) {
          arguments[2] = '/' + PAGE_TO_SLUG[id];
        }
        return pushState.apply(window.history, arguments);
      };
      const open = window.XMLHttpRequest.prototype.open;
      window.XMLHttpRequest.prototype.open = function() {
        arguments[1] = arguments[1].replace('\${MY_DOMAIN}', 'www.notion.so');
        return open.apply(this, [].slice.call(arguments));
      };
    </script>\${CUSTOM_SCRIPT}<style>\${CUSTOM_CSS}\</style>\`, {
        html: true
      });
    }
  }

  async function appendJavascript(res, SLUG_TO_PAGE, slug) {
    const metaRewriter = new MetaRewriter(slug);
    const headRewriter = new HeadRewriter(slug);
    const linkRewriter = new LinkRewriter();
    return new HTMLRewriter()
      .on('title', metaRewriter)
      .on('meta', metaRewriter)
      .on('link', linkRewriter)
      .on('head', headRewriter)
      .on('body', new BodyRewriter(SLUG_TO_PAGE))
      .transform(res);
  }`;
}
