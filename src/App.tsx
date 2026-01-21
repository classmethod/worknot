import React, { useState, useRef, ChangeEvent } from "react";
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
} from "@mui/icons-material";
import code, { CodeData, ImageOptions } from "./code";
import "./styles.css";

const DEFAULT_DOMAIN = "worknot.classmethod.cf";
const DEFAULT_NOTION_URL =
  "https://succinct-scar-f20.notion.site/Sample-Web-Site-148f2fc322e74473a91fb4d90836e3ce";

const DOMAIN_PATTERN =
  /^((https:\/\/)|(http:\/\/))?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+(\/)?$/;
const NOTION_ID_PATTERN = /[0-9a-f]{32}/;

function isValidDomain(domain: string): boolean {
  return DOMAIN_PATTERN.test(domain);
}

function isValidNotionUrl(url: string): boolean {
  if (!url) return true;
  try {
    const link = new URL(url);
    const isNotionHost =
      link.hostname.endsWith("notion.so") ||
      link.hostname.endsWith("notion.site");
    const hasValidId = NOTION_ID_PATTERN.test(link.pathname.slice(-32));
    return isNotionHost && hasValidId;
  } catch {
    return false;
  }
}

type SlugPair = [string, string];

function updateSlugAtIndex(
  slugs: SlugPair[],
  index: number,
  position: 0 | 1,
  value: string,
): SlugPair[] {
  return slugs.map((slug, i) => {
    if (i !== index) return slug;
    const updated: SlugPair = [...slug];
    updated[position] = value;
    return updated;
  });
}

interface FeatureCardProps {
  icon: React.ReactNode;
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
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Paper>
  );
}

export default function App() {
  const [slugs, setSlugs] = useState<SlugPair[]>([]);
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
    setSlugs([...slugs, ["", ""]]);
    setCopied(false);
  }

  function deleteSlug(index: number): void {
    setSlugs(slugs.filter((_, i) => i !== index));
    setCopied(false);
  }

  function handleCustomURL(value: string, index: number): void {
    setSlugs(updateSlugAtIndex(slugs, index, 0, value));
    setCopied(false);
  }

  function handleNotionPageURL(value: string, index: number): void {
    setSlugs(updateSlugAtIndex(slugs, index, 1, value));
    setCopied(false);
  }

  function handleOptional(): void {
    setOptional(!optional);
  }

  function clampValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  function handleImageOption(
    target: EventTarget & (HTMLInputElement | HTMLTextAreaElement),
  ): void {
    const name = target.name as keyof ImageOptions;
    let formValue: string | number = target.value;

    switch (name) {
      case "imageResizeType":
        setOptionalImageResize(target.value === "resize");
        break;
      case "imageQuality":
        formValue = clampValue(Number(formValue), 1, 100);
        break;
      case "imageBlur":
        formValue = clampValue(Number(formValue), 0, 250);
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
  const noError = !myDomainHelperText && !notionUrlHelperText;

  const codeData: CodeData = {
    myDomain: domain,
    notionUrl: url,
    slugs,
    pageTitle,
    pageDescription,
    googleFont,
    customScript,
    customCss,
    optionImage,
  };

  const script = noError ? code(codeData) : undefined;
  const textarea = useRef<HTMLTextAreaElement>(null);

  function copyToClipboard(): void {
    if (!noError || !textarea.current) return;
    textarea.current.select();
    document.execCommand("copy");
    setCopied(true);
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
            justifyContent="center"
            sx={{ mb: 3 }}
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
            Always up-to-date with the latest Notion Site specifications
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
              description="Host your Notion Site on your own domain"
            />
            <FeatureCard
              icon={<UpdateIcon sx={{ fontSize: 40 }} />}
              title="Always Up-to-Date"
              description="Follows latest Notion Site specifications"
            />
            <FeatureCard
              icon={<SpeedIcon sx={{ fontSize: 40 }} />}
              title="Global CDN"
              description="Fast delivery via Cloudflare edge network"
            />
            <FeatureCard
              icon={<ImageIcon sx={{ fontSize: 40 }} />}
              title="Image Optimization"
              description="Resize, convert, and compress images"
            />
            <FeatureCard
              icon={<CodeIcon sx={{ fontSize: 40 }} />}
              title="Custom Code"
              description="Inject your own CSS and JavaScript"
            />
            <FeatureCard
              icon={<VerifiedIcon sx={{ fontSize: 40 }} />}
              title="Actively Maintained"
              description="Maintained by Classmethod"
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
            fontWeight={600}
            gutterBottom
            sx={{ mb: 3 }}
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
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">https://</InputAdornment>
              ),
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

          {slugs.map(([customUrl, notionPageUrl], index) => (
            <Paper
              key={index}
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
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">{`${domain}/`}</InputAdornment>
                  ),
                }}
                label="Pretty Link"
                margin="normal"
                placeholder="about"
                onChange={(e) => handleCustomURL(e.target.value, index)}
                value={customUrl}
                variant="outlined"
                size="small"
              />
              <TextField
                fullWidth
                label={`Notion URL for ${domain}/${customUrl || "about"}`}
                margin="normal"
                placeholder={DEFAULT_NOTION_URL}
                onChange={(e) => handleNotionPageURL(e.target.value, index)}
                value={notionPageUrl}
                variant="outlined"
                size="small"
              />
              <Button
                onClick={() => deleteSlug(index)}
                variant="text"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                sx={{ mt: 1 }}
              >
                Remove
              </Button>
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
                color="text.secondary"
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
            </Paper>
          </Collapse>

          <Stack mt={4} mb={2}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
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
                  inputProps={{ min: "1", max: "100", step: "1" }}
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
                    <MenuItem value="avif">avif</MenuItem>
                    <MenuItem value="webp">webp</MenuItem>
                    <MenuItem value="json">json</MenuItem>
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
                  inputProps={{ min: "0", max: "250", step: "1" }}
                  label="Blur"
                  name="imageBlur"
                  placeholder="0"
                  onChange={(e) => handleImageOption(e.target)}
                  value={optionImage.imageBlur ?? ""}
                  variant="filled"
                  size="small"
                  sx={{ m: 0.5, width: "12ch" }}
                />
              </Box>
              <Alert severity="info" sx={{ mt: 2 }}>
                Enable{" "}
                <Link
                  href="https://developers.cloudflare.com/images/image-resizing/enable-image-resizing/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Image Resizing
                </Link>{" "}
                in your Cloudflare dashboard to use this feature.
              </Alert>
            </Collapse>
          </Stack>

          <Box sx={{ mt: 4 }}>
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
              inputRef={textarea}
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
