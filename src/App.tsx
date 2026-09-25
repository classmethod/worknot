import {
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  Button,
  Collapse,
  InputAdornment,
  TextField,
  Container,
  RadioGroup,
  Radio,
  Box,
  Alert,
  Stack,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormControlLabel,
  Typography,
  SelectChangeEvent,
  Paper,
  Chip,
  Link,
  Switch,
} from "@mui/material";
import {
  Language as LanguageIcon,
  Speed as SpeedIcon,
  Image as ImageIcon,
  Code as CodeIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Update as UpdateIcon,
  Verified as VerifiedIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import code, {
  DEFAULT_OG_FONT_URL,
  CodeData,
  ImageOptions,
  PageMetadata,
  PageAlternate,
  StructuredDataOptions,
  BrandingOptions,
  SocialPreviewOptions,
  SeoOptions,
  AnalyticsOptions,
  CachingOptions,
  CustomHtmlOptions,
  Custom404Options,
  SubdomainRedirect,
  RedirectRule,
  RssOptions,
  I18nOptions,
  OgImageGenerationOptions,
} from "./code";
import "./styles.css";

const DEFAULT_DOMAIN = "worknot.classmethod.cf";
const DEFAULT_NOTION_URL =
  "https://succinct-scar-f20.notion.site/Sample-Web-Site-148f2fc322e74473a91fb4d90836e3ce";

const DOMAIN_PATTERN =
  /^(https?:\/\/)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\/?$/;
const NOTION_ID_PATTERN = /[0-9a-f]{32}/;

function isValidDomain(domain: string): boolean {
  return DOMAIN_PATTERN.test(domain);
}

function isValidNotionUrl(url: string): boolean {
  if (!url) return true;
  try {
    const link = new URL(url);
    const host = link.hostname;
    const isNotionHost =
      host === "notion.so" ||
      host.endsWith(".notion.so") ||
      host.endsWith(".notion.site");
    const hasValidId = NOTION_ID_PATTERN.test(
      link.pathname.replace(/\/+$/, "").slice(-32),
    );
    return isNotionHost && hasValidId;
  } catch {
    return false;
  }
}

const SUBDOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/i;
const REDIRECT_FROM_PATTERN = /^\/[^\s*?#]*\*?$/;
const REDIRECT_TO_PATTERN = /^\/[^\s*]*\*?$/;
const GOOGLE_TAG_PATTERN = /^(G|GT|AW|DC)-[A-Z0-9]+$/i;
const PIXEL_ID_PATTERN = /^\d+$/;
const GOOGLE_FONT_PATTERN = /^[A-Za-z0-9 ]+$/;
const HEX_COLOR_PATTERN = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
// Paths the worker routes elsewhere before it looks up pretty links
const RESERVED_SLUG_PATTERN =
  /^(api|images?|og-image)\/|^_assets\/.*\.js$|^app.*js$|^(login|robots\.txt|sitemap\.xml|rss\.xml)$/;
// Characters and dot segments that can never match a request path
const UNREACHABLE_SLUG_PATTERN = /[?#]|(^|\/)\.\.?(\/|$)/;

function isHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function patternError(
  value: string | undefined,
  pattern: RegExp,
  message: string,
): string | undefined {
  const trimmed = (value || "").trim();
  return trimmed && !pattern.test(trimmed) ? message : undefined;
}

function normalizeSlug(slug: string): string {
  return slug.trim().replace(/^\/+|\/+$/g, "");
}

function slugRowErrors(row: SlugRow, duplicate: boolean) {
  if (!row.slug && !row.notionUrl) return {};
  const slug = normalizeSlug(row.slug);
  return {
    slug: !slug
      ? "Enter a pretty link"
      : UNREACHABLE_SLUG_PATTERN.test(slug)
        ? "Remove ?, # and . or .. path segments"
        : RESERVED_SLUG_PATTERN.test(slug)
          ? "This path is reserved by the worker"
          : duplicate
            ? "This pretty link is already used"
            : undefined,
    notionUrl:
      !row.notionUrl || !isValidNotionUrl(row.notionUrl)
        ? "Please enter a valid Notion Page URL"
        : undefined,
  };
}

function subdomainRedirectErrors(redirect: SubdomainRedirect, host: string) {
  if (!redirect.subdomain && !redirect.redirectUrl) return {};
  const subdomain = redirect.subdomain.trim().toLowerCase();
  const redirectUrl = redirect.redirectUrl.trim();
  return {
    subdomain:
      !SUBDOMAIN_PATTERN.test(subdomain) || subdomain.endsWith(host)
        ? "Enter only the subdomain, e.g. www"
        : undefined,
    redirectUrl: !isHttpUrl(redirectUrl)
      ? "Enter a full URL starting with https://"
      : new URL(redirectUrl).hostname === `${subdomain}.${host}`
        ? "This URL points back to the same subdomain and would loop"
        : undefined,
  };
}

// Mirrors matchRedirectRule in the generated worker, which compares encoded paths.
// The worker also redirects /slug/ to /slug, so that hop is followed too.
function redirectLoops(
  from: string,
  to: string,
  host: string,
  slugs: Set<string>,
): boolean {
  try {
    const target = new URL(to.replace(/\*$/, ""), `https://${host}`);
    if (target.hostname !== host) return false;
    const pattern = new URL(from, `https://${host}`).pathname;
    const matches = (path: string) =>
      pattern.endsWith("*")
        ? path.startsWith(pattern.slice(0, -1))
        : path === pattern;
    const trimmed = target.pathname.replace(/\/+$/, "");
    return (
      matches(target.pathname) ||
      (trimmed !== target.pathname &&
        slugs.has(decodeURIComponent(trimmed.slice(1))) &&
        matches(trimmed))
    );
  } catch {
    return false;
  }
}

function redirectRuleErrors(
  rule: RedirectRule,
  host: string,
  slugs: Set<string>,
) {
  if (!rule.from && !rule.to) return {};
  const fromPath = rule.from.trim();
  const toPath = rule.to.trim();
  const from = REDIRECT_FROM_PATTERN.test(fromPath)
    ? undefined
    : "Start with /, e.g. /old-page or /old/* (no ? or #)";
  let to: string | undefined;
  if (!REDIRECT_TO_PATTERN.test(toPath) && !isHttpUrl(toPath)) {
    to = "Use a path starting with / or a full https:// URL";
  } else if (toPath.endsWith("*") && !fromPath.endsWith("*")) {
    to = "A trailing * only works when From Path also ends with *";
  } else if (!from && redirectLoops(fromPath, toPath, host, slugs)) {
    to = "This target matches the rule again and would loop";
  }
  return { from, to };
}

interface SlugRow {
  id: number;
  slug: string;
  notionUrl: string;
  metadata: PageMetadata;
  expanded: boolean;
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        textAlign: "center",
        backgroundColor: "rgba(25, 118, 210, 0.04)",
        borderRadius: 3,
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        },
      }}
    >
      <Box sx={{ color: "primary.main", mb: 1.5 }}>{icon}</Box>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {description}
      </Typography>
    </Paper>
  );
}

