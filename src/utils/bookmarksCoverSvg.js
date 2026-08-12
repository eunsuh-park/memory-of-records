/**
 * Bookmarks 가상 노트 표지 (플랫 SVG)
 * - 앞/뒤 직교 앵글
 * - 크래프트 라벨 + MoR 전용 마크
 * - 한글 색상명별 변형
 */

import {
  NOTE_COLOR_NAMES,
  NOTE_COLOR_SLUG,
  darkenHex,
  isLightNoteColor,
  resolveNoteColorPaint
} from './noteColorMap.js';

const STORAGE_KEY = 'mor.bookmarksCoverColor';
export const DEFAULT_BOOKMARKS_COVER_COLOR = '남색';

export function getBookmarksCoverColor() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && NOTE_COLOR_NAMES.includes(saved)) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_BOOKMARKS_COVER_COLOR;
}

export function setBookmarksCoverColor(colorName) {
  const { name } = resolveNoteColorPaint(colorName, DEFAULT_BOOKMARKS_COVER_COLOR);
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    /* ignore */
  }
  return name;
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function coverFill(colorName, paint) {
  if (colorName === '무지개') {
    return {
      defs: `
        <linearGradient id="coverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FF3B30"/>
          <stop offset="20%" stop-color="#FF9500"/>
          <stop offset="40%" stop-color="#FFCC00"/>
          <stop offset="60%" stop-color="#34C759"/>
          <stop offset="80%" stop-color="#2F6BFF"/>
          <stop offset="100%" stop-color="#AF52DE"/>
        </linearGradient>`,
      fill: 'url(#coverGrad)',
      edge: '#3a3a42'
    };
  }
  return {
    defs: '',
    fill: paint,
    edge: darkenHex(paint, 0.28)
  };
}

function inkFor(colorName) {
  return isLightNoteColor(colorName) || colorName === '노랑' ? '#1c1c1f' : '#f4f1ea';
}

/**
 * @param {'front'|'back'} face
 * @param {string} [colorName]
 * @returns {string} SVG markup
 */
