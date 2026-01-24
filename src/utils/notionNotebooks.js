/**
 * Notion 노트북 데이터 로딩 유틸
 */
import { parseNotionProperty } from './notion.js';

const NOTEBOOK_DB_ID = '2f1c337eb8b08038ba39ebc76bba8a0d';

const cachedNotionNotebooks = {
  data: null,
  promise: null
};

function getProperty(properties, ...names) {
  for (const name of names) {
    if (properties?.[name]) return properties[name];
  }
  return null;
}

function formatDateString(value) {
  if (!value) return '';
  const str = String(value);
  return str.includes('T') ? str.split('T')[0] : str;
}

function normalizeUrlValue(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeUrlValue(item);
      if (normalized) return normalized;
    }
    return null;
  }
  if (typeof value === 'object') {
    if (value.url) return normalizeUrlValue(value.url);
    if (value.external?.url) return value.external.url;
    if (value.file?.url) return value.file.url;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/https?:\/\/[^\s,]+/i);
    if (match) return match[0];
    const firstToken = trimmed.split(/[,\s]+/).find(Boolean);
    return firstToken || null;
  }
  return null;
}

function hasMultipleUrls(value) {
  if (!value || typeof value !== 'string') return false;
  const matches = value.match(/https?:\/\/[^\s,]+/gi);
  return Array.isArray(matches) && matches.length > 1;
}

function extractPageCoverUrl(page) {
  const cover = page?.cover;
  if (!cover) return null;
  if (cover.type === 'external') return cover.external?.url || null;
  if (cover.type === 'file') return cover.file?.url || null;
  return null;
}

export function convertNotionPageToNotebook(page) {
  const properties = page?.properties || {};
  const title = parseNotionProperty(getProperty(properties, 'title', 'Title')) || '제목 없음';
  const notebookType = parseNotionProperty(
    getProperty(properties, 'notebook_type', 'Notebook Type', 'Notebook type', 'Type')
  );
  const periodStart = formatDateString(
    parseNotionProperty(getProperty(properties, 'period_start', 'Period Start', 'period start'))
  );
  const periodEnd = formatDateString(
    parseNotionProperty(getProperty(properties, 'period_end', 'Period End', 'period end'))
  );
  const coverFrontProperty = getProperty(
    properties,
    'cover_front_url',
    'cover front url',
    'Cover Front URL',
    'cover_front',
    'Cover Front',
    'front_cover_url',
    'Front Cover URL',
    'front cover url'
  );
  const coverBackProperty = getProperty(
    properties,
    'cover_back_url',
    'cover back url',
    'Cover Back URL',
    'cover_back',
    'Cover Back',
    'back_cover_url',
    'Back Cover URL',
    'back cover url'
  );
  const rawCoverFront = parseNotionProperty(coverFrontProperty);
  const rawCoverBack = parseNotionProperty(coverBackProperty);
  if (hasMultipleUrls(rawCoverFront)) {
    console.warn(
      '[Notion] cover_front_url has multiple URLs:',
      title,
      rawCoverFront,
      coverFrontProperty
    );
  }
  if (hasMultipleUrls(rawCoverBack)) {
    console.warn(
      '[Notion] cover_back_url has multiple URLs:',
      title,
      rawCoverBack,
      coverBackProperty
    );
  }
  if (coverFrontProperty?.type && coverFrontProperty.type !== 'url') {
    console.warn(
      '[Notion] cover_front_url type mismatch:',
      title,
      coverFrontProperty.type,
      coverFrontProperty
    );
  }
  if (coverBackProperty?.type && coverBackProperty.type !== 'url') {
    console.warn(
      '[Notion] cover_back_url type mismatch:',
      title,
      coverBackProperty.type,
      coverBackProperty
    );
  }

  const coverFrontUrl =
    normalizeUrlValue(rawCoverFront) || normalizeUrlValue(extractPageCoverUrl(page));
  const coverBackUrl = normalizeUrlValue(rawCoverBack);
  const pdfUrl = normalizeUrlValue(
    parseNotionProperty(getProperty(properties, 'pdf_url', 'PDF URL', 'pdf url'))
  );

  return {
    id: page?.id || '',
    title,
    notebookType,
    periodStart,
    periodEnd,
    coverFrontUrl,
    coverBackUrl,
    pdfUrl
  };
}

export async function fetchNotionNotebooks() {
  const response = await fetch('/api/notebooks/notion', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody?.message || `요청 실패: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  const data = await response.json();
  const pages = Array.isArray(data?.results) ? data.results : [];
  return pages.map(convertNotionPageToNotebook);
}

export async function getNotionNotebooks() {
  if (cachedNotionNotebooks.data) return cachedNotionNotebooks.data;
  if (cachedNotionNotebooks.promise) return cachedNotionNotebooks.promise;

  cachedNotionNotebooks.promise = fetchNotionNotebooks()
    .then((notebooks) => {
      cachedNotionNotebooks.data = notebooks;
      return notebooks;
    })
    .catch((error) => {
      cachedNotionNotebooks.data = null;
      cachedNotionNotebooks.promise = null;
      throw error;
    });

  return cachedNotionNotebooks.promise;
}

export function getCachedNotionNotebooks() {
  return cachedNotionNotebooks.data || [];
}

export function getNotebookDbId() {
  return NOTEBOOK_DB_ID;
}
