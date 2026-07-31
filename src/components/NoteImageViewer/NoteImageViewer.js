/**
 * NoteImageViewer
 * Cloudinary에 페이지별 이미지로 업로드된 노트 뷰어.
 * pdf_folder_url(폴더 base URL) + page_count로 페이지 이미지 URL을 조립해
 * 한 번에 한 페이지(또는 양면)씩 표시합니다.
 * - 모달: Jukebox에서 노트 클릭 시
 * - 전체 페이지: /note/:id 경로
 *
 * pdf_folder_url이 비어 있는 노트는 기존 PDF 뷰어(PdfModal)로 폴백합니다.
 */

import { getNotionNotebooks } from '../../services/notionNotebooks.js';
import { getNotionTypeItems } from '../../services/notionByType.js';
import { renderPdfViewer } from '../PdfModal/PdfModal.js';
import { render as renderButton } from '../Button/Button.js';
import { showToast } from '../Toast/Toast.js';
import {
  computeNoteDisplayBoxes,
  fitAspectBox,
  isLandscapeSpread
} from '../../utils/noteSize.js';
import { buildPageImageUrl } from '../../services/pages.js';
import { openPageMetaModal } from '../AddPageModal/PageMetaModal.js';
import '../Button/Button.css';
/* 뷰어 레이아웃(.pdf-viewer/.pdf-canvas-wrap/.pdf-overlay 등) 스타일 재사용 */
import '../PdfModal/PdfModal.css';
import './NoteImageViewer.css';

export { buildPageImageUrl };

const LOADING_LOTTIE =
  'https://lottie.host/ac9f0d95-b144-482c-a2d4-fb707e069f94/lHcmDqwHwt.lottie';

/** 현재 페이지 기준 앞뒤로 미리 로드할 페이지 수 */
const PRELOAD_RADIUS = 2;

const ICONS = {
  arrowsLeftLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><title>arrows_left_line</title><g id='arrows_left_line' fill='none' fill-rule='evenodd'><path d='M24 0v24H0V0h24ZM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036c-.01-.003-.019 0-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.016-.018Zm.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01-.184-.092Z'/><path fill='currentColor' d='M11.707 6.293a1 1 0 0 1 0 1.414L7.414 12l4.293 4.293a1 1 0 0 1-1.414 1.414l-5-5a1 1 0 0 1 0-1.414l5-5a1 1 0 0 1 1.414 0Zm6 0a1 1 0 0 1 0 1.414L13.414 12l4.293 4.293a1 1 0 0 1-1.414 1.414l-5-5a1 1 0 0 1 0-1.414l5-5a1 1 0 0 1 1.414 0Z'/></g></svg>",
  arrowsRightLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><title>arrows_right_line</title><g id='arrows_right_line' fill='none' fill-rule='evenodd'><path d='M24 0v24H0V0h24ZM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036c-.01-.003-.019 0-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.016-.018Zm.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01-.184-.092Z'/><path fill='currentColor' d='M9.707 11.293a1 1 0 0 1 0 1.414l-5.657 5.657a1 1 0 1 1-1.414-1.414l4.95-4.95-4.95-4.95a1 1 0 0 1 1.414-1.414l5.657 5.657Zm6 0a1 1 0 0 1 0 1.414l-5.657 5.657a1 1 0 1 1-1.414-1.414l4.95-4.95-4.95-4.95a1 1 0 0 1 1.414-1.414l5.657 5.657Z'/></g></svg>",
  leftLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><title>left_line</title><g id='left_line' fill='none' fill-rule='evenodd'><path d='M24 0v24H0V0h24ZM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018Zm.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01-.184-.092Z'/><path fill='currentColor' d='M8.293 12.707a1 1 0 0 1 0-1.414l5.657-5.657a1 1 0 1 1 1.414 1.414L10.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414l-5.657-5.657Z'/></g></svg>",
  bookOpen:
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><title>book_open</title><g fill='none'><path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/><path fill='currentColor' d='M12 2c.912 0 1.758.482 2.214 1.192C15.548 3.622 17.081 4 18.5 4c1.168 0 2.302-.258 3.295-.728.45-.212.705-.279.876-.287A1 1 0 0 1 24 4v13a1 1 0 0 1-.553.894c-.123.061-.27.106-.54.207-1.134.427-2.536.899-4.407.899-1.92 0-3.452-.378-4.714-1.192A3.022 3.022 0 0 1 12 18a3.022 3.022 0 0 1-1.786-.192C8.952 18.622 7.42 19 5.5 19c-1.871 0-3.273-.472-4.407-.9-.27-.1-.417-.145-.54-.206A1 1 0 0 1 0 17V4a1 1 0 0 1 1.33-.986c.17.008.425.075.875.287C3.198 3.742 4.332 4 5.5 4c1.419 0 2.952-.378 3.786-.808C9.742 2.482 10.588 2 11.5 2Zm0 2c-.088 0-.42.141-.886.442C10.298 5.122 8.581 6 5.5 6c-.832 0-1.61-.158-2.5-.442V16.5c1.121.358 2.29.5 3 .5 1.581 0 2.952-.378 3.786-.808.456-.3.788-.442.714-.442V4Zm2 0v11.75c-.074 0 .258.141.714.442C15.548 16.622 17.081 17 18.5 17c.71 0 1.879-.142 3-.5V5.558c-.89.284-1.668.442-2.5.442-3.081 0-4.798-.878-5.614-1.558C13.42 4.141 13.088 4 13 4Z'/></g></svg>",
  edit:
    "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' aria-hidden='true'><path stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' d='M12.5 6.5l5 5M4 20l4.5-1.2L19.3 8a1.7 1.7 0 0 0-2.4-2.4L6.1 16.4 4 20z'/></svg>",
  info:
    "<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' aria-hidden='true'><circle cx='12' cy='12' r='9' stroke='currentColor' stroke-width='1.8'/><path stroke='currentColor' stroke-width='1.8' stroke-linecap='round' d='M12 11v6'/><circle cx='12' cy='7.5' r='1.1' fill='currentColor'/></svg>",
  resetView:
    "<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' aria-hidden='true'><path stroke='currentColor' stroke-width='1.8' stroke-linecap='round' d='M8 4H5a1 1 0 0 0-1 1v3M16 4h3a1 1 0 0 1 1 1v3M8 20H5a1 1 0 0 1-1-1v-3M16 20h3a1 1 0 0 0 1-1v-3'/><circle cx='12' cy='12' r='2.2' stroke='currentColor' stroke-width='1.8'/></svg>",
  trash:
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' aria-hidden='true'><path stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' d='M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2'/></svg>",
  eyeOff:
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' aria-hidden='true'><path stroke='currentColor' stroke-width='1.8' stroke-linecap='round' d='M3 3l18 18'/><path stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' d='M10.6 10.6a2 2 0 0 0 2.8 2.8M9.5 5.5C10.3 5.2 11.1 5 12 5c4.5 0 8.3 2.9 10 7-.5 1.2-1.2 2.3-2.1 3.2M6.1 6.1C4.5 7.2 3.2 8.7 2 12c1.7 4.1 5.5 7 10 7 1.2 0 2.3-.2 3.4-.6'/></svg>",
  plus:
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' aria-hidden='true'><path stroke='currentColor' stroke-width='1.8' stroke-linecap='round' d='M12 5v14M5 12h14'/></svg>"
};

