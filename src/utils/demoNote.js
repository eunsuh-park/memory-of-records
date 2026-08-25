/**
 * 로컬 개발 전용 Demo Note
 *
 * Notion/Cloudinary 없이 노트 뷰어·3D 북플립을 확인한다.
 * 표지는 Bookmark Note와 같은 로컬 PNG, 본문은 흰 페이지 9장.
 * import.meta.env.DEV 에서만 갤러리에 붙이며 프로덕션 빌드에는 없다.
 */

import bookmarksCoverFront from '../assets/bookmarks-cover-front.png';
import bookmarksCoverBack from '../assets/bookmarks-cover-back.png';

export const DEMO_NOTE_ID = 'virtual:demo';
export const DEMO_NOTE_TITLE = 'Demo Note';
export const DEMO_PAGE_COUNT = 9;

/** 흰 페이지 캔버스 크기 — A5(148×210) 비율 */
const PAGE_WIDTH = 740;
const PAGE_HEIGHT = 1050;

/** @type {Array<{ pageNumber: number, url: string }>|null} */
let cachedPages = null;

export function isLocalDemoEnabled() {
  return Boolean(import.meta.env.DEV);
}

export function isDemoNoteId(id) {
  return String(id || '').trim() === DEMO_NOTE_ID;
}

function makeBlankPageUrl(pageNumber) {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.strokeStyle = '#e8ebe9';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, PAGE_WIDTH - 2, PAGE_HEIGHT - 2);
  ctx.fillStyle = '#868c8e';
  ctx.font = '600 120px Pretendard, "Pretendard Variable", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(pageNumber), PAGE_WIDTH / 2, PAGE_HEIGHT / 2);
  return canvas.toDataURL('image/png');
}

function demoPages() {
  if (cachedPages) return cachedPages;
  cachedPages = Array.from({ length: DEMO_PAGE_COUNT }, (_, index) => {
    const pageNumber = index + 1;
    return { pageNumber, url: makeBlankPageUrl(pageNumber) };
  });
  return cachedPages;
}

/**
 * @returns {object}
 */
export function createDemoNote() {
  const pages = demoPages();
  return {
    id: DEMO_NOTE_ID,
    title: DEMO_NOTE_TITLE,
    coverFrontUrl: bookmarksCoverFront,
    coverBackUrl: bookmarksCoverBack,
    pdfFolderUrl: null,
    pdfUrl: null,
    pageCount: DEMO_PAGE_COUNT,
    size: 'A5',
    description: '로컬 뷰어 테스트용 데모 노트 · 본문 9페이지',
    type: '다이어리',
    notebookType: 'Elementary School',
    color: null,
    favorites: false,
    visible: true,
    isVirtualDemo: true,
    pages
  };
}

/**
 * NoteImageViewer에 넘기는 옵션
 * @param {object} [note]
 */
export function demoNoteViewerOptions(note) {
  const demo = note?.pages ? note : createDemoNote();
  return {
    title: demo.title,
    note: demo,
    pages: demo.pages,
    pageCount: demo.pageCount,
    size: demo.size,
    coverFrontUrl: demo.coverFrontUrl,
    coverBackUrl: demo.coverBackUrl
  };
}
