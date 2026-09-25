# Worknot

Host your Notion Site on a custom domain with Cloudflare Workers. Maintained by [Classmethod Europe](https://classmethod.de/) - a Cloudflare and Notion partner.

## Features

**Core**
- Custom domain hosting for Notion Sites
- Pretty URLs with automatic slug mapping
- Global CDN delivery via Cloudflare edge network
- Full compatibility with latest Notion client (auto-adapts to Notion updates)

**SEO & Social**
- Page title, description, and per-page metadata
- Open Graph and Twitter Card optimization
- JSON-LD structured data for rich snippets
- Sitemap and RSS feed generation
- AI crawler attribution meta tags
- Custom favicon support
- Internationalization (hreflang) support
- Dynamic OG image generation

**Analytics & Marketing**
- Google Analytics 4 integration
- Facebook Pixel tracking
- Cache-Control headers for performance

**Customization**
- Google Fonts integration
- Custom CSS and JavaScript injection
- Custom HTML header injection
- Custom 404 error page
- URL redirect rules (301/302)
- Subdomain redirects

**Performance**
- Image optimization via Cloudflare Image Resizing
- Edge caching of rewritten Notion JS to keep Worker CPU time low
- Configurable caching for HTML, assets, and images

**Reliability**
- Automated Notion client-side change monitoring
- Daily checks for breaking changes in Notion's JS/API
- Auto-created GitHub Issues when changes detected

## How it works

Worknot generates a Cloudflare Worker script that acts as a reverse proxy between your custom domain and Notion. The Worker:

1. Intercepts requests to your custom domain
2. Fetches page content from Notion's servers
3. Rewrites domain references, SEO tags, and JavaScript bundles
4. Serves the content on your domain with full customization

Unlike simple redirects, Worknot preserves your custom domain in the browser URL bar and gives you full control over SEO, analytics, and branding.

## Usage

Visit the generator at **https://worknot.classmethod.live/**

1. Enter your domain and Notion page URL
2. Configure pretty links and advanced settings
3. Copy the generated Worker script
4. Deploy to Cloudflare Workers

### Workers usage

The Notion client loads several hundred JS chunks and API calls from your domain, so a first visit makes roughly 700 Worker requests. Repeat visits load the JS from the browser cache. The Workers Free plan (100,000 requests/day) suits small sites; use Workers Paid for sites with real traffic. Rewritten JS chunks are kept in Cloudflare's edge cache, so most requests use very little CPU time.

## Development

```bash
nvm use 20
npm install
npm start      # Development server
npm run build  # Production build
```

## Notion Change Monitoring

Worknot includes automated monitoring for Notion client-side changes that could break the proxy. A daily GitHub Actions workflow checks:

- Notion client version updates
- Domain validation logic changes in JS bundles
- API response structure changes (`getPublicPageData`)
- New authentication/redirect patterns

When changes are detected, an issue is automatically created. See `scripts/notion-monitor.sh` for details.

The same workflow runs a rendering check (`npm run check:render`, see `scripts/render-check.mjs`). It generates a worker for a public [test page](https://succinct-scar-f20.notion.site/3e6558d7de1781bb89a9fb6adc4012d6), runs it with `wrangler dev`, and loads the page in Chromium. It checks database views, images, PDF and file blocks, Mermaid, anchor links, database items and browser history. Every check also runs against notion.site, and only failures that happen through Worknot alone are reported. To run it locally, run `npx playwright install chromium` first.

## License

MIT
