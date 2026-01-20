import React, { useState, useRef, ChangeEvent } from "react";
import { Button, Collapse, InputAdornment, TextField, Container, RadioGroup, Radio, Box, Alert, Stack, Select, MenuItem, InputLabel, FormControl, FormControlLabel, Typography, SelectChangeEvent } from "@mui/material";
import code, { CodeData, ImageOptions } from "./code";
import "./styles.css";

const DEFAULT_DOMAIN = "worknot.classmethod.cf";
const DEFAULT_NOTION_URL =
  "https://succinct-scar-f20.notion.site/Sample-Web-Site-148f2fc322e74473a91fb4d90836e3ce";

const DOMAIN_PATTERN = /^((https:\/\/)|(http:\/\/))?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+(\/)?$/;
const NOTION_ID_PATTERN = /[0-9a-f]{32}/;

function isValidDomain(domain: string): boolean {
  return DOMAIN_PATTERN.test(domain);
}

function isValidNotionUrl(url: string): boolean {
  if (!url) return true;
  try {
    const link = new URL(url);
    const isNotionHost = link.hostname.endsWith("notion.so") || link.hostname.endsWith("notion.site");
    const hasValidId = NOTION_ID_PATTERN.test(link.pathname.slice(-32));
    return isNotionHost && hasValidId;
  } catch {
    return false;
  }
}

type SlugPair = [string, string];

