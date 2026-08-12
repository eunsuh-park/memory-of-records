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
import { renderViewerChrome } from './ViewerChrome.js';
import {
  render as wrapInNoteDetailPage,
  mount as mountNoteDetailPage
} from '../NoteDetailPage/NoteDetailPage.js';
import { showToast } from '../Toast/Toast.js';
import {
  computeNoteDisplayBoxes,
  fitAspectBox,
  isLandscapeSpread
} from '../../utils/noteSize.js';
import { buildPageImageUrl, fetchPageMeta, updatePageMeta } from '../../services/pages.js';
import { getBookmarkedPages, clearBookmarkedPagesCache } from '../../services/bookmarkedPages.js';
import { openAddPageModal } from '../AddPageModal/AddPageModal.js';
import { openPageMetaModal } from '../AddPageModal/PageMetaModal.js';
import {
  BOOKMARKS_NOTE_TITLE,
  isBookmarksNoteId,
  createBookmarksNote
} from '../../utils/bookmarksNote.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import '../Button/Button.css';
/* 뷰어 레이아웃(.pdf-viewer/.pdf-canvas-wrap/.pdf-overlay 등) 스타일 재사용 */
import '../PdfModal/PdfModal.css';
import './NoteImageViewer.css';

export { buildPageImageUrl };

const LOADING_LOTTIE =
  'https://lottie.host/ac9f0d95-b144-482c-a2d4-fb707e069f94/lHcmDqwHwt.lottie';

/** 현재 페이지 기준 앞뒤로 미리 로드할 페이지 수 */
const PRELOAD_RADIUS = 2;

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
 * @param {Object} options - { mode, pdfFolderUrl?, pageCount?, size?, pages? }
 *   pages가 있으면 폴더 순회 대신 해당 URL 목록을 가상 앨범으로 표시 (북마크 노트)
 * @returns {Function} cleanup 함수
 */