/** folderUrl → Promise<Set<number>> (숨김 페이지 조회 캐시) */
const hiddenPagesCache = new Map();

/**
 * Cloudinary metadata의 visible=false 페이지 번호 목록 조회
 * 조회 실패 시 빈 Set을 반환해 기존처럼 전체 페이지를 노출합니다(fail-open).
 * @param {string} folderUrl - Cloudinary 폴더 base URL
 * @returns {Promise<Set<number>>}
 */
function fetchHiddenPages(folderUrl, { force = false } = {}) {
  const key = String(folderUrl || '').trim();
  if (!key) return Promise.resolve(new Set());
  if (!force && hiddenPagesCache.has(key)) return hiddenPagesCache.get(key);

  const qs = new URLSearchParams({ folder: key });
  if (force) qs.set('_', String(Date.now()));
  const promise = fetch(`/api/cloudinaryHiddenPages?${qs.toString()}`, {
    cache: force ? 'no-store' : 'default'
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      const list = Array.isArray(data?.hiddenPages) ? data.hiddenPages : [];
      return new Set(list.map(Number).filter((n) => Number.isFinite(n) && n > 0));
    })
    .catch(() => {
      hiddenPagesCache.delete(key);
      return new Set();
    });
  hiddenPagesCache.set(key, promise);
  return promise;
}

async function findNoteById(noteId) {
  const [notebookResult, typeResult] = await Promise.allSettled([
    getNotionNotebooks(),
    getNotionTypeItems()
  ]);
  const notebooks = notebookResult.status === 'fulfilled' ? notebookResult.value : [];
  const typeItems = typeResult.status === 'fulfilled' ? typeResult.value : [];
  return (
    (notebooks || []).find((note) => note.id === noteId) ||
    (typeItems || []).find((note) => note.id === noteId) ||
    null
  );
}

/**
 * 페이지 이미지 뷰어를 targetEl에 렌더링합니다.
 * @param {HTMLElement} targetEl - 렌더 대상
 * @param {string} id - 노트 ID
 * @param {Object} options - { mode, pdfFolderUrl?, pageCount?, size? }
 * @returns {Function} cleanup 함수
 */
