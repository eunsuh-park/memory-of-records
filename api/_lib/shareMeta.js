/**
 * 노트 공유 링크용 Open Graph / Twitter 메타
 * Notion에서 공개 노트를 찾아 제목·설명·표지 URL을 만든다.
 */

import { NOTEBOOK_DB_ID, notionFetch } from './notionDb.js';
import { noteOgImageProxyUrl } from './ogImage.js';
import { parseShareNotebook } from './shareNotebook.js';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  defaultOgImageUrl,
  formatNoteShareDescription,
  formatNoteShareTitle,
  siteOrigin
} from '../../src/data/siteMeta.js';
import { escapeHtml } from '../../src/utils/html.js';
import {
  SHARE_PAGE_QUERY,
  findNoteByRouteParam,
  notePath,
  normalizeSharePage
} from '../../src/utils/noteSlug.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const SHARE_META_RE = /<!--share-meta-->[\s\S]*?<!--\/share-meta-->/;

let notebookCache = { at: 0, notes: [] };

function firstQuery(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @returns {string}
 */
export function requestOrigin(req) {
  const proto = String(req?.headers?.['x-forwarded-proto'] || 'https')
    .split(',')[0]
    .trim();
  const host = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '')
    .split(',')[0]
    .trim();
  if (host) return `${proto}://${host}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return '';
}

function absoluteUrl(origin, path) {
  const base = String(origin || '').replace(/\/$/, '');
  const next = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${next}` : next;
}

/**
 * @param {string} origin
 */
export function siteDefaults(origin) {
  const url = origin ? `${origin.replace(/\/$/, '')}/` : '';
  return {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    ogDescription: SITE_TAGLINE,
    image: defaultOgImageUrl(),
    imageAlt: SITE_NAME,
    url
  };
}

async function fetchShareNotes() {
  const now = Date.now();
  if (notebookCache.notes.length && now - notebookCache.at < CACHE_TTL_MS) {
    return notebookCache.notes;
  }

  const results = [];
  let nextCursor = null;
  let hasMore = true;
  while (hasMore) {
    const data = await notionFetch(`/databases/${NOTEBOOK_DB_ID}/query`, {
      method: 'POST',
      body: nextCursor ? { start_cursor: nextCursor } : {}
    });
    results.push(...(Array.isArray(data?.results) ? data.results : []));
    hasMore = Boolean(data?.has_more);
    nextCursor = data?.next_cursor || null;
  }

  const notes = results.map(parseShareNotebook).filter(Boolean);
  notebookCache = { at: now, notes };
  return notes;
}

/**
 * 공개 노트만 slug/UUID로 찾는다.
 * @param {string} slug
 */
export async function findShareNoteBySlug(slug) {
  const raw = String(slug || '').trim();
  if (!raw) return null;
  const notes = await fetchShareNotes();
  const publicNotes = notes.filter((note) => note.visible !== false);
  return findNoteByRouteParam(publicNotes, raw) || null;
}

function slugFromRequest(req) {
  const direct = firstQuery(req?.query?.slug);
  if (direct) return direct;
  const path = firstQuery(req?.query?.path);
  const fromPath = path.match(/\/note\/([^/?#]+)/i);
  if (fromPath) return fromPath[1];
  return '';
}

/**
 * @param {import('@vercel/node').VercelRequest} req
 */
export async function resolveShareMeta(req) {
  const origin = requestOrigin(req);
  const defaults = siteDefaults(origin);
  const slug = slugFromRequest(req);
  const page = normalizeSharePage(
    firstQuery(req?.query?.[SHARE_PAGE_QUERY]) || firstQuery(req?.query?.p)
  );

  if (!slug) return defaults;

  let note = null;
  try {
    note = await findShareNoteBySlug(slug);
  } catch (err) {
    console.warn('shareMeta: Notion lookup failed', err);
    return defaults;
  }
  if (!note) return defaults;

  const path = notePath(note, page);
  const proxyImage = noteOgImageProxyUrl(siteOrigin() || origin, slug);
  return {
    title: formatNoteShareTitle(note.title, page),
    description: formatNoteShareDescription(note.description),
    ogDescription: formatNoteShareDescription(note.description),
    image: proxyImage || defaults.image,
    imageAlt: String(note.title || SITE_NAME),
    url: absoluteUrl(origin, path)
  };
}

/**
 * @param {ReturnType<typeof siteDefaults>} meta
 * @returns {string}
 */
export function renderShareMetaBlock(meta) {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const ogDescription = escapeHtml(meta.ogDescription || meta.description);
  const image = escapeHtml(meta.image);
  const imageAlt = escapeHtml(meta.imageAlt || meta.title);
  const url = meta.url ? escapeHtml(meta.url) : '';
  const lines = [
    `    <title>${title}</title>`,
    `    <meta name="description" content="${description}" />`,
    `    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `    <meta property="og:locale" content="ko_KR" />`,
    `    <meta property="og:type" content="website" />`,
    `    <meta property="og:title" content="${title}" />`,
    `    <meta property="og:description" content="${ogDescription}" />`,
    `    <meta property="og:image" content="${image}" />`,
    `    <meta property="og:image:secure_url" content="${image}" />`,
    `    <meta property="og:image:type" content="image/jpeg" />`,
    `    <meta property="og:image:width" content="1200" />`,
    `    <meta property="og:image:height" content="630" />`,
    `    <meta property="og:image:alt" content="${imageAlt}" />`,
    url ? `    <meta property="og:url" content="${url}" />` : '',
    url ? `    <link rel="canonical" href="${url}" />` : '',
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${title}" />`,
    `    <meta name="twitter:description" content="${ogDescription}" />`,
    `    <meta name="twitter:image" content="${image}" />`
  ];
  return lines.filter(Boolean).join('\n');
}

/**
 * index.html의 <!--share-meta--> 구간을 노트(또는 사이트 기본) 메타로 바꾼다.
 * @param {string} html
 * @param {ReturnType<typeof siteDefaults>} meta
 */
export function injectShareMeta(html, meta) {
  const block = `<!--share-meta-->\n${renderShareMetaBlock(meta)}\n    <!--/share-meta-->`;
  const source = String(html || '');
  if (SHARE_META_RE.test(source)) return source.replace(SHARE_META_RE, block);
  return source.replace(/<\/head>/i, `${block}\n  </head>`);
}
