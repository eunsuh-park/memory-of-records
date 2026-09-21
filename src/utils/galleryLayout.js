/**
 * Timeline / By Type 갤러리 레이아웃 토글
 * - localStorage 키: mor-gallery-layout
 * - 값: jukebox (Cover Flow) | grid (펼쳐 보기)
 * Favorites · Page Scrap은 항상 주크박스를 쓰고 이 설정을 읽지 않는다.
 */

const STORAGE_KEY = 'mor-gallery-layout';
const LAYOUTS = new Set(['jukebox', 'grid']);

export const GALLERY_LAYOUT_EVENT = 'mor:gallery-layout';

/**
 * @param {string} [path]
 * @returns {boolean}
 */
export function isGalleryLayoutPath(path) {
  const next = String(path || '');
  return next === '/' || next.startsWith('/timeline') || next.startsWith('/by-type');
}

/**
 * @param {'period'|'type'|'favorites'|'scrap'|string} filterMode
 * @returns {boolean}
 */
export function allowsGalleryLayout(filterMode) {
  return filterMode === 'period' || filterMode === 'type';
}

export function getStoredGalleryLayout() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (LAYOUTS.has(stored)) return stored;
  } catch {
    /* ignore */
  }
  return 'jukebox';
}

/**
 * @param {'period'|'type'|'favorites'|'scrap'|string} filterMode
 * @returns {'jukebox'|'grid'}
 */
export function galleryLayoutForFilter(filterMode) {
  if (!allowsGalleryLayout(filterMode)) return 'jukebox';
  return getStoredGalleryLayout();
}

/**
 * @param {'jukebox'|'grid'} layout
 * @returns {'jukebox'|'grid'}
 */
export function applyGalleryLayout(layout) {
  const next = layout === 'grid' ? 'grid' : 'jukebox';
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  if (typeof document !== 'undefined') {
    document.dispatchEvent(
      new CustomEvent(GALLERY_LAYOUT_EVENT, { detail: { layout: next } })
    );
  }
  return next;
}

export function toggleGalleryLayout() {
  return applyGalleryLayout(getStoredGalleryLayout() === 'grid' ? 'jukebox' : 'grid');
}