function updateSlugAtIndex(slugs: SlugPair[], index: number, position: 0 | 1, value: string): SlugPair[] {
  return slugs.map((slug, i) => {
    if (i !== index) return slug;
    const updated: SlugPair = [...slug];
    updated[position] = value;
    return updated;
  });
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

  function createInputHandler<T>(setter: React.Dispatch<React.SetStateAction<T>>) {
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

  function handleImageOption(target: EventTarget & (HTMLInputElement | HTMLTextAreaElement)): void {
    const name = target.name as keyof ImageOptions;
    let formValue: string | number = target.value;

    switch (name) {
      case 'imageResizeType':
        setOptionalImageResize(target.value === 'resize');
        break;
      case 'imageQuality':
        formValue = clampValue(Number(formValue), 1, 100);
        break;
      case 'imageBlur':
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
    optionImage
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
    <Container maxWidth="md">
      <TextField
        fullWidth
        helperText={myDomainHelperText}
        label="Your Domain (e.g. something.example.org)"
        onChange={handleMyDomain}
        margin="normal"
        placeholder={DEFAULT_DOMAIN}
        value={myDomain}
        variant="outlined"
      />
      <TextField
        fullWidth
        helperText={notionUrlHelperText}
        label={`Notion URL for ${domain}`}
        margin="normal"
        onChange={handleNotionUrl}
        placeholder={DEFAULT_NOTION_URL}
        value={notionUrl}
        variant="outlined"
      />
      {slugs.map(([customUrl, notionPageUrl], index) => {
        return (
          <section key={index}>
            <TextField
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">{`${domain}/`}</InputAdornment>
                )
              }}
              label="Pretty Link"
              margin="normal"
              placeholder="about"
              onChange={e => handleCustomURL(e.target.value, index)}
              value={customUrl}
              variant="outlined"
            />
            <TextField
              fullWidth
              label={`Notion URL for ${domain}/${customUrl || "about"}`}
              margin="normal"
              placeholder={DEFAULT_NOTION_URL}
              onChange={e => handleNotionPageURL(e.target.value, index)}
              value={notionPageUrl}
              variant="outlined"
            />
            <Button
              onClick={() => deleteSlug(index)}
              variant="outlined"
              color="secondary"
              size="small"
            >
              Delete this pretty link
            </Button>
          </section>
        );
      })}
      <section>
        <Button
          onClick={addSlug}
          size="small"
          variant="outlined"
          color="primary"
        >
          Add a pretty link
        </Button>
      </section>
      <section>
        <Button
          onClick={handleOptional}
          size="small"
          variant="outlined"
          color="primary"
        >
          Toggle Style And Script Settings
        </Button>
      </section>
      <Collapse in={optional} timeout="auto" unmountOnExit>
        <TextField
          fullWidth
          label="Page Title"
          margin="normal"
          onChange={handlePageTitle}
          value={pageTitle}
          variant="outlined"
        />
        <TextField
          fullWidth
          label="Page Description"
          margin="normal"
          onChange={handlePageDescription}
          value={pageDescription}
          variant="outlined"
        />
        <TextField
          fullWidth
          label="Custom Google Font"
          margin="normal"
          placeholder="Open Sans"
          onChange={handleGoogleFont}
          value={googleFont}
          variant="outlined"
        />
        <TextField
          fullWidth
          label="Paste Your Custom Script"
          margin="normal"
          multiline
          placeholder="e.g. Google Analytics"
          onChange={handleCustomScript}
          rows={2}
          value={customScript}
          variant="outlined"
        />
        <TextField
          fullWidth
          label="Paste Your Custom CSS"
          margin="normal"
          multiline
          placeholder="e.g. body{background: #fff;}"
          onChange={handleCustomCss}
          minRows={4}
          value={customCss}
          variant="outlined"
        />
      </Collapse>

      <Stack mt={4} mb={6}>
        <Typography variant="h6" component="h2">
          Image Optimization
        </Typography>
        <RadioGroup
          row
          aria-labelledby="imageResizeTypeLabel"
          defaultValue="none"
          name="imageResizeType"
          onChange={e => handleImageOption(e.target)}
        >
          <FormControlLabel value="none" control={<Radio />} label="None" />
          <FormControlLabel value="resize" control={<Radio />} label="Image Resizing" />
        </RadioGroup>
        <Collapse in={optionalImageResize} timeout="auto" unmountOnExit>
          <Box
            component="form"
            autoComplete="off"
          >
            <TextField
              type="number"
              label="Width"
              name="imageWidth"
              placeholder="1600"
              onChange={e => handleImageOption(e.target)}
              value={optionImage.imageWidth ?? ''}
              variant="filled"
              sx={{ m: 1, width: '20ch' }}
            />
            <TextField
              type="number"
              label="Height"
              name="imageHeight"
              placeholder="800"
              onChange={e => handleImageOption(e.target)}
              value={optionImage.imageHeight ?? ''}
              variant="filled"
              sx={{ m: 1, width: '20ch' }}
            />
            <TextField
              type="number"
              inputProps={{ min: "1", max: "100", step: "1" }}
              label="Quality"
              name="imageQuality"
              placeholder="60"
              onChange={e => handleImageOption(e.target)}
              value={optionImage.imageQuality ?? ''}
              variant="filled"
              sx={{ m: 1, width: '12ch' }}
            />
            <FormControl
              variant="filled"
              sx={{ m: 1, minWidth: '22ch' }}
            >
              <InputLabel id="imageFormatLabel">Format</InputLabel>
              <Select
                labelId="imageFormatLabel"
                label="Format"
                name="imageFormat"
                value={optionImage.imageFormat ?? ''}
                onChange={handleSelectChange}
              >
                <MenuItem value="avif">avif</MenuItem>
                <MenuItem value="webp">webp</MenuItem>
                <MenuItem value="json">json</MenuItem>
              </Select>
            </FormControl>
            <FormControl
              variant="filled"
              sx={{ m: 1, minWidth: '22ch' }}
            >
              <InputLabel id="imageFitLabel">Fit</InputLabel>
              <Select
                labelId="imageFitLabel"
                label="Fit"
                name="imageFit"
                value={optionImage.imageFit ?? ''}
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
              inputProps={{ min: "1", max: "250", step: "1" }}
              label="Blur"
              name="imageBlur"
              placeholder="50"
              onChange={e => handleImageOption(e.target)}
              value={optionImage.imageBlur ?? ''}
              variant="filled"
              sx={{ m: 1, width: '20ch' }}
            />
          </Box>
          <Alert severity="warning">
            To activate this option, please turn on `Image Resizing` from the dashboard. <a href="https://developers.cloudflare.com/images/image-resizing/enable-image-resizing/" target="_blank" rel="noreferrer">More details</a>
          </Alert>
        </Collapse>
      </Stack>
      <section>
        <Button
          disabled={!noError}
          variant="contained"
          color="primary"
          disableElevation
          onClick={copyToClipboard}
        >
          {copied ? "Copied!" : "Copy the code"}
        </Button>
      </section>
      {noError ? (
        <TextField
          fullWidth
          margin="normal"
          maxRows={5}
          multiline
          inputRef={textarea}
          value={script}
          variant="outlined"
        />
      ) : null}
    </Container>
  );
}