export function renderNoteImageViewer(targetEl, id, options = {}) {
  if (!targetEl) return null;

  const noteId = decodeURIComponent(String(id || '')).trim();
  const isModal = options.mode === 'modal';

  const viewerMarkup = `
    <section class="pdf-viewer${isModal ? ' pdf-viewer--modal' : ''} note-image-viewer">
      <div class="pdf-canvas-wrap">
        ${renderButton({ variant: 'navPrev', ariaLabel: '이전 페이지', content: ICONS.leftLine, className: 'niv-nav-prev' })}
        ${renderButton({ variant: 'navNext', ariaLabel: '다음 페이지', content: ICONS.leftLine, className: 'niv-nav-next' })}
        <div class="niv-bottom-sheet" role="toolbar" aria-label="페이지 도구">
          <button type="button" class="niv-sheet-btn niv-page-info" aria-label="페이지 정보(메타데이터) 보기" title="페이지 정보">
            ${ICONS.info}
          </button>
          <div class="niv-sheet-progress">
            <button type="button" class="niv-sheet-nav niv-nav-first" aria-label="처음 페이지">${ICONS.arrowsLeftLine}</button>
            <button
              type="button"
              class="niv-sheet-progress__label"
              aria-label="페이지 메뉴 (길게 누르기)"
              aria-expanded="false"
              aria-controls="niv-fan-menu"
              title="길게 눌러 페이지 메뉴"
              data-fan-trigger
            >
              <span class="niv-current-page">1</span>
              <span class="niv-sheet-progress__sep">/</span>
              <span class="niv-total-pages">-</span>
            </button>
            <button type="button" class="niv-sheet-nav niv-nav-last" aria-label="마지막 페이지">${ICONS.arrowsRightLine}</button>
          </div>
          <button type="button" class="niv-sheet-btn niv-reset-view" aria-label="뷰 원상복구" title="처음 크기와 위치로">
            ${ICONS.resetView}
          </button>
        </div>
        <div class="niv-fan" id="niv-fan-menu" hidden aria-hidden="true">
          <button type="button" class="niv-fan__backdrop" data-fan-close aria-label="메뉴 닫기"></button>
          <div class="niv-fan__panel" role="menu" aria-label="페이지 액션">
            <span class="niv-fan__origin" aria-hidden="true"></span>
            <button type="button" class="niv-fan__item" role="menuitem" data-fan-action="delete" style="--i:0;--angle:-54" aria-label="페이지 삭제">
              <span class="niv-fan__label">페이지<br />삭제</span>
            </button>
            <button type="button" class="niv-fan__item" role="menuitem" data-fan-action="hide" style="--i:1;--angle:-18" aria-label="페이지 숨기기">
              <span class="niv-fan__label">페이지<br />숨기기</span>
            </button>
            <button type="button" class="niv-fan__item" role="menuitem" data-fan-action="add" style="--i:2;--angle:18" aria-label="페이지 추가">
              <span class="niv-fan__label">페이지<br />추가</span>
            </button>
            <button type="button" class="niv-fan__item" role="menuitem" data-fan-action="meta" style="--i:3;--angle:54" aria-label="메타데이터 수정">
              <span class="niv-fan__label">메타데이터<br />수정</span>
            </button>
          </div>
        </div>
        <button type="button" class="niv-toggle-spread niv-spread-fab" aria-label="양면 보기 전환" title="양면 보기" aria-pressed="false">
          ${ICONS.bookOpen}
        </button>
        <div class="niv-image-container">
          <div class="niv-zoom-stage">
            <img class="niv-page-image niv-page-image--left" alt="" draggable="false" referrerpolicy="no-referrer" />
            <img class="niv-page-image niv-page-image--right" alt="" draggable="false" referrerpolicy="no-referrer" />
          </div>
        </div>
        <div class="pdf-overlay show niv-overlay">
          <dotlottie-wc class="pdf-overlay-lottie" src="${LOADING_LOTTIE}" style="width: 300px; height: 300px" autoplay loop></dotlottie-wc>
          <div class="niv-overlay-text">노트 불러오는 중...</div>
        </div>
      </div>
    </section>
  `;

  targetEl.innerHTML = isModal
    ? viewerMarkup
    : `
      <div class="note-detail-page">
        <article class="note-detail">
          ${viewerMarkup}
        </article>
      </div>
    `;

  if (!isModal) {
    const pageEl = targetEl.querySelector('.note-detail-page');
    if (pageEl) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => pageEl.classList.add('note-detail-page--mounted'));
      });
    }
  }

  const viewerEl = targetEl.querySelector('.note-image-viewer');
  const canvasWrap = targetEl.querySelector('.pdf-canvas-wrap');
  const zoomStage = targetEl.querySelector('.niv-zoom-stage');
  const overlay = targetEl.querySelector('.niv-overlay');
  const overlayText = targetEl.querySelector('.niv-overlay-text');
  const imageLeft = targetEl.querySelector('.niv-page-image--left');
  const imageRight = targetEl.querySelector('.niv-page-image--right');
  const prevBtn = targetEl.querySelector('.niv-nav-prev');
  const nextBtn = targetEl.querySelector('.niv-nav-next');
  const firstBtn = targetEl.querySelector('.niv-nav-first');
  const lastBtn = targetEl.querySelector('.niv-nav-last');
  const toggleSpreadBtn = targetEl.querySelector('.niv-toggle-spread');
  const pageInfoBtn = targetEl.querySelector('.niv-page-info');
  const resetViewBtn = targetEl.querySelector('.niv-reset-view');
  const fanTrigger = targetEl.querySelector('[data-fan-trigger]');
  const fanMenu = targetEl.querySelector('.niv-fan');
  const fanBackdrop = targetEl.querySelector('.niv-fan__backdrop');
  const fanItems = targetEl.querySelectorAll('.niv-fan__item');
  let fanOpen = false;
  const FAN_LONG_PRESS_MS = 420;
  let fanPressTimer = null;
  let fanPressStart = null;
  const currentPageEl = targetEl.querySelector('.niv-current-page');
  const totalPagesEl = targetEl.querySelector('.niv-total-pages');

  let folderUrl = String(options.pdfFolderUrl || '').trim();
  /* page_count가 비어 있으면 null: 로드 실패 지점에서 마지막 페이지를 동적으로 확정 */
  let totalPages =
    Number.isFinite(Number(options.pageCount)) && Number(options.pageCount) > 0
      ? Math.floor(Number(options.pageCount))
      : null;
  const hasKnownPageCount = totalPages !== null;
  let noteSize = options.size || null;
  /** size 없을 때: 첫 1페이지 이미지 비율을 노트 전체에 고정 */
  let fallbackSingleAspect = null;

  let pageNum = 1;
  let ready = false;
  let isSpreadMode = false;
  let renderToken = 0;
  let viewScale = 1;
  let viewTx = 0;
  let viewTy = 0;
  const MIN_VIEW_SCALE = 0.5;
  const MAX_VIEW_SCALE = 4;
  /** Cloudinary metadata visible=false 페이지 번호 (뷰어에서 건너뜀) */
  let hiddenPages = new Set();
  /** pageNum → HTMLImageElement (preload 캐시) */
  const preloadedImages = new Map();
  /** 실제로 단페이지 두 장을 나란히 보여주는 중일 때만 true */
  let isPairing = false;

  function isSpreadAssetImage(sourceImg) {
    const nw = sourceImg?.naturalWidth || 0;
    const nh = sourceImg?.naturalHeight || 0;
    return isLandscapeSpread(nw, nh, noteSize);
  }

  /**
   * 이미지가 실제로 놓이는 컨테이너의 콘텐츠 영역(패딩 제외).
   * canvas-wrap 기준으로 잡으면 좌우 네비 패딩을 무시해 양면이 확대·잘린 것처럼 보인다.
   */
  function getContentBounds() {
    const el = targetEl.querySelector('.niv-image-container');
    if (!el) {
      const wrap = canvasWrap?.getBoundingClientRect();
      return wrap ? { width: wrap.width, height: wrap.height } : null;
    }
    const cs = getComputedStyle(el);
    const padX =
      (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY =
      (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    return {
      width: Math.max(0, el.clientWidth - padX),
      height: Math.max(0, el.clientHeight - padY)
    };
  }

  /**
   * 노트당 박스는 2종뿐: 1페이지 / 2페이지.
   * 2페이지 스캔은 항상 자연 비율로 컨테이너에 contain (처음엔 전체 노출).
   * half는 실제로 짝을 이룰 때만.
   */
  function applyImageFrame(img, sourceImg) {
    if (!img) return;
    const nw = sourceImg?.naturalWidth || img.naturalWidth || 0;
    const nh = sourceImg?.naturalHeight || img.naturalHeight || 0;
    const spreadAsset = isLandscapeSpread(nw, nh, noteSize);

    if (!noteSize && !fallbackSingleAspect && nw > 0 && nh > 0) {
      fallbackSingleAspect = spreadAsset
        ? { width: nw / 2, height: nh }
        : { width: nw, height: nh };
    }

    const bounds = getContentBounds();
    const maxW = Math.max(80, bounds?.width || window.innerWidth);
    const maxH = Math.max(80, bounds?.height || window.innerHeight);

    /*
     * 2페이지 스캔: 노트 size 박스가 아니라 이미지 자체 비율로 맞춤.
     * 처음 진입 시 확대 없이 가로·세로 전체가 보이게 contain.
     */
    if (spreadAsset && nw > 0 && nh > 0) {
      const box = fitAspectBox(nw, nh, maxW, maxH);
      img.classList.add('niv-page-image--spread-asset');
      img.style.width = `${box.width}px`;
      img.style.height = `${box.height}px`;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';
      return;
    }

    img.classList.remove('niv-page-image--spread-asset');

    const boxes = computeNoteDisplayBoxes(noteSize, bounds, fallbackSingleAspect);
    const box = isPairing ? boxes.singleHalf : boxes.single;

    if (!box) {
      const fitted = nw > 0 && nh > 0 ? fitAspectBox(nw, nh, maxW, maxH) : null;
      if (fitted) {
        img.style.width = `${fitted.width}px`;
        img.style.height = `${fitted.height}px`;
      } else {
        img.style.width = 'auto';
        img.style.height = `${Math.min(maxH, maxW)}px`;
      }
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.objectFit = 'contain';
      return;
    }

    img.style.width = `${box.width}px`;
    img.style.height = `${box.height}px`;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
  }

  function refreshImageFrames() {
    if (imageLeft?.getAttribute('src')) applyImageFrame(imageLeft, imageLeft);
    if (
      isPairing &&
      imageRight?.getAttribute('src') &&
      imageRight.style.display !== 'none'
    ) {
      applyImageFrame(imageRight, imageRight);
    }
  }

  function applyViewTransform() {
    if (!zoomStage) return;
    zoomStage.style.transform = `translate3d(${viewTx}px, ${viewTy}px, 0) scale(${viewScale})`;
  }

  function setViewScale(next) {
    viewScale = Math.min(MAX_VIEW_SCALE, Math.max(MIN_VIEW_SCALE, next));
    if (viewScale <= 1.01) {
      viewTx = 0;
      viewTy = 0;
    }
    applyViewTransform();
  }

  /** 처음 크기·위치로 복구 */
  function resetViewTransform() {
    viewScale = 1;
    viewTx = 0;
    viewTy = 0;
    applyViewTransform();
  }

  function resetViewScale() {
    resetViewTransform();
  }

  function touchDistance(touches) {
    const [a, b] = touches;
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  function touchMidpoint(touches) {
    const [a, b] = touches;
    return {
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2
    };
  }

  /**
   * from부터 direction 방향으로 숨김이 아닌 첫 페이지 번호 반환 (없으면 null)
   * @param {number} from
   * @param {1|-1} direction
   */
  function findVisiblePage(from, direction) {
    let num = from;
    while (num >= 1 && (totalPages === null || num <= totalPages)) {
      if (!hiddenPages.has(num)) return num;
      num += direction;
    }
    return null;
  }

  /** 숨김 페이지를 제외한 현재 페이지의 표시 순번 */
  function visibleOrdinal(num) {
    let hiddenBefore = 0;
    hiddenPages.forEach((hidden) => {
      if (hidden <= num) hiddenBefore += 1;
    });
    return num - hiddenBefore;
  }

  /** 숨김 페이지를 제외한 전체 표시 페이지 수 (page_count 미확정 시 null) */
  function visibleTotal() {
    if (totalPages === null) return null;
    let hiddenCount = 0;
    hiddenPages.forEach((hidden) => {
      if (hidden <= totalPages) hiddenCount += 1;
    });
    return totalPages - hiddenCount;
  }

  function showOverlay(message) {
    if (overlayText) overlayText.textContent = message;
    overlay?.classList.add('show');
  }

  function hideOverlay() {
    overlay?.classList.remove('show');
  }

  /** 양면 모드라도 스캔본·짝 없음이면 파일 1장씩 이동 */
  function navigationStep() {
    return isSpreadMode && isPairing ? 2 : 1;
  }

  function updateControls() {
    const step = navigationStep();
    const atFirst = findVisiblePage(pageNum - 1, -1) === null;
    const nextTarget = (() => {
      let n = pageNum;
      for (let i = 0; i < step; i += 1) {
        n = findVisiblePage(n + 1, 1);
        if (n === null) return null;
      }
      return n;
    })();
    const atLast = totalPages !== null && nextTarget === null && findVisiblePage(pageNum + 1, 1) === null;

    prevBtn.disabled = !ready || atFirst;
    /* 마지막 페이지: 시각적으로 disabled, 클릭 시 토스트를 위해 disabled 속성은 쓰지 않음 */
    nextBtn.disabled = !ready;
    nextBtn.classList.toggle('is-at-end', ready && atLast);
    nextBtn.setAttribute('aria-disabled', ready && atLast ? 'true' : 'false');
    firstBtn.disabled = !ready || atFirst;
    lastBtn.disabled = !ready || totalPages === null || atLast;

    const total = visibleTotal();
    const leftOrd = visibleOrdinal(pageNum);
    if (isPairing) {
      const rightNum = findVisiblePage(pageNum + 1, 1);
      if (rightNum !== null) {
        currentPageEl.textContent = `${leftOrd}-${visibleOrdinal(rightNum)}`;
      } else {
        currentPageEl.textContent = String(leftOrd);
      }
    } else {
      currentPageEl.textContent = String(leftOrd);
    }
    totalPagesEl.textContent = total !== null ? String(total) : '?';

    if (toggleSpreadBtn) {
      toggleSpreadBtn.style.opacity = isSpreadMode ? '1' : '0.6';
      toggleSpreadBtn.setAttribute('aria-pressed', isSpreadMode ? 'true' : 'false');
    }
    /* 실제로 두 장을 붙일 때만 양면 레이아웃 */
    viewerEl?.classList.toggle('spread-mode', isPairing);
  }

  function preloadPage(num) {
    if (num < 1 || (totalPages !== null && num > totalPages)) return null;
    if (preloadedImages.has(num)) return preloadedImages.get(num);
    const img = new Image();
    img.decoding = 'async';
    img.src = buildPageImageUrl(folderUrl, num);
    preloadedImages.set(num, img);
    return img;
  }

  /* lazy loading: 현재 페이지 앞뒤로 표시 가능한 PRELOAD_RADIUS장만 미리 로드 */
  function preloadAround(num) {
    let forward = num;
    let backward = num;
    for (let i = 0; i < PRELOAD_RADIUS; i += 1) {
      forward = forward === null ? null : findVisiblePage(forward + 1, 1);
      if (forward !== null) preloadPage(forward);
      backward = backward === null ? null : findVisiblePage(backward - 1, -1);
      if (backward !== null) preloadPage(backward);
    }
  }

  function isLoaded(img) {
    return img.complete && img.naturalWidth > 0;
  }

  function isFailed(img) {
    return img.complete && img.naturalWidth === 0;
  }

  function waitForImage(preImg) {
    return new Promise((resolve, reject) => {
      if (isLoaded(preImg)) {
        resolve(preImg);
        return;
      }
      if (isFailed(preImg)) {
        reject(new Error('load failed'));
        return;
      }
      preImg.addEventListener('load', () => resolve(preImg), { once: true });
      preImg.addEventListener('error', () => reject(new Error('load failed')), { once: true });
    });
  }

  function clearRightImage() {
    if (!imageRight) return;
    imageRight.removeAttribute('src');
    imageRight.alt = '';
    imageRight.style.opacity = '0';
    imageRight.style.display = 'none';
  }

  async function showPage(num) {
    pageNum = num;
    isPairing = false;
    viewerEl?.classList.remove('spread-mode');
    updateControls();
    const token = ++renderToken;
    const preLeft = preloadPage(num);
    if (!preLeft) return;

    imageLeft.style.opacity = '0.3';
    clearRightImage();
    showOverlay(`${num}페이지 불러오는 중...`);

    try {
      await waitForImage(preLeft);
      if (token !== renderToken) return;

      const leftIsSpreadAsset = isSpreadAssetImage(preLeft);

      /*
       * 2페이지 스캔본은 이미 양면이 들어 있으므로
       * 양면 모드여도 옆에 다른 장을 붙이지 않고 그 이미지 한 장만 표시한다.
       */
      let rightNum = null;
      let preRight = null;
      if (isSpreadMode && !leftIsSpreadAsset) {
        rightNum = findVisiblePage(num + 1, 1);
        preRight = rightNum !== null ? preloadPage(rightNum) : null;
        if (preRight) {
          try {
            await waitForImage(preRight);
            if (token !== renderToken) return;
            /* 오른쪽이 스캔본이면 짝짓지 않음 — 왼쪽 단페이지만 */
            if (isSpreadAssetImage(preRight)) {
              rightNum = null;
              preRight = null;
            }
          } catch {
            rightNum = null;
            preRight = null;
          }
        }
      }

      isPairing = Boolean(isSpreadMode && !leftIsSpreadAsset && rightNum !== null && preRight);
      viewerEl?.classList.toggle('spread-mode', isPairing);

      if (isPairing) {
        showOverlay(`${num}-${rightNum}페이지 불러오는 중...`);
      }

      imageLeft.src = preLeft.src;
      imageLeft.alt = leftIsSpreadAsset ? `노트 ${num}페이지 (양면)` : `노트 ${num}페이지`;
      imageLeft.style.opacity = '1';
      applyImageFrame(imageLeft, preLeft);

      if (isPairing && preRight && rightNum !== null) {
        imageRight.style.display = 'block';
        imageRight.src = preRight.src;
        imageRight.alt = `노트 ${rightNum}페이지`;
        imageRight.style.opacity = '1';
        applyImageFrame(imageRight, preRight);
      } else {
        clearRightImage();
      }

      hideOverlay();
      updateControls();
      /* 레이아웃·패딩 반영 후 한 번 더 맞춤 — 초기 확대/잘림 방지 */
      requestAnimationFrame(() => {
        resetViewScale();
        refreshImageFrames();
      });
      preloadAround(num);
      if (isPairing && rightNum !== null) preloadAround(rightNum);
    } catch {
      if (token !== renderToken) return;
      preloadedImages.delete(num);
      isPairing = false;
      /* page_count 미지정 시: 실패한 페이지 직전을 마지막 페이지로 확정 */
      if (!hasKnownPageCount && num > 1) {
        totalPages = num - 1;
        const lastVisible = findVisiblePage(totalPages, -1);
        if (lastVisible !== null) {
          showPage(lastVisible);
          return;
        }
      }
      showOverlay('페이지 이미지를 불러올 수 없습니다. pdf_folder_url을 확인해주세요.');
      console.error('Note page image load error:', buildPageImageUrl(folderUrl, num));
    }
  }

  function goToPage(num) {
    if (!ready || num === null || num < 1) return;
    if (totalPages !== null && num > totalPages) return;
    if (num === pageNum && !isSpreadMode) return;
    resetViewScale();
    showPage(num);
  }

  function stepPages(direction) {
    const step = navigationStep();
    let next = pageNum;
    for (let i = 0; i < step; i += 1) {
      const found = findVisiblePage(next + direction, direction);
      if (found === null) {
        if (i === 0) return;
        break;
      }
      next = found;
    }
    goToPage(next);
  }

  function toggleSpreadMode() {
    isSpreadMode = !isSpreadMode;
    resetViewScale();
    showPage(pageNum);
  }

  async function openCurrentPageMeta() {
    if (!folderUrl || !ready) {
      showToast('페이지를 불러온 뒤 편집할 수 있습니다');
      return;
    }
    openPageMetaModal({
      folder: folderUrl,
      pageNumber: pageNum,
      imageUrl: buildPageImageUrl(folderUrl, pageNum),
      onSaved: async (meta) => {
        hiddenPagesCache.delete(String(folderUrl || '').trim());
        hiddenPages = await fetchHiddenPages(folderUrl, { force: true });
        if (meta?.visible === false) {
          const next = findVisiblePage(pageNum + 1, 1) ?? findVisiblePage(pageNum - 1, -1);
          if (next == null) {
            ready = false;
            updateControls();
            showOverlay('표시할 수 있는 페이지가 없습니다.');
            return;
          }
          showPage(next);
          return;
        }
        showPage(pageNum);
      }
    });
  }

  function clearFanPress() {
    if (fanPressTimer) {
      window.clearTimeout(fanPressTimer);
      fanPressTimer = null;
    }
    fanPressStart = null;
  }

  function setFanOpen(open) {
    fanOpen = !!open;
    if (!fanMenu) return;
    viewerEl?.classList.toggle('niv-fan-open', fanOpen);
    if (fanOpen) {
      fanMenu.hidden = false;
      fanMenu.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => fanMenu.classList.add('is-open'));
      });
    } else {
      fanMenu.classList.remove('is-open');
      window.setTimeout(() => {
        if (!fanOpen) {
          fanMenu.hidden = true;
          fanMenu.setAttribute('aria-hidden', 'true');
        }
      }, 280);
    }
    fanTrigger?.setAttribute('aria-expanded', String(fanOpen));
  }

  function handleFanAction(action) {
    setFanOpen(false);
    if (action === 'meta') {
      openCurrentPageMeta();
      return;
    }
    const labels = {
      delete: '페이지 삭제',
      hide: '페이지 숨기기',
      add: '페이지 추가'
    };
    showToast(`${labels[action] || '해당'} 기능은 준비 중이에요`);
  }

  function bindFanLongPress(el) {
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      clearFanPress();
      fanPressStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      fanPressTimer = window.setTimeout(() => {
        fanPressTimer = null;
        fanPressStart = null;
        setFanOpen(true);
      }, FAN_LONG_PRESS_MS);
    });
    el.addEventListener('pointermove', (e) => {
      if (!fanPressStart || e.pointerId !== fanPressStart.id) return;
      const dx = e.clientX - fanPressStart.x;
      const dy = e.clientY - fanPressStart.y;
      if (Math.hypot(dx, dy) > 12) clearFanPress();
    });
    el.addEventListener('pointerup', clearFanPress);
    el.addEventListener('pointercancel', clearFanPress);
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  function startViewer() {
    const firstVisible = findVisiblePage(1, 1);
    if (firstVisible === null) {
      ready = false;
      updateControls();
      showOverlay('표시할 수 있는 페이지가 없습니다.');
      return;
    }
    ready = true;
    updateControls();
    showPage(firstVisible);
  }

  async function initViewer() {
    if (!folderUrl) {
      /* /note/:id 직접 진입: 노트 조회 후 뷰어 선택 */
      showOverlay('노트 불러오는 중...');
      const note = await findNoteById(noteId);
      if (note?.pdfFolderUrl) {
        folderUrl = String(note.pdfFolderUrl).trim();
        if (totalPages === null && note.pageCount) {
          totalPages = note.pageCount;
        }
        if (!noteSize && note.size) noteSize = note.size;
      } else if (note?.pdfUrl || !isModal) {
        /* 아직 마이그레이션 전(pdf_folder_url 없음): 기존 PDF 뷰어로 폴백 */
        cleanup();
        renderPdfViewer(targetEl, noteId, {
          mode: isModal ? 'modal' : 'page',
          pdfUrl: note?.pdfUrl,
          size: note?.size || noteSize
        });
        return;
      } else {
        showOverlay('노트 페이지 이미지를 찾을 수 없습니다. Notion의 pdf_folder_url을 확인해주세요.');
        return;
      }
    }
    /* Cloudinary metadata visible=false 페이지 목록 조회 후 시작 (실패 시 전체 노출) */
    hiddenPages = await fetchHiddenPages(folderUrl);
    startViewer();
  }

  prevBtn.addEventListener('click', () => stepPages(-1));
  nextBtn.addEventListener('click', () => {
    if (nextBtn.classList.contains('is-at-end') || nextBtn.getAttribute('aria-disabled') === 'true') {
      showToast('마지막 페이지입니다');
      return;
    }
    stepPages(1);
  });
  firstBtn.addEventListener('click', () => goToPage(findVisiblePage(1, 1)));
  lastBtn.addEventListener('click', () => {
    if (totalPages !== null) goToPage(findVisiblePage(totalPages, -1));
  });
  toggleSpreadBtn?.addEventListener('click', toggleSpreadMode);
  pageInfoBtn?.addEventListener('click', () => openCurrentPageMeta());
  bindFanLongPress(fanTrigger);
  fanBackdrop?.addEventListener('click', () => setFanOpen(false));
  fanItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      handleFanAction(item.getAttribute('data-fan-action'));
    });
  });
  resetViewBtn?.addEventListener('click', () => {
    resetViewTransform();
    refreshImageFrames();
  });

  const handleKeydown = (event) => {
    if (event.key === 'Escape' && fanOpen) {
      setFanOpen(false);
      return;
    }
    if (event.key === 'ArrowLeft') stepPages(-1);
    else if (event.key === 'ArrowRight') stepPages(1);
    else if (event.key === 's' || event.key === 'S') toggleSpreadMode();
    else if (event.key === '+' || event.key === '=') setViewScale(viewScale + 0.15);
    else if (event.key === '-') setViewScale(viewScale - 0.15);
    else if (event.key === '0') resetViewTransform();
  };
  document.addEventListener('keydown', handleKeydown);

  /* PC: 마우스 휠 확대/축소 */
  const handleWheel = (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.12 : 0.12;
    setViewScale(viewScale + delta);
  };
  canvasWrap?.addEventListener('wheel', handleWheel, { passive: false });

  /* 모바일: 핀치 줌 + 한 손가락 패닝(확대 시) */
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let pinchStartTx = 0;
  let pinchStartTy = 0;
  let pinchStartMid = null;
  let panStartX = 0;
  let panStartY = 0;
  let panOriginTx = 0;
  let panOriginTy = 0;
  let isPanning = false;

  const handleTouchStart = (event) => {
    if (event.touches.length === 2) {
      isPanning = false;
      pinchStartDist = touchDistance(event.touches);
      pinchStartScale = viewScale;
      pinchStartTx = viewTx;
      pinchStartTy = viewTy;
      pinchStartMid = touchMidpoint(event.touches);
    } else if (event.touches.length === 1 && viewScale > 1.02) {
      isPanning = true;
      panStartX = event.touches[0].clientX;
      panStartY = event.touches[0].clientY;
      panOriginTx = viewTx;
      panOriginTy = viewTy;
    } else {
      isPanning = false;
    }
  };
  const handleTouchMove = (event) => {
    if (event.touches.length === 2 && pinchStartDist) {
      event.preventDefault();
      const dist = touchDistance(event.touches);
      const mid = touchMidpoint(event.touches);
      const nextScale = Math.min(
        MAX_VIEW_SCALE,
        Math.max(MIN_VIEW_SCALE, pinchStartScale * (dist / pinchStartDist))
      );
      viewScale = nextScale;
      if (nextScale <= 1.01) {
        viewTx = 0;
        viewTy = 0;
      } else if (pinchStartMid) {
        /* 핀치 중심을 기준으로 약간 이동 */
        viewTx = pinchStartTx + (mid.x - pinchStartMid.x);
        viewTy = pinchStartTy + (mid.y - pinchStartMid.y);
      }
      applyViewTransform();
      return;
    }
    if (isPanning && event.touches.length === 1 && viewScale > 1.02) {
      event.preventDefault();
      const dx = event.touches[0].clientX - panStartX;
      const dy = event.touches[0].clientY - panStartY;
      viewTx = panOriginTx + dx;
      viewTy = panOriginTy + dy;
      applyViewTransform();
    }
  };
  const handleTouchEnd = (event) => {
    if (event.touches.length < 2) {
      pinchStartDist = 0;
      pinchStartMid = null;
    }
    if (event.touches.length === 0) {
      isPanning = false;
    }
  };
  canvasWrap?.addEventListener('touchstart', handleTouchStart, { passive: true });
  canvasWrap?.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvasWrap?.addEventListener('touchend', handleTouchEnd, { passive: true });
  canvasWrap?.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  let resizeTimer = null;
  const handleResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => refreshImageFrames(), 80);
  };
  window.addEventListener('resize', handleResize);

  function cleanup() {
    document.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('resize', handleResize);
    clearTimeout(resizeTimer);
    canvasWrap?.removeEventListener('wheel', handleWheel);
    canvasWrap?.removeEventListener('touchstart', handleTouchStart);
    canvasWrap?.removeEventListener('touchmove', handleTouchMove);
    canvasWrap?.removeEventListener('touchend', handleTouchEnd);
    canvasWrap?.removeEventListener('touchcancel', handleTouchEnd);
  }

  initViewer();
  return cleanup;
}

/**
 * /note/:id 라우트용: main-content에 전체 페이지로 렌더링
 * pdf_folder_url이 있으면 이미지 뷰어, 없으면 기존 PDF 뷰어로 폴백합니다.
 */
export function renderNoteDetailPage(id) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;
  renderNoteImageViewer(mainContent, id);
}
