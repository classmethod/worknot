import React, { useState, useRef, ChangeEvent } from "react";
import { Button, Collapse, InputAdornment, TextField, Container, RadioGroup, Radio, Box, Alert, Stack, Select, MenuItem, InputLabel, FormControl, FormControlLabel, Typography, SelectChangeEvent } from "@mui/material";
import code, { CodeData, ImageOptions } from "./code";
import "./styles.css";

const DEFAULT_DOMAIN = "worknot.classmethod.cf";
const DEFAULT_NOTION_URL =
  "https://succinct-scar-f20.notion.site/Sample-Web-Site-148f2fc322e74473a91fb4d90836e3ce";

function validDomain(domain: string): RegExpMatchArray | null {
  return domain.match(
    /^((https:\/\/)|(http:\/\/))?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+(\/)?$/
  );
}

function validNotionUrl(url: string): boolean {
  if (!url) return true;
  try {
    const link = new URL(url);
    return (
      (link.hostname.endsWith("notion.so") || link.hostname.endsWith("notion.site")) &&
      !!link.pathname.slice(-32).match(/[0-9a-f]{32}/)
    );
  } catch {
    return false;
  }
}

type SlugPair = [string, string];

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

  const handleMyDomain = (e: ChangeEvent<HTMLInputElement>) => {
    setMyDomain(e.target.value);
    setCopied(false);
  };
  const handleNotionUrl = (e: ChangeEvent<HTMLInputElement>) => {
    setNotionUrl(e.target.value);
    setCopied(false);
  };
  const handlePageTitle = (e: ChangeEvent<HTMLInputElement>) => {
    setPageTitle(e.target.value);
    setCopied(false);
  };
  const handlePageDescription = (e: ChangeEvent<HTMLInputElement>) => {
    setPageDescription(e.target.value);
    setCopied(false);
  };
  const handleGoogleFont = (e: ChangeEvent<HTMLInputElement>) => {
    setGoogleFont(e.target.value);
    setCopied(false);
  };
  const handleCustomScript = (e: ChangeEvent<HTMLInputElement>) => {
    setCustomScript(e.target.value);
    setCopied(false);
  };
  const handleCustomCss = (e: ChangeEvent<HTMLInputElement>) => {
    setCustomCss(e.target.value);
    setCopied(false);
  };
  const addSlug = () => {
    setSlugs([...slugs, ["", ""]]);
    setCopied(false);
  };
  const deleteSlug = (index: number) => {
    setSlugs([...slugs.slice(0, index), ...slugs.slice(index + 1)]);
    setCopied(false);
  };
  const handleCustomURL = (value: string, index: number) => {
    setSlugs([
      ...slugs.slice(0, index),
      [value, slugs[index][1]],
      ...slugs.slice(index + 1)
    ]);
    setCopied(false);
  };
  const handleNotionPageURL = (value: string, index: number) => {
    setSlugs([
      ...slugs.slice(0, index),
      [slugs[index][0], value],
      ...slugs.slice(index + 1)
    ]);
    setCopied(false);
  };
  const handleOptional = () => {
    setOptional(!optional);
  };

  const handleImageOption = (target: EventTarget & (HTMLInputElement | HTMLTextAreaElement)) => {
    let formValue: string | number = target.value;
    const name = target.name as keyof ImageOptions;

    if (name === 'imageResizeType') {
      setOptionalImageResize(target.value === 'resize');
    } else if (name === 'imageQuality') {
      const num = Number(formValue);
      if (num > 100) formValue = 100;
      if (num < 0) formValue = 1;
    } else if (name === 'imageBlur') {
      const num = Number(formValue);
      if (num > 250) formValue = 250;
      if (num < 0) formValue = 0;
    }

    setOptionImage({ ...optionImage, [name]: formValue });
    setCopied(false);
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const name = e.target.name as keyof ImageOptions;
    setOptionImage({ ...optionImage, [name]: e.target.value });
    setCopied(false);
  };

  const domain = myDomain || DEFAULT_DOMAIN;
  const url = notionUrl || DEFAULT_NOTION_URL;
  const myDomainHelperText = !validDomain(domain)
    ? "Please enter a valid domain"
    : undefined;
  const notionUrlHelperText = !validNotionUrl(notionUrl)
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

  const copy = () => {
    if (!noError || !textarea.current) return;
    textarea.current.select();
    document.execCommand("copy");
    setCopied(true);
  };

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
          onClick={copy}
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
