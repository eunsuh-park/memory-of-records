/**
 * Notion 타입별 이미지 데이터 로딩 유틸
 */
import { parseNotionProperty } from './notion.js';

const cachedNotionTypeItems = {
  data: null,
  promise: null
};

function normalizePropertyKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function getProperty(properties, ...names) {
  for (const name of names) {
    if (properties?.[name]) return properties[name];
  }
  if (!properties) return null;
  const keys = Object.keys(properties);
  const normalizedMap = new Map(keys.map((key) => [normalizePropertyKey(key), key]));
  for (const name of names) {
    const normalized = normalizePropertyKey(name);
    const matchedKey = normalizedMap.get(normalized);
    if (matchedKey && properties[matchedKey]) return properties[matchedKey];
  }
  return null;
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

function extractPageCoverUrl(page) {
  const cover = page?.cover;
  if (!cover) return null;
  if (cover.type === 'external') return cover.external?.url || null;
  if (cover.type === 'file') return cover.file?.url || null;
  return null;
}

export function convertNotionPageToTypeItem(page) {
  const properties = page?.properties || {};
  const title =
    parseNotionProperty(getProperty(properties, '이름', 'Name', 'title', 'Title')) ||
    '제목 없음';
  const type =
    parseNotionProperty(
      getProperty(
        properties,
        'type',
        'Type',
        'notebook_type',
        'Notebook Type',
        'Notebook type',
        '노트 타입',
        '노트타입'
      )
    ) || title;
  const description = parseNotionProperty(
    getProperty(
      properties,
      'description',
      'Description',
      'desc',
      '설명',
      '메모',
      'note',
      'Note'
    )
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
    'front cover url',
    'cover',
    'Cover',
    'cover_url',
    'Cover URL',
    'cover image',
    'Cover Image',
    'image',
    'Image',
    'image_url',
    'Image URL',
    'thumbnail',
    'Thumbnail',
    '대표 이미지',
    '대표이미지',
    '썸네일',
    '표지',
    '표지 앞',
    '앞표지',
    '전면 표지',
    '커버',
    '커버 이미지'
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
    'back cover url',
    'back',
    'Back',
    '뒷표지',
    '표지 뒤',
    '후면 표지',
    'back cover',
    'back cover image'
  );
  const rawCoverFront = parseNotionProperty(coverFrontProperty);
  const rawCoverBack = parseNotionProperty(coverBackProperty);
  const coverFrontUrl = normalizeUrlValue(rawCoverFront) || normalizeUrlValue(extractPageCoverUrl(page));
  const coverBackUrl = normalizeUrlValue(rawCoverBack);
  const pdfUrl = normalizeUrlValue(
    parseNotionProperty(getProperty(properties, 'pdf_url', 'PDF URL', 'pdf url'))
  );

  return {
    id: page?.id || '',
    title,
    type,
    description,
    coverFrontUrl,
    coverBackUrl,
    pdfUrl
  };
}

export async function fetchNotionTypeItems() {
  const response = await fetch('/api/by-type/notion', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody?.message ||
      errorBody?.details?.message ||
      errorBody?.details?.error ||
      `요청 실패: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  const data = await response.json();
  const pages = Array.isArray(data?.results) ? data.results : [];
  return pages.map(convertNotionPageToTypeItem);
}

export async function getNotionTypeItems() {
  if (cachedNotionTypeItems.data) return cachedNotionTypeItems.data;
  if (cachedNotionTypeItems.promise) return cachedNotionTypeItems.promise;

  cachedNotionTypeItems.promise = fetchNotionTypeItems()
    .then((items) => {
      cachedNotionTypeItems.data = items;
      return items;
    })
    .catch((error) => {
      cachedNotionTypeItems.data = null;
      cachedNotionTypeItems.promise = null;
      throw error;
    });

  return cachedNotionTypeItems.promise;
}

export function getCachedNotionTypeItems() {
  return cachedNotionTypeItems.data || [];
}

