import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { createServer } from 'vite';

const ROOT = '11111111111111111111111111111111';
const CHAPTER = '22222222222222222222222222222222';
const OTHER = '33333333333333333333333333333333';
const dashed = (id) => id.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
let worker;
before(async () => {
  const vite = await createServer({ configFile: false, server: { middlewareMode: true, ws: false }, appType: 'custom', logLevel: 'error' });
  try {
    const { default: generate } = await vite.ssrLoadModule('/src/code.ts');
    const script = generate({
      myDomain: 'notes.example.com',
      notionUrl: `https://source-workspace.notion.site/${ROOT}`,
      slugs: [['chapter', `https://source-workspace.notion.site/${OTHER}`]],
      pageTitle: '', pageDescription: '', googleFont: '', customScript: '', customCss: '',
      optionImage: {}, pageMetadata: {}, structuredData: { enabled: false, schemaType: 'WebPage' },
      branding: {}, socialPreview: {}, seo: {}, analytics: {}, caching: { enabled: false },
      customHtml: {}, custom404: {}, subdomainRedirects: [], redirectRules: [],
      rss: { enabled: false }, i18n: { enabled: false, defaultLocale: 'en' },
      ogImageGeneration: { enabled: false },
    });
    ({ default: worker } = await import(`data:text/javascript;base64,${Buffer.from(script).toString('base64')}`));
  } finally {
    await vite.close();
  }
});

async function forward(t, body, referer, extraHeaders = {}, path = '/api/v3/getPublicPageData') {
  const upstream = t.mock.method(globalThis, 'fetch', async () => Response.json({ spaceDomain: 'source-workspace' }));
  const request = new Request('https://notes.example.com' + path, {
    method: 'POST',
    body: typeof body === 'string' || ArrayBuffer.isView(body) ? body : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(referer ? { Referer: referer } : {}), ...extraHeaders },
  });
  const response = await worker.fetch(request, {}, { waitUntil() {} });
  assert.equal(response.status, 200);
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