export default function App() {
  const [slugRows, setSlugRows] = useState<SlugRow[]>([]);
  const nextRowId = useRef(0);
  const [myDomain, setMyDomain] = useState("");
  const [notionUrl, setNotionUrl] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  const [googleFont, setGoogleFont] = useState("");
  const [customScript, setCustomScript] = useState("");
  const [customCss, setCustomCss] = useState("");
  const [optional, setOptional] = useState(false);
  const [optionImage, setOptionImage] = useState<ImageOptions>({});
  const [optionalImageResize, setOptionalImageResize] = useState(false);
  const [copied, setCopied] = useState(false);
  const [structuredData, setStructuredData] = useState<StructuredDataOptions>({
    enabled: false,
    schemaType: "WebPage",
    organizationName: "",
    logoUrl: "",
  });
  const [branding, setBranding] = useState<BrandingOptions>({
    siteName: "",
    brandReplacement: "",
    twitterHandle: "",
    faviconUrl: "",
  });
  const [socialPreview, setSocialPreview] = useState<SocialPreviewOptions>({
    defaultImage: "",
    imageWidth: 1200,
    imageHeight: 630,
    twitterCardType: "summary_large_image",
    locale: "",
  });
  const [seo, setSeo] = useState<SeoOptions>({
    aiAttribution: "",
    robotsRules: "",
  });
  const [analytics, setAnalytics] = useState<AnalyticsOptions>({
    googleTagId: "",
    facebookPixelId: "",
  });
  const [caching, setCaching] = useState<CachingOptions>({
    enabled: false,
    htmlTtl: 60,
    staticAssetsTtl: 86400,
    imageTtl: 604800,
  });
  const [customHtml, setCustomHtml] = useState<CustomHtmlOptions>({
    headerHtml: "",
    headHtml: "",
  });
  const [custom404, setCustom404] = useState<Custom404Options>({
    notionUrl: "",
  });
  const [subdomainRedirects, setSubdomainRedirects] = useState<
    SubdomainRedirect[]
  >([]);
  const [redirectRules, setRedirectRules] = useState<RedirectRule[]>([]);
  const [rss, setRss] = useState<RssOptions>({
    enabled: false,
    title: "",
    description: "",
    language: "en-us",
  });
  const [i18n, setI18n] = useState<I18nOptions>({
    enabled: false,
    defaultLocale: "en",
  });
  const [ogImageGeneration, setOgImageGeneration] =
    useState<OgImageGenerationOptions>({
      enabled: false,
      backgroundColor: "#1a1a2e",
      textColor: "#ffffff",
      fontSize: 64,
      fontUrl: DEFAULT_OG_FONT_URL,
    });

  function createInputHandler<T>(
    setter: React.Dispatch<React.SetStateAction<T>>,
  ) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value as T);
      setCopied(false);
    };
  }

  const handleMyDomain = createInputHandler(setMyDomain);
  const handleNotionUrl = createInputHandler(setNotionUrl);
  const handlePageTitle = createInputHandler(setPageTitle);
  const handlePageDescription = createInputHandler(setPageDescription);
  const handleGoogleFont = createInputHandler(setGoogleFont);
  const handleCustomScript = createInputHandler(setCustomScript);
  const handleCustomCss = createInputHandler(setCustomCss);

  function addSlug(): void {
    setSlugRows([
      ...slugRows,
      {
        id: nextRowId.current++,
        slug: "",
        notionUrl: "",
        metadata: {},
        expanded: false,
      },
    ]);
    setCopied(false);
  }

  function deleteSlug(id: number): void {
    setSlugRows(slugRows.filter((row) => row.id !== id));
    setCopied(false);
  }

  // Metadata and panel state live on the row, so editing a slug never moves them
  function updateSlugRow(
    id: number,
    update: (row: SlugRow) => Partial<SlugRow>,
  ): void {
    setSlugRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...update(row) } : row)),
    );
  }

  function handleCustomURL(input: string, id: number): void {
    // The worker matches slugs without the leading slash
    updateSlugRow(id, () => ({ slug: input.replace(/^\/+/, "") }));
    setCopied(false);
  }

  function handleNotionPageURL(value: string, id: number): void {
    updateSlugRow(id, () => ({ notionUrl: value }));
    setCopied(false);
  }

  function handleOptional(): void {
    setOptional(!optional);
  }

  function handlePageMetadata(
    id: number,
    field: keyof PageMetadata,
    value: string,
  ): void {
    updateSlugRow(id, (row) => ({
      metadata: { ...row.metadata, [field]: value },
    }));
    setCopied(false);
  }

  function createFieldHandler<T>(
    setter: Dispatch<SetStateAction<T>>,
    current: T,
  ) {
    return <K extends keyof T>(field: K, value: T[K]) => {
      setter({ ...current, [field]: value });
      setCopied(false);
    };
  }

  const handleStructuredDataChange = createFieldHandler(
    setStructuredData,
    structuredData,
  );
  const handleBrandingChange = createFieldHandler(setBranding, branding);
  const handleSocialPreviewChange = createFieldHandler(
    setSocialPreview,
    socialPreview,
  );
  const handleSeoChange = createFieldHandler(setSeo, seo);
  const handleAnalyticsChange = createFieldHandler(setAnalytics, analytics);
  const handleCachingChange = createFieldHandler(setCaching, caching);
  const handleCustomHtmlChange = createFieldHandler(setCustomHtml, customHtml);
  const handleCustom404Change = createFieldHandler(setCustom404, custom404);
  const handleRssChange = createFieldHandler(setRss, rss);
  const handleI18nChange = createFieldHandler(setI18n, i18n);
  const handleOgImageGenerationChange = createFieldHandler(
    setOgImageGeneration,
    ogImageGeneration,
  );

  function updatePageAlternates(
    id: number,
    update: (alternates: PageAlternate[]) => PageAlternate[],
  ): void {
    updateSlugRow(id, (row) => ({
      metadata: {
        ...row.metadata,
        alternates: update(row.metadata.alternates || []),
      },
    }));
    setCopied(false);
  }

  function handlePageAlternate(
    id: number,
    index: number,
    field: keyof PageAlternate,
    value: string,
  ): void {
    updatePageAlternates(id, (alternates) =>
      alternates.map((alt, i) =>
        i === index ? { ...alt, [field]: value } : alt,
      ),
    );
  }

  function addPageAlternate(id: number): void {
    updatePageAlternates(id, (alternates) => [
      ...alternates,
      { locale: "", slug: "" },
    ]);
  }

  function deletePageAlternate(id: number, index: number): void {
    updatePageAlternates(id, (alternates) =>
      alternates.filter((_, i) => i !== index),
    );
  }

  function addSubdomainRedirect(): void {
    setSubdomainRedirects([
      ...subdomainRedirects,
      { subdomain: "", redirectUrl: "" },
    ]);
    setCopied(false);
  }

  function deleteSubdomainRedirect(index: number): void {
    setSubdomainRedirects(subdomainRedirects.filter((_, i) => i !== index));
    setCopied(false);
  }

  function handleSubdomainRedirectChange(
    index: number,
    field: keyof SubdomainRedirect,
    value: string,
  ): void {
    setSubdomainRedirects(
      subdomainRedirects.map((redirect, i) =>
        i === index ? { ...redirect, [field]: value } : redirect,
      ),
    );
    setCopied(false);
  }

  function addRedirectRule(): void {
    setRedirectRules([...redirectRules, { from: "", to: "", permanent: true }]);
    setCopied(false);
  }

  function deleteRedirectRule(index: number): void {
    setRedirectRules(redirectRules.filter((_, i) => i !== index));
    setCopied(false);
  }

  function handleRedirectRuleChange(
    index: number,
    field: keyof RedirectRule,
    value: string | boolean,
  ): void {
    setRedirectRules(
      redirectRules.map((rule, i) =>
        i === index ? { ...rule, [field]: value } : rule,
      ),
    );
    setCopied(false);
  }

  function clampValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  function handleImageOption(
    target: EventTarget & (HTMLInputElement | HTMLTextAreaElement),
  ): void {
    const name = target.name as keyof ImageOptions;
    let formValue: string | number | undefined = target.value;

    switch (name) {
      case "imageResizeType":
        setOptionalImageResize(target.value === "resize");
        break;
      case "imageQuality":
        // An empty field means "use the default", not the minimum
        formValue = formValue === "" ? undefined : clampValue(Number(formValue), 1, 100);
        break;
      case "imageBlur":
        formValue = formValue === "" ? undefined : clampValue(Number(formValue), 0, 250);
        break;
    }

    setOptionImage({ ...optionImage, [name]: formValue });
    setCopied(false);
  }

  function handleSelectChange(e: SelectChangeEvent<string>): void {
    const name = e.target.name as keyof ImageOptions;
    setOptionImage({ ...optionImage, [name]: e.target.value });
    setCopied(false);
  }

  const domain = myDomain || DEFAULT_DOMAIN;
  const url = notionUrl || DEFAULT_NOTION_URL;
  const myDomainHelperText = !isValidDomain(domain)
    ? "Please enter a valid domain"
    : undefined;
  const notionUrlHelperText = !isValidNotionUrl(notionUrl)
    ? "Please enter a valid Notion Page URL"
    : undefined;
  const domainHost = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  const slugCounts = new Map<string, number>();
  for (const row of slugRows) {
    const slug = normalizeSlug(row.slug);
    if (slug) slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1);
  }
  const slugErrors = slugRows.map((row) =>
    slugRowErrors(row, (slugCounts.get(normalizeSlug(row.slug)) || 0) > 1),
  );
  const subdomainErrors = subdomainRedirects.map((redirect) =>
    subdomainRedirectErrors(redirect, domainHost),
  );
  const redirectErrors = redirectRules.map((rule) =>
    redirectRuleErrors(rule, domainHost, new Set(slugCounts.keys())),
  );
  const googleFontError = patternError(
    googleFont,
    GOOGLE_FONT_PATTERN,
    "Enter a font family name, e.g. Open Sans",
  );
  const googleTagError = patternError(
    analytics.googleTagId,
    GOOGLE_TAG_PATTERN,
    "Enter only the ID, e.g. G-XXXXXXXXXX",
  );
  const pixelIdError = patternError(
    analytics.facebookPixelId,
    PIXEL_ID_PATTERN,
    "Enter only the numeric Pixel ID",
  );
  const ogColorError = (color: string | undefined) =>
    ogImageGeneration.enabled
      ? patternError(color, HEX_COLOR_PATTERN, "Use a hex color like #1a1a2e")
      : undefined;
  const ogBackgroundError = ogColorError(ogImageGeneration.backgroundColor);
  const ogTextColorError = ogColorError(ogImageGeneration.textColor);
  const ogFontUrlError =
    ogImageGeneration.enabled &&
    ogImageGeneration.fontUrl?.trim() &&
    !isHttpUrl(ogImageGeneration.fontUrl.trim())
      ? "Enter a full URL to a TTF, OTF, WOFF or WOFF2 file"
      : undefined;
  const custom404Error = isValidNotionUrl(custom404.notionUrl || "")
    ? undefined
    : "Please enter a valid Notion Page URL";

  const hasFieldError = (errors: Record<string, string | undefined>[]) =>
    errors.some((e) => Object.values(e).some(Boolean));
  const advancedError =
    hasFieldError(subdomainErrors) ||
    hasFieldError(redirectErrors) ||
    !!(
      googleFontError ||
      googleTagError ||
      pixelIdError ||
      custom404Error ||
      ogBackgroundError ||
      ogTextColorError ||
      ogFontUrlError
    );
  const noError =
    !myDomainHelperText &&
    !notionUrlHelperText &&
    !hasFieldError(slugErrors) &&
    !advancedError;

  const codeData: CodeData = {
    myDomain: domain,
    notionUrl: url,
    slugs: slugRows.map((row) => [normalizeSlug(row.slug), row.notionUrl]),
    pageTitle,
    pageDescription,
    googleFont,
    customScript,
    customCss,
    optionImage,
    pageMetadata: Object.fromEntries(
      slugRows
        .filter(
          (row) =>
            normalizeSlug(row.slug) && Object.keys(row.metadata).length > 0,
        )
        .map((row) => [normalizeSlug(row.slug), row.metadata]),
    ),
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
  };

  const script = noError ? code(codeData) : undefined;
  function copyToClipboard(): void {
    if (!script) return;
    navigator.clipboard.writeText(script).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#fafbfc" }}>
      {/* Hero Section */}
      <Box
        sx={{
          background:
            "linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)",
          color: "white",
          pt: { xs: 6, md: 10 },
          pb: { xs: 8, md: 12 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            background:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <Container
          maxWidth="md"
          sx={{ position: "relative", textAlign: "center" }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: "center", mb: 3 }}
          >
            <Chip
              label="Powered by Cloudflare Workers"
              sx={{
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "white",
                fontWeight: 500,
              }}
            />
            <Chip
              icon={
                <VerifiedIcon
                  sx={{ color: "white !important", fontSize: 16 }}
                />
              }
              label="Maintained by Classmethod"
              sx={{
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "white",
                fontWeight: 500,
              }}
            />
          </Stack>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              fontSize: { xs: "2.5rem", md: "3.5rem" },
            }}
          >
            Worknot
          </Typography>
          <Typography
            variant="h5"
            component="p"
            sx={{
              mb: 2,
              opacity: 0.95,
              fontWeight: 400,
              maxWidth: 700,
              mx: "auto",
              lineHeight: 1.6,
            }}
          >
            Host your Notion Site on a custom domain with Cloudflare Workers
          </Typography>
          <Typography
            variant="body1"
            component="p"
            sx={{
              mb: 4,
              opacity: 0.8,
              maxWidth: 600,
              mx: "auto",
              lineHeight: 1.6,
            }}
          >
            Full SEO control, custom branding, analytics, and automatic
            compatibility with the latest Notion updates
          </Typography>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="md" sx={{ mt: -6, position: "relative", zIndex: 1 }}>
        <Paper
          elevation={2}
          sx={{ p: { xs: 2, md: 4 }, borderRadius: 4, mb: 4 }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 2,
              mb: 4,
            }}
          >
            <FeatureCard
              icon={<LanguageIcon sx={{ fontSize: 40 }} />}
              title="Custom Domain"
              description="Host your Notion Site on your own domain with pretty URLs"
            />
            <FeatureCard
              icon={<UpdateIcon sx={{ fontSize: 40 }} />}
              title="Auto-Compatible"
              description="Adapts to Notion client updates with daily monitoring"
            />
            <FeatureCard
              icon={<SpeedIcon sx={{ fontSize: 40 }} />}
              title="SEO & Analytics"
              description="Open Graph, JSON-LD, sitemap, GA4, and Facebook Pixel"
            />
            <FeatureCard
              icon={<ImageIcon sx={{ fontSize: 40 }} />}
              title="Image Optimization"
              description="Resize, convert, and compress via Cloudflare CDN"
            />
            <FeatureCard
              icon={<CodeIcon sx={{ fontSize: 40 }} />}
              title="Full Customization"
              description="Custom CSS, JS, fonts, favicon, headers, and 404 pages"
            />
            <FeatureCard
              icon={<VerifiedIcon sx={{ fontSize: 40 }} />}
              title="Partner Maintained"
              description="By Classmethod, a Cloudflare and Notion partner"
            />
          </Box>
        </Paper>

        {/* Generator Section */}
        <Paper
          elevation={2}
          sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, mb: 6 }}
        >
          <Typography
            variant="h5"
            component="h2"
            gutterBottom
            sx={{ fontWeight: 600, mb: 3 }}
          >
            Generate Your Worker Script
          </Typography>

          <TextField
            fullWidth
            error={!!myDomainHelperText}
            helperText={myDomainHelperText}
            label="Your Domain"
            onChange={handleMyDomain}
            margin="normal"
            placeholder={DEFAULT_DOMAIN}
            value={myDomain}
            variant="outlined"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">https://</InputAdornment>
                ),
              },
            }}
          />
          <TextField
            fullWidth
            error={!!notionUrlHelperText}
            helperText={notionUrlHelperText}
            label={`Notion URL for ${domain}`}
            margin="normal"
            onChange={handleNotionUrl}
            placeholder={DEFAULT_NOTION_URL}
            value={notionUrl}
            variant="outlined"
          />

          {slugRows.map((row, index) => (
            <Paper
              key={row.id}
              elevation={0}
              sx={{
                p: 2,
                mt: 2,
                backgroundColor: "grey.50",
                borderRadius: 2,
              }}
            >
              <TextField
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">{`${domain}/`}</InputAdornment>
                    ),
                  },
                }}
                label="Pretty Link"
                margin="normal"
                placeholder="about"
                error={!!slugErrors[index].slug}
                helperText={slugErrors[index].slug}
                onChange={(e) => handleCustomURL(e.target.value, row.id)}
                value={row.slug}
                variant="outlined"
                size="small"
              />
              <TextField
                fullWidth
                label={`Notion URL for ${domain}/${row.slug || "about"}`}
                margin="normal"
                placeholder={DEFAULT_NOTION_URL}
                error={!!slugErrors[index].notionUrl}
                helperText={slugErrors[index].notionUrl}
                onChange={(e) => handleNotionPageURL(e.target.value, row.id)}
                value={row.notionUrl}
                variant="outlined"
                size="small"
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button
                  onClick={() => deleteSlug(row.id)}
                  variant="text"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                >
                  Remove
                </Button>
                {row.slug && (
                  <Button
                    onClick={() =>
                      updateSlugRow(row.id, (current) => ({
                        expanded: !current.expanded,
                      }))
                    }
                    variant="text"
                    size="small"
                    startIcon={
                      <ExpandMoreIcon
                        sx={{
                          transform: row.expanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.2s",
                        }}
                      />
                    }
                  >
                    Page SEO
                  </Button>
                )}
              </Stack>
              <Collapse
                in={row.expanded && !!row.slug}
                timeout="auto"
                unmountOnExit
              >
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    backgroundColor: "grey.100",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="caption" color="textSecondary">
                    Custom metadata for /{row.slug}
                  </Typography>
                  <TextField
                    fullWidth
                    label="Page Title"
                    margin="dense"
                    placeholder={pageTitle || "Custom title for this page"}
                    onChange={(e) =>
                      handlePageMetadata(row.id, "title", e.target.value)
                    }
                    value={row.metadata.title || ""}
                    variant="outlined"
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Page Description"
                    margin="dense"
                    placeholder={
                      pageDescription || "Custom description for this page"
                    }
                    onChange={(e) =>
                      handlePageMetadata(row.id, "description", e.target.value)
                    }
                    value={row.metadata.description || ""}
                    variant="outlined"
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="OG Image URL"
                    margin="dense"
                    placeholder="https://example.com/og-image.jpg"
                    onChange={(e) =>
                      handlePageMetadata(row.id, "ogImage", e.target.value)
                    }
                    value={row.metadata.ogImage || ""}
                    variant="outlined"
                    size="small"
                  />
                  {i18n.enabled && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="textSecondary">
                        Alternate Language Versions (hreflang)
                      </Typography>
                      {(row.metadata.alternates || []).map(
                        (alt, altIndex) => (
                          <Stack
                            key={altIndex}
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: "flex-start", mt: 1 }}
                          >
                            <TextField
                              label="Locale"
                              placeholder="ja, de, fr"
                              value={alt.locale}
                              onChange={(e) =>
                                handlePageAlternate(
                                  row.id,
                                  altIndex,
                                  "locale",
                                  e.target.value,
                                )
                              }
                              variant="outlined"
                              size="small"
                              sx={{ width: "100px" }}
                            />
                            <TextField
                              label="Slug or URL"
                              placeholder="/ja/about or https://..."
                              value={alt.slug}
                              onChange={(e) =>
                                handlePageAlternate(
                                  row.id,
                                  altIndex,
                                  "slug",
                                  e.target.value,
                                )
                              }
                              variant="outlined"
                              size="small"
                              sx={{ flex: 1 }}
                            />
                            <Button
                              onClick={() => deletePageAlternate(row.id, altIndex)}
                              color="error"
                              size="small"
                              sx={{ minWidth: "auto", px: 1 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </Button>
                          </Stack>
                        ),
                      )}
                      <Button
                        onClick={() => addPageAlternate(row.id)}
                        size="small"
                        variant="text"
                        startIcon={<AddIcon />}
                        sx={{ mt: 1 }}
                      >
                        Add Alternate
                      </Button>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Paper>
          ))}

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              onClick={addSlug}
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
            >
              Add Pretty Link
            </Button>
            <Button
              onClick={handleOptional}
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<SettingsIcon />}
            >
              {optional ? "Hide" : "Show"} Advanced Settings
            </Button>
          </Stack>

          <Collapse in={optional} timeout="auto" unmountOnExit>
            <Paper
              elevation={0}
              sx={{ p: 3, mt: 3, backgroundColor: "grey.50", borderRadius: 2 }}
            >
              <Typography
                variant="subtitle2"
                color="textSecondary"
                gutterBottom
              >
                Page Metadata
              </Typography>
              <TextField
                fullWidth
                label="Page Title"
                margin="normal"
                onChange={handlePageTitle}
                value={pageTitle}
                variant="outlined"
                size="small"
              />
              <TextField
                fullWidth
                label="Page Description"
                margin="normal"
                onChange={handlePageDescription}
                value={pageDescription}
                variant="outlined"
                size="small"
              />
              <TextField
                fullWidth
                label="Custom Google Font"
                margin="normal"
                placeholder="Open Sans"
                error={!!googleFontError}
                helperText={googleFontError}
                onChange={handleGoogleFont}
                value={googleFont}
                variant="outlined"
                size="small"
              />
              <TextField
                fullWidth
                label="Custom Script"
                margin="normal"
                multiline
                placeholder="e.g. Google Analytics"
                onChange={handleCustomScript}
                rows={2}
                value={customScript}
                variant="outlined"
                size="small"
              />
              <TextField
                fullWidth
                label="Custom CSS"
                margin="normal"
                multiline
                placeholder="e.g. body { background: #fff; }"
                onChange={handleCustomCss}
                minRows={3}
                value={customCss}
                variant="outlined"
                size="small"
              />

              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "grey.300" }}>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom
                >
                  Branding & Social
                </Typography>
                <TextField
                  fullWidth
                  label="Site Name"
                  margin="dense"
                  placeholder="My Awesome Site"
                  helperText="Used for og:site_name meta tag"
                  onChange={(e) =>
                    handleBrandingChange("siteName", e.target.value)
                  }
                  value={branding.siteName}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Brand Replacement"
                  margin="dense"
                  placeholder="My Brand"
                  helperText="Replaces 'Notion' text in meta tags (optional)"
                  onChange={(e) =>
                    handleBrandingChange("brandReplacement", e.target.value)
                  }
                  value={branding.brandReplacement}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Twitter/X Handle"
                  margin="dense"
                  placeholder="@username"
                  helperText="For twitter:site and twitter:creator meta tags"
                  onChange={(e) =>
                    handleBrandingChange("twitterHandle", e.target.value)
                  }
                  value={branding.twitterHandle}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Custom Favicon URL"
                  margin="dense"
                  placeholder="https://example.com/favicon.ico"
                  helperText="Replaces Notion's default favicon (.ico, .png, .svg)"
                  onChange={(e) =>
                    handleBrandingChange("faviconUrl", e.target.value)
                  }
                  value={branding.faviconUrl}
                  variant="outlined"
                  size="small"
                />
              </Box>

              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "grey.300" }}>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom
                >
                  Social Preview
                </Typography>
                <TextField
                  fullWidth
                  label="Default OG Image URL"
                  margin="dense"
                  placeholder="https://example.com/og-image.jpg"
                  helperText="Fallback image for pages without a specific OG image"
                  onChange={(e) =>
                    handleSocialPreviewChange("defaultImage", e.target.value)
                  }
                  value={socialPreview.defaultImage}
                  variant="outlined"
                  size="small"
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    type="number"
                    label="Image Width"
                    margin="dense"
                    placeholder="1200"
                    helperText="og:image:width"
                    onChange={(e) =>
                      handleSocialPreviewChange(
                        "imageWidth",
                        Number(e.target.value),
                      )
                    }
                    value={socialPreview.imageWidth}
                    variant="outlined"
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    type="number"
                    label="Image Height"
                    margin="dense"
                    placeholder="630"
                    helperText="og:image:height"
                    onChange={(e) =>
                      handleSocialPreviewChange(
                        "imageHeight",
                        Number(e.target.value),
                      )
                    }
                    value={socialPreview.imageHeight}
                    variant="outlined"
                    size="small"
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <FormControl fullWidth size="small" margin="dense">
                  <InputLabel id="twitterCardTypeLabel">
                    Twitter Card Type
                  </InputLabel>
                  <Select
                    labelId="twitterCardTypeLabel"
                    label="Twitter Card Type"
                    value={socialPreview.twitterCardType}
                    onChange={(e) =>
                      handleSocialPreviewChange(
                        "twitterCardType",
                        e.target.value,
                      )
                    }
                  >
                    <MenuItem value="summary_large_image">
                      summary_large_image (recommended)
                    </MenuItem>
                    <MenuItem value="summary">summary</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Locale"
                  margin="dense"
                  placeholder="en_US, ja_JP, etc."
                  helperText="og:locale for language targeting"
                  onChange={(e) =>
                    handleSocialPreviewChange("locale", e.target.value)
                  }
                  value={socialPreview.locale}
                  variant="outlined"
                  size="small"
                />
              </Box>

              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "grey.300" }}>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom
                >
                  SEO & AI Attribution
                </Typography>
                <TextField
                  fullWidth
                  label="AI Attribution"
                  margin="dense"
                  placeholder="Your Name - yourdomain.com"
                  helperText="Attribution text for AI crawlers (ChatGPT, Claude, Perplexity, etc.)"
                  onChange={(e) =>
                    handleSeoChange("aiAttribution", e.target.value)
                  }
                  value={seo.aiAttribution}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="robots.txt Rules"
                  margin="dense"
                  placeholder={"User-agent: *\nAllow: /"}
                  helperText="Custom robots.txt rules. The sitemap line is added automatically."
                  onChange={(e) => handleSeoChange("robotsRules", e.target.value)}
                  value={seo.robotsRules}
                  variant="outlined"
                  size="small"
                />
              </Box>

              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "grey.300" }}>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom
                >
                  Analytics
                </Typography>
                <TextField
                  fullWidth
                  label="Google Analytics Measurement ID"
                  margin="dense"
                  placeholder="G-XXXXXXXXXX"
                  error={!!googleTagError}
                  helperText={
                    googleTagError ||
                    "Your GA4 Measurement ID for automatic tracking"
                  }
                  onChange={(e) =>
                    handleAnalyticsChange("googleTagId", e.target.value)
                  }
                  value={analytics.googleTagId}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Facebook Pixel ID"
                  margin="dense"
                  placeholder="123456789012345"
                  error={!!pixelIdError}
                  helperText={
                    pixelIdError ||
                    "Your Facebook Pixel ID for conversion tracking"
                  }
                  onChange={(e) =>
                    handleAnalyticsChange("facebookPixelId", e.target.value)
                  }
                  value={analytics.facebookPixelId}
                  variant="outlined"
                  size="small"
                />
              </Box>

              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "grey.300" }}>
                <Stack
                  direction="row"
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      Cache-Control Headers
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Improve performance with browser caching
                    </Typography>
                  </Box>
                  <Switch
                    checked={caching.enabled}
                    onChange={(e) =>
                      handleCachingChange("enabled", e.target.checked)
                    }
                  />
                </Stack>
                <Collapse in={caching.enabled} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="HTML Page TTL (seconds)"
                      margin="dense"
                      placeholder="60"
                      helperText="Cache duration for HTML pages (default: 60s)"
                      onChange={(e) =>
                        handleCachingChange("htmlTtl", Number(e.target.value))
                      }
                      value={caching.htmlTtl}
                      variant="outlined"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="Static Assets TTL (seconds)"
                      margin="dense"
                      placeholder="86400"
                      helperText="Cache duration for JS, CSS, fonts (default: 1 day)"
                      onChange={(e) =>
                        handleCachingChange(
                          "staticAssetsTtl",
                          Number(e.target.value),
                        )
                      }
                      value={caching.staticAssetsTtl}
                      variant="outlined"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      type="number"
                      label="Image TTL (seconds)"
                      margin="dense"
                      placeholder="604800"
                      helperText="Cache duration for images (default: 1 week)"
                      onChange={(e) =>
                        handleCachingChange("imageTtl", Number(e.target.value))
                      }
                      value={caching.imageTtl}
                      variant="outlined"
                      size="small"
                    />
                  </Box>
                </Collapse>
              </Box>

              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "grey.300" }}>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom
                >
                  Custom Header HTML
                </Typography>
                <TextField
                  fullWidth
                  label="Header HTML"
                  margin="dense"
                  multiline
                  minRows={3}
                  placeholder={`<nav class="site-nav">
  <a href="/">Home</a>
  <a href="/about">About</a>
</nav>`}
                  helperText="HTML injected at the top of page body (e.g., navigation, announcements)"
                  onChange={(e) =>
                    handleCustomHtmlChange("headerHtml", e.target.value)
                  }
                  value={customHtml.headerHtml}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Head HTML"
                  margin="dense"
                  multiline
                  minRows={2}
                  placeholder={`<meta name="google-site-verification" content="..." />`}
                  helperText="HTML injected at the start of <head> (e.g., site verification meta tags, consent scripts)"
                  onChange={(e) =>
                    handleCustomHtmlChange("headHtml", e.target.value)
                  }
                  value={customHtml.headHtml}
                  variant="outlined"
                  size="small"
                />
              </Box>

              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "grey.300" }}>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom
                >
                  Custom 404 Page
                </Typography>
                <TextField
                  fullWidth
                  label="404 Page Notion URL"
                  margin="dense"
                  placeholder={DEFAULT_NOTION_URL}
                  error={!!custom404Error}
                  helperText={
                    custom404Error ||
                    "Notion page to display when a page is not found"
                  }
                  onChange={(e) =>
                    handleCustom404Change("notionUrl", e.target.value)
                  }
                  value={custom404.notionUrl}
                  variant="outlined"
                  size="small"
                />
              </Box>

              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "grey.300" }}>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom
                >
                  Subdomain Redirects
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Redirect subdomains (e.g., www) to the main domain or other
                  URLs
                </Typography>
                {subdomainRedirects.map((redirect, index) => (
                  <Box
                    key={index}
                    sx={{
                      mt: 1,
                      p: 1.5,
                      backgroundColor: "grey.100",
                      borderRadius: 1,
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                      <TextField
                        label="Subdomain"
                        placeholder="www"
                        error={!!subdomainErrors[index].subdomain}
                        helperText={subdomainErrors[index].subdomain}
                        value={redirect.subdomain}
                        onChange={(e) =>
                          handleSubdomainRedirectChange(
                            index,
                            "subdomain",
                            e.target.value,
                          )
                        }
                        variant="outlined"
                        size="small"
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Redirect URL"
                        placeholder={`https://${domain}`}
                        error={!!subdomainErrors[index].redirectUrl}
                        helperText={subdomainErrors[index].redirectUrl}
                        value={redirect.redirectUrl}
                        onChange={(e) =>
                          handleSubdomainRedirectChange(
                            index,
                            "redirectUrl",
                            e.target.value,
                          )
                        }
                        variant="outlined"
                        size="small"
                        sx={{ flex: 2 }}
                      />
                      <Button
                        onClick={() => deleteSubdomainRedirect(index)}
                        color="error"
                        size="small"
                        sx={{ minWidth: "auto", px: 1 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </Button>
                    </Stack>
                  </Box>
                ))}
                <Button
                  onClick={addSubdomainRedirect}
                  size="small"
                  variant="text"
                  startIcon={<AddIcon />}
                  sx={{ mt: 1 }}
                >
                  Add Subdomain Redirect
                </Button>
              </Box>

              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "grey.300" }}>
                <Typography
                  variant="subtitle2"
                  color="textSecondary"
                  gutterBottom
                >
                  URL Redirect Rules
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Redirect specific paths to other URLs (301 permanent / 302
                  temporary). End a path with * to match a prefix, e.g.
                  /blog/* to /posts/*. For thousands of URLs, use{" "}
                  <Link
                    href="https://developers.cloudflare.com/rules/url-forwarding/bulk-redirects/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Cloudflare Bulk Redirects
                  </Link>
                  .
                </Typography>
                {redirectRules.map((rule, index) => (
                  <Box
                    key={index}
                    sx={{
                      mt: 1,
                      p: 1.5,
                      backgroundColor: "grey.100",
                      borderRadius: 1,
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                      <TextField
                        label="From Path"
                        placeholder="/old-page or /old/*"
                        error={!!redirectErrors[index].from}
                        helperText={redirectErrors[index].from}
                        value={rule.from}
                        onChange={(e) =>
                          handleRedirectRuleChange(
                            index,
                            "from",
                            e.target.value,
                          )
                        }
                        variant="outlined"
                        size="small"
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="To Path/URL"
                        placeholder="/new-page, /new/* or https://..."
                        error={!!redirectErrors[index].to}
                        helperText={redirectErrors[index].to}
                        value={rule.to}
                        onChange={(e) =>
                          handleRedirectRuleChange(index, "to", e.target.value)
                        }
                        variant="outlined"
                        size="small"
                        sx={{ flex: 2 }}
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={rule.permanent}
                            onChange={(e) =>
                              handleRedirectRuleChange(
                                index,
                                "permanent",
                                e.target.checked,
                              )
                            }
                            size="small"
                          />
                        }
                        label="301"
                        sx={{ minWidth: 70 }}
                      />
                      <Button
                        onClick={() => deleteRedirectRule(index)}
                        color="error"
                        size="small"
                        sx={{ minWidth: "auto", px: 1 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </Button>
                    </Stack>
                  </Box>
                ))}
                <Button
                  onClick={addRedirectRule}
                  size="small"
                  variant="text"
                  startIcon={<AddIcon />}
                  sx={{ mt: 1 }}
                >
                  Add Redirect Rule
                </Button>
              </Box>

              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "grey.300" }}>
                <Stack
                  direction="row"
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      JSON-LD Structured Data
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Enable rich snippets in search results
                    </Typography>
                  </Box>
                  <Switch
                    checked={structuredData.enabled}
                    onChange={(e) =>
                      handleStructuredDataChange("enabled", e.target.checked)
                    }
                  />
                </Stack>
                <Collapse
                  in={structuredData.enabled}
                  timeout="auto"
                  unmountOnExit
                >
                  <Box sx={{ mt: 2 }}>
                    <FormControl fullWidth size="small" margin="dense">
                      <InputLabel id="schemaTypeLabel">Schema Type</InputLabel>
                      <Select
                        labelId="schemaTypeLabel"
                        label="Schema Type"
                        value={structuredData.schemaType}
                        onChange={(e) =>
                          handleStructuredDataChange(
                            "schemaType",
                            e.target
                              .value as StructuredDataOptions["schemaType"],
                          )
                        }
                      >
                        <MenuItem value="WebPage">WebPage</MenuItem>
                        <MenuItem value="Article">Article</MenuItem>
                        <MenuItem value="Organization">Organization</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      label="Organization Name"
                      margin="dense"
                      placeholder="Your Company Name"
                      onChange={(e) =>
                        handleStructuredDataChange(
                          "organizationName",
                          e.target.value,
                        )
                      }
                      value={structuredData.organizationName}
                      variant="outlined"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="Logo URL"
                      margin="dense"
                      placeholder="https://example.com/logo.png"
                      onChange={(e) =>
                        handleStructuredDataChange("logoUrl", e.target.value)
                      }
                      value={structuredData.logoUrl}
                      variant="outlined"
                      size="small"
                    />
                    <Alert severity="info" sx={{ mt: 1 }}>
                      Structured data helps search engines understand your
                      content and display rich results. Validate with{" "}
                      <Link
                        href="https://search.google.com/test/rich-results"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Google Rich Results Test
                      </Link>
                      .
                    </Alert>
                  </Box>
                </Collapse>
              </Box>

              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "grey.300" }}>
                <Stack
                  direction="row"
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      RSS Feed
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Generate RSS 2.0 feed at /rss.xml
                    </Typography>
                  </Box>
                  <Switch
                    checked={rss.enabled}
                    onChange={(e) =>
                      handleRssChange("enabled", e.target.checked)
                    }
                  />
                </Stack>
                <Collapse in={rss.enabled} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="Feed Title"
                      margin="dense"
                      placeholder="My Blog"
                      helperText="Title shown in RSS readers (defaults to domain)"
                      onChange={(e) => handleRssChange("title", e.target.value)}
                      value={rss.title}
                      variant="outlined"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="Feed Description"
                      margin="dense"
                      placeholder="Latest posts from my blog"
                      helperText="Description shown in RSS readers"
                      onChange={(e) =>
                        handleRssChange("description", e.target.value)
                      }
                      value={rss.description}
                      variant="outlined"
                      size="small"
                    />
                    <FormControl fullWidth size="small" margin="dense">
                      <InputLabel id="rssLanguageLabel">Language</InputLabel>
                      <Select
                        labelId="rssLanguageLabel"
                        label="Language"
                        value={rss.language}
                        onChange={(e) =>
                          handleRssChange("language", e.target.value)
                        }
                      >
                        <MenuItem value="en-us">English (US)</MenuItem>
                        <MenuItem value="en-gb">English (UK)</MenuItem>
                        <MenuItem value="ja">Japanese</MenuItem>
                        <MenuItem value="de">German</MenuItem>
                        <MenuItem value="fr">French</MenuItem>
                        <MenuItem value="es">Spanish</MenuItem>
                        <MenuItem value="zh-cn">Chinese (Simplified)</MenuItem>
                        <MenuItem value="zh-tw">Chinese (Traditional)</MenuItem>
                        <MenuItem value="ko">Korean</MenuItem>
                      </Select>
                    </FormControl>
                    <Alert severity="info" sx={{ mt: 1 }}>
                      RSS feed will include all pages defined in Pretty Links.
                      Add page metadata for better feed content.
                    </Alert>
                  </Box>
                </Collapse>
              </Box>

              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "grey.300" }}>
                <Stack
                  direction="row"
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      Internationalization (i18n)
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Add hreflang tags for multilingual SEO
                    </Typography>
                  </Box>
                  <Switch
                    checked={i18n.enabled}
                    onChange={(e) =>
                      handleI18nChange("enabled", e.target.checked)
                    }
                  />
                </Stack>
                <Collapse in={i18n.enabled} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="Default Locale"
                      margin="dense"
                      placeholder="en"
                      helperText="Primary language code (e.g., en, ja, de)"
                      onChange={(e) =>
                        handleI18nChange("defaultLocale", e.target.value)
                      }
                      value={i18n.defaultLocale}
                      variant="outlined"
                      size="small"
                    />
                    <Alert severity="info" sx={{ mt: 1 }}>
                      Configure alternate language versions in each page's SEO
                      settings. Hreflang tags help search engines serve the
                      correct language version to users.
                    </Alert>
                  </Box>
                </Collapse>
              </Box>

              <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "grey.300" }}>
                <Stack
                  direction="row"
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      Auto-Generate OG Images
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Create Open Graph images from page titles
                    </Typography>
                  </Box>
                  <Switch
                    checked={ogImageGeneration.enabled}
                    onChange={(e) =>
                      handleOgImageGenerationChange("enabled", e.target.checked)
                    }
                  />
                </Stack>
                <Collapse
                  in={ogImageGeneration.enabled}
                  timeout="auto"
                  unmountOnExit
                >
                  <Box sx={{ mt: 2 }}>
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Background Color"
                        margin="dense"
                        placeholder="#1a1a2e"
                        error={!!ogBackgroundError}
                        helperText={ogBackgroundError || "Hex color code"}
                        onChange={(e) =>
                          handleOgImageGenerationChange(
                            "backgroundColor",
                            e.target.value,
                          )
                        }
                        value={ogImageGeneration.backgroundColor}
                        variant="outlined"
                        size="small"
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Text Color"
                        margin="dense"
                        placeholder="#ffffff"
                        error={!!ogTextColorError}
                        helperText={ogTextColorError || "Hex color code"}
                        onChange={(e) =>
                          handleOgImageGenerationChange(
                            "textColor",
                            e.target.value,
                          )
                        }
                        value={ogImageGeneration.textColor}
                        variant="outlined"
                        size="small"
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        type="number"
                        label="Font Size"
                        margin="dense"
                        placeholder="64"
                        helperText="Title font size"
                        onChange={(e) =>
                          handleOgImageGenerationChange(
                            "fontSize",
                            Number(e.target.value),
                          )
                        }
                        value={ogImageGeneration.fontSize}
                        variant="outlined"
                        size="small"
                        sx={{ width: "120px" }}
                      />
                    </Stack>
                    <TextField
                      fullWidth
                      label="Font URL"
                      margin="dense"
                      placeholder={DEFAULT_OG_FONT_URL}
                      error={!!ogFontUrlError}
                      helperText={
                        ogFontUrlError ||
                        "TTF, OTF, WOFF or WOFF2 file used to draw titles. Leave empty for the default, which covers Latin and Japanese."
                      }
                      onChange={(e) =>
                        handleOgImageGenerationChange("fontUrl", e.target.value)
                      }
                      value={ogImageGeneration.fontUrl}
                      variant="outlined"
                      size="small"
                    />
                    <Alert severity="info" sx={{ mt: 1 }}>
                      Auto-generated OG images are served at /og-image/[slug]
                      when no custom image is set. X, Facebook and LinkedIn
                      only show PNG images: add an{" "}
                      <Link
                        href="https://developers.cloudflare.com/images/optimization/binding/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Images binding
                      </Link>{" "}
                      named IMAGES to the Worker (Settings &gt; Bindings) to
                      render PNG. Without it, or if rendering fails, the worker
                      serves SVG.
                    </Alert>
                  </Box>
                </Collapse>
              </Box>
            </Paper>
          </Collapse>

          <Stack sx={{ mt: 4, mb: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Image Optimization
            </Typography>
            <RadioGroup
              row
              aria-labelledby="imageResizeTypeLabel"
              defaultValue="none"
              name="imageResizeType"
              onChange={(e) => handleImageOption(e.target)}
            >
              <FormControlLabel value="none" control={<Radio />} label="None" />
              <FormControlLabel
                value="resize"
                control={<Radio />}
                label="Enable Resizing"
              />
            </RadioGroup>
            <Collapse in={optionalImageResize} timeout="auto" unmountOnExit>
              <Box component="form" autoComplete="off" sx={{ mt: 2 }}>
                <TextField
                  type="number"
                  label="Width"
                  name="imageWidth"
                  placeholder="1600"
                  onChange={(e) => handleImageOption(e.target)}
                  value={optionImage.imageWidth ?? ""}
                  variant="filled"
                  size="small"
                  sx={{ m: 0.5, width: "18ch" }}
                />
                <TextField
                  type="number"
                  label="Height"
                  name="imageHeight"
                  placeholder="800"
                  onChange={(e) => handleImageOption(e.target)}
                  value={optionImage.imageHeight ?? ""}
                  variant="filled"
                  size="small"
                  sx={{ m: 0.5, width: "18ch" }}
                />
                <TextField
                  type="number"
                  slotProps={{ htmlInput: { min: 1, max: 100, step: 1 } }}
                  label="Quality"
                  name="imageQuality"
                  placeholder="60"
                  onChange={(e) => handleImageOption(e.target)}
                  value={optionImage.imageQuality ?? ""}
                  variant="filled"
                  size="small"
                  sx={{ m: 0.5, width: "12ch" }}
                />
                <FormControl
                  variant="filled"
                  size="small"
                  sx={{ m: 0.5, minWidth: "18ch" }}
                >
                  <InputLabel id="imageFormatLabel">Format</InputLabel>
                  <Select
                    labelId="imageFormatLabel"
                    label="Format"
                    name="imageFormat"
                    value={optionImage.imageFormat ?? ""}
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="auto">auto (recommended)</MenuItem>
                    <MenuItem value="avif">avif</MenuItem>
                    <MenuItem value="webp">webp</MenuItem>
                    <MenuItem value="jpeg">jpeg</MenuItem>
                    <MenuItem value="png">png</MenuItem>
                  </Select>
                </FormControl>
                <FormControl
                  variant="filled"
                  size="small"
                  sx={{ m: 0.5, minWidth: "18ch" }}
                >
                  <InputLabel id="imageFitLabel">Fit</InputLabel>
                  <Select
                    labelId="imageFitLabel"
                    label="Fit"
                    name="imageFit"
                    value={optionImage.imageFit ?? ""}
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="scale-down">scale-down</MenuItem>
                    <MenuItem value="contain">contain</MenuItem>
                    <MenuItem value="cover">cover</MenuItem>
                    <MenuItem value="crop">crop</MenuItem>
                    <MenuItem value="pad">pad</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  type="number"
                  slotProps={{ htmlInput: { min: 0, max: 250, step: 1 } }}
                  label="Blur"
                  name="imageBlur"
                  placeholder="0"
                  onChange={(e) => handleImageOption(e.target)}
                  value={optionImage.imageBlur ?? ""}
                  variant="filled"
                  size="small"
                  sx={{ m: 0.5, width: "12ch" }}
                />
                <FormControl
                  variant="filled"
                  size="small"
                  sx={{ m: 0.5, minWidth: "18ch" }}
                >
                  <InputLabel id="imageMetadataLabel">Metadata</InputLabel>
                  <Select
                    labelId="imageMetadataLabel"
                    label="Metadata"
                    name="imageMetadata"
                    value={optionImage.imageMetadata ?? ""}
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="none">none (default)</MenuItem>
                    <MenuItem value="keep">keep</MenuItem>
                    <MenuItem value="copyright">copyright</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Radio
                      checked={optionImage.imageAnim !== false}
                      onChange={() => {
                        setOptionImage({ ...optionImage, imageAnim: true });
                        setCopied(false);
                      }}
                      size="small"
                    />
                  }
                  label="Anim: On"
                  sx={{ ml: 1 }}
                />
                <FormControlLabel
                  control={
                    <Radio
                      checked={optionImage.imageAnim === false}
                      onChange={() => {
                        setOptionImage({ ...optionImage, imageAnim: false });
                        setCopied(false);
                      }}
                      size="small"
                    />
                  }
                  label="Anim: Off"
                />
              </Box>
              <Alert severity="info" sx={{ mt: 2 }}>
                Enable{" "}
                <Link
                  href="https://developers.cloudflare.com/images/transform-images/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Image Transformations
                </Link>{" "}
                in your Cloudflare dashboard to use this feature.
              </Alert>
            </Collapse>
          </Stack>

          <Box sx={{ mt: 4 }}>
            {!noError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Fix the fields marked in red
                {advancedError && !optional ? " (including Advanced Settings)" : ""}{" "}
                to generate the worker script.
              </Alert>
            )}
            <Button
              disabled={!noError}
              variant="contained"
              color="primary"
              size="large"
              disableElevation
              onClick={copyToClipboard}
              startIcon={copied ? <CheckIcon /> : <CopyIcon />}
              sx={{ px: 4, py: 1.5 }}
            >
              {copied ? "Copied to Clipboard!" : "Copy Worker Script"}
            </Button>
          </Box>

          {noError && (
            <TextField
              fullWidth
              margin="normal"
              maxRows={8}
              multiline
              value={script}
              variant="outlined"
              sx={{
                mt: 3,
                "& .MuiOutlinedInput-root": {
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  backgroundColor: "grey.900",
                  color: "grey.100",
                },
              }}
            />
          )}
        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Actively maintained by{" "}
            <Link
              href="https://classmethod.jp/"
              target="_blank"
              rel="noreferrer"
            >
              Classmethod
            </Link>{" "}
            | Fork of{" "}
            <Link
              href="https://fruitionsite.com/"
              target="_blank"
              rel="noreferrer"
            >
              Fruition
            </Link>
          </Typography>
          <Typography variant="body2">
            <Link
              href="https://github.com/classmethod/worknot"
              target="_blank"
              rel="noreferrer"
            >
              View on GitHub
            </Link>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