export function renderNoteImageViewer(targetEl, id, options = {}) {
  if (!targetEl) return null;

  const noteId = decodeURIComponent(String(id || '')).trim();
  const isModal = options.mode === 'modal';
  const isBookmarksAlbum = isBookmarksNoteId(noteId) || Array.isArray(options.pages);

  const viewerMarkup = `
    <section class="pdf-viewer${isModal ? ' pdf-viewer--modal' : ''} note-image-viewer">
      <div class="pdf-canvas-wrap">
        ${renderViewerChrome()}
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

  targetEl.innerHTML = isModal ? viewerMarkup : wrapInNoteDetailPage(viewerMarkup);

  if (!isModal) mountNoteDetailPage(targetEl);

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
  const addPageBtn = targetEl.querySelector('.niv-add-page');
  const resetViewBtn = targetEl.querySelector('.niv-reset-view');
  const bookmarkBtns = [...targetEl.querySelectorAll('.niv-bookmark')];
  const currentPageEl = targetEl.querySelector('.niv-current-page');
  const totalPagesEl = targetEl.querySelector('.niv-total-pages');

  let folderUrl = String(options.pdfFolderUrl || '').trim();
  /** 가상 앨범(북마크): 1-based index → 원본 페이지 엔트리 */
  let albumPages = Array.isArray(options.pages)
    ? options.pages.filter((p) => p && (p.url || (p.folderUrl && p.pageNumber)))
    : null;
  let isAlbumMode = Array.isArray(albumPages);
  /* page_count가 비어 있으면 null: 로드 실패 지점에서 마지막 페이지를 동적으로 확정 */
  let totalPages = isAlbumMode
    ? albumPages.length
    : Number.isFinite(Number(options.pageCount)) && Number(options.pageCount) > 0
      ? Math.floor(Number(options.pageCount))
      : null;
  const hasKnownPageCount = totalPages !== null || isBookmarksAlbum;
  let noteSize = options.size || null;
  let noteTitle = String(
    options.title || options.noteTitle || (isBookmarksAlbum ? BOOKMARKS_NOTE_TITLE : '')
  ).trim();
  /** 중간 삽입 후 Cloudinary/브라우저 캐시 무효화용 */
  let mediaVersion = 0;
  /** size 없을 때: 첫 1페이지 이미지 비율을 노트 전체에 고정 */
  let fallbackSingleAspect = null;

  if ((isAlbumMode || isBookmarksAlbum) && addPageBtn) {
    addPageBtn.hidden = true;
    addPageBtn.setAttribute('aria-hidden', 'true');
  }

  function albumEntry(num) {
    if (!isAlbumMode || !Number.isFinite(num) || num < 1) return null;
    return albumPages[num - 1] || null;
  }

  /** 메타/북마크 API용: 앨범이면 원본 folder+page, 아니면 현재 노트 */
  function sourceRef(num = pageNum) {
    if (isAlbumMode) {
      const entry = albumEntry(num);
      if (!entry) return null;
      return {
        folder: String(entry.folderUrl || '').trim(),
        pageNumber: Math.floor(Number(entry.pageNumber) || 0)
      };
    }
    return {
      folder: folderUrl,
      pageNumber: num
    };
  }

  function pageImageSrc(num) {
    if (isAlbumMode) {
      const entry = albumEntry(num);
      if (!entry) return '';
      if (entry.url) {
        return mediaVersion ? `${entry.url}${entry.url.includes('?') ? '&' : '?'}v=${mediaVersion}` : entry.url;
      }
      const base = buildPageImageUrl(entry.folderUrl, entry.pageNumber);
      return mediaVersion ? `${base}?v=${mediaVersion}` : base;
    }
    const base = buildPageImageUrl(folderUrl, num);
    return mediaVersion ? `${base}?v=${mediaVersion}` : base;
  }

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
  /** pageNum → is_bookmarked */
  const bookmarkedByPage = new Map();
  let bookmarkRequestId = 0;
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
    bookmarkBtns.forEach((btn) => {
      btn.disabled = !ready;
    });
  }

  /**
   * favorites와 동일: mobile off만 line, 데스크톱·on은 fill
   * @param {boolean} value
   * @param {{ disabled?: boolean }} [opts]
   */
  function syncBookmarkButtons(value, { disabled = false } = {}) {
    const pressed = Boolean(value);
    const label = pressed ? '북마크 해제' : '북마크 추가';
    bookmarkBtns.forEach((btn) => {
      const isMobile = btn.classList.contains('niv-bookmark--mobile');
      btn.innerHTML = isMobile && !pressed ? MINGCUTE.bookmarkLine : MINGCUTE.bookmarkFill;
      btn.disabled = disabled || !ready;
      btn.classList.toggle('is-bookmarked', pressed);
      btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
  }

  async function refreshBookmarkState(num) {
    const ref = sourceRef(num);
    if (!ref?.folder || !ref.pageNumber) {
      syncBookmarkButtons(false);
      return;
    }
    /* 북마크 앨범에 들어온 페이지는 기본적으로 북마크된 상태 */
    if (isAlbumMode) {
      const value = bookmarkedByPage.has(num) ? Boolean(bookmarkedByPage.get(num)) : true;
      bookmarkedByPage.set(num, value);
      syncBookmarkButtons(value);
      return;
    }
    if (bookmarkedByPage.has(num)) {
      syncBookmarkButtons(bookmarkedByPage.get(num));
      return;
    }
    const requestId = ++bookmarkRequestId;
    try {
      const meta = await fetchPageMeta({ folder: ref.folder, page: ref.pageNumber });
      if (requestId !== bookmarkRequestId || pageNum !== num) return;
      const value = Boolean(meta?.is_bookmarked);
      bookmarkedByPage.set(num, value);
      syncBookmarkButtons(value);
    } catch (err) {
      console.warn('NoteImageViewer: 북마크 상태 조회 실패', err);
      if (requestId !== bookmarkRequestId || pageNum !== num) return;
      syncBookmarkButtons(false);
    }
  }

  async function removeAlbumPageAt(index1Based) {
    if (!isAlbumMode || !albumPages) return;
    albumPages = albumPages.filter((_, i) => i !== index1Based - 1);
    totalPages = albumPages.length;
    bookmarkedByPage.clear();
    preloadedImages.clear();
    clearBookmarkedPagesCache();
    if (totalPages === 0) {
      ready = false;
      updateControls();
      syncBookmarkButtons(false);
      showOverlay('북마크된 페이지가 없습니다.');
      return;
    }
    const next = Math.min(index1Based, totalPages);
    showPage(next);
  }

  async function toggleBookmark() {
    const ref = sourceRef(pageNum);
    if (!ready || !ref?.folder || !ref.pageNumber) {
      showToast('페이지를 불러온 뒤 북마크할 수 있습니다');
      return;
    }
    const current = bookmarkedByPage.has(pageNum)
      ? Boolean(bookmarkedByPage.get(pageNum))
      : isAlbumMode;
    const next = !current;
    const targetPage = pageNum;
    bookmarkedByPage.set(targetPage, next);
    syncBookmarkButtons(next, { disabled: true });

    try {
      await updatePageMeta({
        folder: ref.folder,
        pageNumber: ref.pageNumber,
        is_bookmarked: next
      });
      showToast(next ? '북마크에 추가했습니다' : '북마크를 해제했습니다');
      if (isAlbumMode && !next) {
        await removeAlbumPageAt(targetPage);
        return;
      }
    } catch (err) {
      console.warn('NoteImageViewer: 북마크 변경 실패', err);
      bookmarkedByPage.set(targetPage, current);
      if (pageNum === targetPage) syncBookmarkButtons(current, { disabled: false });
      showToast(err?.message || '북마크 변경에 실패했습니다.');
    } finally {
      if (pageNum === targetPage && !(isAlbumMode && !next)) {
        syncBookmarkButtons(Boolean(bookmarkedByPage.get(targetPage)), { disabled: false });
      }
    }
  }

  function preloadPage(num) {
    if (num < 1 || (totalPages !== null && num > totalPages)) return null;
    if (preloadedImages.has(num)) return preloadedImages.get(num);
    const img = new Image();
    img.decoding = 'async';
    img.src = pageImageSrc(num);
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
    void refreshBookmarkState(num);
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
      console.error('Note page image load error:', pageImageSrc(num));
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
    const ref = sourceRef(pageNum);
    if (!ref?.folder || !ready) {
      showToast('페이지를 불러온 뒤 확인할 수 있습니다');
      return;
    }
    openPageMetaModal({
      folder: ref.folder,
      pageNumber: ref.pageNumber,
      imageUrl: pageImageSrc(pageNum),
      onSaved: async (meta) => {
        if (isAlbumMode) {
          if (meta?.visible === false || meta?.is_bookmarked === false) {
            await removeAlbumPageAt(pageNum);
            return;
          }
          showPage(pageNum);
          return;
        }
        hiddenPagesCache.delete(String(ref.folder || '').trim());
        hiddenPages = await fetchHiddenPages(ref.folder, { force: true });
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

  async function refreshAfterPageInsert(result) {
    const nextFolder = String(result?.pdfFolderUrl || folderUrl || '').trim();
    const nextCount = Math.max(0, Math.floor(Number(result?.pageCount) || 0));
    if (nextFolder) folderUrl = nextFolder;
    if (nextCount > 0) totalPages = nextCount;
    mediaVersion = Date.now();
    preloadedImages.clear();
    bookmarkedByPage.clear();
    if (folderUrl) {
      hiddenPagesCache.delete(folderUrl);
      hiddenPages = await fetchHiddenPages(folderUrl, { force: true });
    }
    updateControls();
    const stayOn = findVisiblePage(pageNum, 1) ?? findVisiblePage(pageNum, -1);
    if (stayOn != null) showPage(stayOn);
    else startViewer();
  }

  async function openInsertPageModal() {
    if (isAlbumMode || isBookmarksAlbum) {
      showToast('북마크 모음에는 페이지를 추가할 수 없습니다.');
      return;
    }
    let title = noteTitle;
    if (!title || !folderUrl || totalPages == null) {
      const note = await findNoteById(noteId);
      if (note) {
        title = String(note.title || note.name || title || '').trim();
        noteTitle = title;
        if (!folderUrl && note.pdfFolderUrl) folderUrl = String(note.pdfFolderUrl).trim();
        if (totalPages == null && note.pageCount) totalPages = Math.floor(Number(note.pageCount));
      }
    }
    if (!title) {
      showToast('노트 정보가 없어 페이지를 추가할 수 없습니다.');
      return;
    }
    openAddPageModal({
      note: {
        id: noteId,
        title,
        pdfFolderUrl: folderUrl,
        pageCount: totalPages ?? 0
      },
      insertAfterPage: pageNum,
      onDone: (result) => {
        void refreshAfterPageInsert(result);
      }
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
    if (isBookmarksAlbum || isAlbumMode) {
      showOverlay('북마크 불러오는 중...');
      try {
        if (!isAlbumMode) {
          const pages = await getBookmarkedPages({ force: true });
          albumPages = Array.isArray(pages) ? pages : [];
          isAlbumMode = true;
        }
        totalPages = albumPages.length;
        noteTitle = noteTitle || BOOKMARKS_NOTE_TITLE;
        hiddenPages = new Set();
        if (!albumPages.length) {
          ready = false;
          updateControls();
          showOverlay('북마크된 페이지가 없습니다.');
          return;
        }
        startViewer();
      } catch (err) {
        console.warn('NoteImageViewer: 북마크 목록 로드 실패', err);
        showOverlay(err?.message || '북마크 페이지를 불러올 수 없습니다.');
      }
      return;
    }

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
        if (!noteTitle) noteTitle = String(note.title || note.name || '').trim();
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
  addPageBtn?.addEventListener('click', () => {
    void openInsertPageModal();
  });
  bookmarkBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      void toggleBookmark();
    });
  });
  resetViewBtn?.addEventListener('click', () => {
    resetViewTransform();
    refreshImageFrames();
  });

  const handleKeydown = (event) => {
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
  if (isBookmarksNoteId(id)) {
    renderNoteImageViewer(mainContent, id, {
      mode: 'page',
      title: BOOKMARKS_NOTE_TITLE,
      note: createBookmarksNote()
    });
    return;
  }
  renderNoteImageViewer(mainContent, id);
}