export function buildBookmarksCoverSvg(face, colorName = getBookmarksCoverColor()) {
  const { name, paint } = resolveNoteColorPaint(colorName, DEFAULT_BOOKMARKS_COVER_COLOR);
  const { defs, fill, edge } = coverFill(name, paint);
  const ink = inkFor(name);
  const isBack = face === 'back';
  const slug = NOTE_COLOR_SLUG[name] || 'navy';

  /* 배경 + 반사면 위에 플랫 노트. 라벨·마크는 앞면에만 강하게. */
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" role="img" aria-label="${esc(
    isBack ? `Bookmarks back cover ${name}` : `Bookmarks front cover ${name}`
  )}">
  <defs>
    ${defs}
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#14161c"/>
      <stop offset="100%" stop-color="#0b0c10"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="42%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.12"/>
    </linearGradient>
    <pattern id="grain" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1.5" r="0.6" fill="#000" opacity="0.05"/>
      <circle cx="5.5" cy="4" r="0.5" fill="#fff" opacity="0.04"/>
      <circle cx="3" cy="6.5" r="0.45" fill="#000" opacity="0.04"/>
    </pattern>
    <filter id="softShadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <rect width="600" height="800" fill="url(#floor)"/>
  <ellipse cx="300" cy="730" rx="168" ry="18" fill="#000" opacity="0.35"/>

  <g filter="url(#softShadow)">
    <!-- 페이지 스택 (오른쪽 살짝) — 모인 북마크 느낌 -->
    <rect x="168" y="92" width="272" height="596" rx="10" fill="#efe6d6"/>
    <rect x="172" y="96" width="272" height="596" rx="10" fill="#e7dcc8"/>
    <rect x="176" y="100" width="272" height="596" rx="10" fill="#f3eadc"/>

    <!-- 표지 본체 (플랫) -->
    <rect x="140" y="88" width="280" height="600" rx="12" fill="${esc(fill)}" stroke="${esc(
      edge
    )}" stroke-width="1.2"/>
    <rect x="140" y="88" width="280" height="600" rx="12" fill="url(#sheen)"/>
    <rect x="140" y="88" width="280" height="600" rx="12" fill="url(#grain)"/>

    <!-- 좌측 디지털 스파인 슬릿 -->
    <rect x="156" y="108" width="3" height="560" rx="1.5" fill="${esc(ink)}" opacity="0.22"/>
    <rect x="163" y="108" width="1.5" height="560" rx="0.75" fill="${esc(ink)}" opacity="0.12"/>

    ${
      isBack
        ? `
    <!-- 뒷면: 미니 마크 + 미세 라벨 -->
    <g transform="translate(280 360)" opacity="0.9">
      <path d="M0-36 L18-10 L8-10 L8 36 L-8 36 L-8-10 L-18-10 Z" fill="${esc(
        ink
      )}" opacity="0.55"/>
      <circle cx="0" cy="-46" r="5" fill="${esc(ink)}" opacity="0.55"/>
    </g>
    <g transform="translate(214 620) rotate(-2)">
      <rect width="172" height="36" rx="4" fill="#efe2c8" stroke="#c9b496" stroke-width="1"/>
      <text x="86" y="23" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" fill="#3a342c" letter-spacing="0.08em">MoR · ${esc(
        slug
      )}</text>
    </g>`
        : `
    <!-- 앞면 전용 마크: 핀 + 접힌 리본 (오리지널) -->
    <g transform="translate(248 168)">
      <path d="M20 0 L40 34 L28 34 L28 96 L12 96 L12 34 L0 34 Z" fill="${esc(
        ink
      )}" opacity="0.88"/>
      <circle cx="20" cy="-10" r="9" fill="none" stroke="${esc(ink)}" stroke-width="3.2" opacity="0.9"/>
      <circle cx="20" cy="-10" r="3.2" fill="${esc(ink)}" opacity="0.9"/>
      <!-- 수집된 점들 -->
      <g fill="${esc(ink)}" opacity="0.55">
        <circle cx="64" cy="18" r="2.2"/>
        <circle cx="74" cy="28" r="2.2"/>
        <circle cx="68" cy="40" r="2.2"/>
        <circle cx="80" cy="48" r="2.2"/>
        <circle cx="72" cy="60" r="2.2"/>
      </g>
    </g>

    <!-- 크래프트 라벨 -->
    <g transform="translate(176 470) rotate(-3.5)">
      <rect x="0" y="0" width="208" height="78" rx="5" fill="#f0e2c4" stroke="#c8b08a" stroke-width="1.25"/>
      <rect x="8" y="8" width="192" height="62" rx="2" fill="none" stroke="#b89a6e" stroke-width="0.7" stroke-dasharray="3 2"/>
      <text x="104" y="36" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="22" font-weight="700" fill="#2c261f">Bookmarks</text>
      <text x="104" y="58" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="12" fill="#5a4f42" letter-spacing="0.14em">북마크 모음</text>
    </g>

    <!-- 작은 코너 스탬프 -->
    <g transform="translate(168 620)">
      <rect width="86" height="28" rx="3" fill="${esc(ink)}" opacity="0.14"/>
      <text x="43" y="18" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="10" fill="${esc(
        ink
      )}" opacity="0.8">★ COLLECT</text>
    </g>`
    }
  </g>
</svg>`;
}

const dataUrlCache = new Map();

export function bookmarksCoverDataUrl(face, colorName = getBookmarksCoverColor()) {
  const { name } = resolveNoteColorPaint(colorName, DEFAULT_BOOKMARKS_COVER_COLOR);
  const key = `${face}:${name}`;
  if (dataUrlCache.has(key)) return dataUrlCache.get(key);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    buildBookmarksCoverSvg(face, name)
  )}`;
  dataUrlCache.set(key, url);
  return url;
}

/** Vite가 번들한 색상별 SVG URL (scripts/generate-bookmarks-covers.mjs 산출물) */
const bundledCoverUrls = import.meta.glob('../assets/bookmarks-covers/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
});

/** path → filename 으로 재인덱싱 (Vite glob 키 형식 차이를 흡수) */
const bundledCoverByFile = Object.fromEntries(
  Object.entries(bundledCoverUrls).map(([path, url]) => {
    const file = String(path).split('/').pop();
    return [file, url];
  })
);

function bundledCoverUrl(face, colorName) {
  const { name } = resolveNoteColorPaint(colorName, DEFAULT_BOOKMARKS_COVER_COLOR);
  const slug = NOTE_COLOR_SLUG[name] || 'navy';
  return bundledCoverByFile[`${slug}-${face}.svg`] || null;
}

export function getBookmarksCoverUrls(colorName = getBookmarksCoverColor()) {
  const { name } = resolveNoteColorPaint(colorName, DEFAULT_BOOKMARKS_COVER_COLOR);
  return {
    color: name,
    coverFrontUrl: bundledCoverUrl('front', name) || bookmarksCoverDataUrl('front', name),
    coverBackUrl: bundledCoverUrl('back', name) || bookmarksCoverDataUrl('back', name)
  };
}

export { NOTE_COLOR_NAMES as BOOKMARKS_COVER_COLOR_NAMES };
