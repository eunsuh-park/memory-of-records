/**
 * Notion 타입별 이미지 데이터 로딩 유틸
 */
import { parseNotionProperty } from './notion.js';
import { isNotionPageVisible } from '../utils/noteVisibility.js';
import { parseNotionFavorites } from '../utils/noteFavorites.js';
import { attachNoteCovers, clearNoteCoversCache, fetchNoteCovers } from './noteCovers.js';

/** visibility → { data, promise } */
const cachedNotionTypeItems = new Map();

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

function formatDateString(value) {
  if (!value) return '';
  const str = String(value);
  return str.includes('T') ? str.split('T')[0] : str;
}

export function convertNotionPageToTypeItem(page) {
  const properties = page?.properties || {};
  const title =
    parseNotionProperty(getProperty(properties, '이름', 'Name', 'title', 'Title')) ||
    '제목 없음';
  /* notebook_type: typeOptions와 1:1 매칭 (다이어리, 플래너, 메모장, 스케치북, 학습/공부 노트 등) */
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
  const periodName =
    parseNotionProperty(
      getProperty(properties, 'period_name', 'Period Name', 'period name', 'Period', '시기')
    ) || '';
  const periodStart = formatDateString(
    parseNotionProperty(getProperty(properties, 'period_start', 'Period Start', 'period start'))
  );
  const periodEnd = formatDateString(
    parseNotionProperty(getProperty(properties, 'period_end', 'Period End', 'period end'))
  );
  const color =
    parseNotionProperty(getProperty(properties, 'color', 'Color', '색', '색상')) || '';
  const isKeptRaw = parseNotionProperty(
    getProperty(properties, 'is_kept', 'is kept', 'kept', '보관')
  );
  const isKept = isKeptRaw === null || isKeptRaw === undefined ? true : Boolean(isKeptRaw);
  const description = parseNotionProperty(
    getProperty(
      properties,
      'description',
      'Description',
      'notes',
      'Notes',
      'desc',
      '설명',
      '메모',
      'note',
      'Note'
    )
  );
  
  const rawPublicId = parseNotionProperty(
    getProperty(properties, 'public_id', 'Public ID', 'publicId', 'Public id')
  );
  const publicId =
    rawPublicId != null && String(rawPublicId).trim() ? String(rawPublicId).trim() : null;
    
  const pdfUrl = normalizeUrlValue(
    parseNotionProperty(getProperty(properties, 'pdf_url', 'PDF URL', 'pdf url'))
  );
  const rawPageCount = Number(
    parseNotionProperty(getProperty(properties, 'page_count', 'Page Count', 'page count'))
  );
  const pageCount =
    Number.isFinite(rawPageCount) && rawPageCount > 0 ? Math.floor(rawPageCount) : null;
  const size =
    parseNotionProperty(
      getProperty(properties, 'size', 'Size', '사이즈', '노트 사이즈', 'note_size', 'Note Size')
    ) || null;
  const visible = isNotionPageVisible(page);
  const favorites = parseNotionFavorites(page);

  return {
    id: page?.id || '',
    publicId,
    title,
    type,
    notebookType: type,
    periodName: periodName ? String(periodName).trim() : '',
    periodStart,
    periodEnd,
    color: color ? String(color).trim() : '',
    isKept,
    description: description != null && String(description).trim() ? String(description).trim() : null,
    coverFrontUrl: null,
    coverBackUrl: null,
    pdfUrl,
    pageCount,
    size: size != null && String(size).trim() ? String(size).trim() : null,
    visible,
    favorites
  };
}

/**
 * @param {{ visibility?: 'public'|'private'|'all' }} [options]
 */
export async function fetchNotionTypeItems(options = {}) {
  const visibility = options.visibility || 'public';
  const qs = `?view=type&visibility=${encodeURIComponent(visibility)}`;
  const response = await fetch(`/api/readNotebooks${qs}`, {
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

/**
 * @param {{ visibility?: 'public'|'private'|'all' }} [options]
 */
export async function getNotionTypeItems(options = {}) {
  const visibility = options.visibility || 'public';
  const cached = cachedNotionTypeItems.get(visibility) || { data: null, promise: null };

  if (cached.data) return cached.data;
  if (cached.promise) return cached.promise;

  cached.promise = Promise.all([
    fetchNotionTypeItems({ visibility }),
    fetchNoteCovers()
  ])
    .then(([items, covers]) => {
      const attached = attachNoteCovers(items, covers);
      cached.data = attached;
      cachedNotionTypeItems.set(visibility, cached);
      return attached;
    })
    .catch((error) => {
      cached.data = null;
      cached.promise = null;
      cachedNotionTypeItems.set(visibility, cached);
      throw error;
    });

  cachedNotionTypeItems.set(visibility, cached);
  return cached.promise;
}

export function getCachedNotionTypeItems(visibility = 'public') {
  return cachedNotionTypeItems.get(visibility)?.data || [];
}

/** 새 노트 추가 후 목록을 다시 불러오도록 캐시 비우기 */
export function clearNotionTypeItemsCache() {
  cachedNotionTypeItems.clear();
  clearNoteCoversCache();
}

