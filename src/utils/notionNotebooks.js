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
  const coverFrontUrl = parseNotionProperty(
    getProperty(properties, 'cover_front_url', 'cover front url', 'Cover Front URL')
  );
  const coverBackUrl = parseNotionProperty(
    getProperty(properties, 'cover_back_url', 'cover back url', 'Cover Back URL')
  );
  const pdfUrl = parseNotionProperty(getProperty(properties, 'pdf_url', 'PDF URL', 'pdf url'));

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
