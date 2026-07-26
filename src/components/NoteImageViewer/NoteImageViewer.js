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
import { aspectRatioCss } from '../../utils/noteSize.js';
import '../Button/Button.css';
/* 뷰어 레이아웃(.pdf-viewer/.pdf-canvas-wrap/.pdf-overlay 등) 스타일 재사용 */
import '../PdfModal/PdfModal.css';
import './NoteImageViewer.css';

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
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><title>book_open</title><g fill='none'><path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/><path fill='currentColor' d='M12 2c.912 0 1.758.482 2.214 1.192C15.548 3.622 17.081 4 18.5 4c1.168 0 2.302-.258 3.295-.728.45-.212.705-.279.876-.287A1 1 0 0 1 24 4v13a1 1 0 0 1-.553.894c-.123.061-.27.106-.54.207-1.134.427-2.536.899-4.407.899-1.92 0-3.452-.378-4.714-1.192A3.022 3.022 0 0 1 12 18a3.022 3.022 0 0 1-1.786-.192C8.952 18.622 7.42 19 5.5 19c-1.871 0-3.273-.472-4.407-.9-.27-.1-.417-.145-.54-.206A1 1 0 0 1 0 17V4a1 1 0 0 1 1.33-.986c.17.008.425.075.875.287C3.198 3.742 4.332 4 5.5 4c1.419 0 2.952-.378 3.786-.808C9.742 2.482 10.588 2 11.5 2Zm0 2c-.088 0-.42.141-.886.442C10.298 5.122 8.581 6 5.5 6c-.832 0-1.61-.158-2.5-.442V16.5c1.121.358 2.29.5 3 .5 1.581 0 2.952-.378 3.786-.808.456-.3.788-.442.714-.442V4Zm2 0v11.75c-.074 0 .258.141.714.442C15.548 16.622 17.081 17 18.5 17c.71 0 1.879-.142 3-.5V5.558c-.89.284-1.668.442-2.5.442-3.081 0-4.798-.878-5.614-1.558C13.42 4.141 13.088 4 13 4Z'/></g></svg>"
};

/**
 * 페이지 이미지 URL 조립
 * `{pdf_folder_url}/page-{6자리 zero-padded 페이지 번호}.jpg`
 * @param {string} folderUrl - Cloudinary 폴더 base URL
 * @param {number} pageNumber - 1부터 시작하는 페이지 번호
 * @returns {string}
 */
export function buildPageImageUrl(folderUrl, pageNumber) {
  const base = String(folderUrl || '').trim().replace(/\/+$/, '');
  return `${base}/page-${String(pageNumber).padStart(6, '0')}.jpg`;
}

/** folderUrl → Promise<Set<number>> (숨김 페이지 조회 캐시) */
const hiddenPagesCache = new Map();

/**
 * Cloudinary metadata의 visible=false 페이지 번호 목록 조회
 * 조회 실패 시 빈 Set을 반환해 기존처럼 전체 페이지를 노출합니다(fail-open).
 * @param {string} folderUrl - Cloudinary 폴더 base URL
 * @returns {Promise<Set<number>>}
 */
function fetchHiddenPages(folderUrl) {
  const key = String(folderUrl || '').trim();
  if (!key) return Promise.resolve(new Set());
  if (hiddenPagesCache.has(key)) return hiddenPagesCache.get(key);

  const promise = fetch(`/api/cloudinaryHiddenPages?folder=${encodeURIComponent(key)}`)
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
        <div class="pdf-page-indicator">
          ${renderButton({ variant: 'toolbar', ariaLabel: '처음 페이지', content: ICONS.arrowsLeftLine, className: 'niv-nav-first' })}
          <span class="niv-current-page">1</span>/<span class="niv-total-pages">-</span>
          ${renderButton({ variant: 'toolbar', ariaLabel: '마지막 페이지', content: ICONS.arrowsRightLine, className: 'niv-nav-last' })}
        </div>
        <div class="pdf-zoom-controls">
          ${renderButton({ variant: 'toolbar', ariaLabel: '양면 보기 전환', content: ICONS.bookOpen, className: 'niv-toggle-spread' })}
        </div>
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

  let pageNum = 1;
  let ready = false;
  let isSpreadMode = false;
  let renderToken = 0;
  let viewScale = 1;
  const MIN_VIEW_SCALE = 0.5;
  const MAX_VIEW_SCALE = 4;
  /** Cloudinary metadata visible=false 페이지 번호 (뷰어에서 건너뜀) */
  let hiddenPages = new Set();
  /** pageNum → HTMLImageElement (preload 캐시) */
  const preloadedImages = new Map();

  function applyAspectRatio() {
    const css = aspectRatioCss(noteSize, false);
    [imageLeft, imageRight].forEach((img) => {
      if (!img) return;
      if (css) {
        img.style.setProperty('--niv-aspect', css);
        img.style.aspectRatio = css;
      } else {
        img.style.removeProperty('--niv-aspect');
        img.style.removeProperty('aspect-ratio');
      }
    });
  }

  function applyViewScale() {
    if (!zoomStage) return;
    zoomStage.style.transform = `scale(${viewScale})`;
  }

  function setViewScale(next) {
    viewScale = Math.min(MAX_VIEW_SCALE, Math.max(MIN_VIEW_SCALE, next));
    applyViewScale();
  }

  function resetViewScale() {
    viewScale = 1;
    applyViewScale();
  }

  function touchDistance(touches) {
    const [a, b] = touches;
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
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

  function updateControls() {
    const step = isSpreadMode ? 2 : 1;
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
    nextBtn.disabled = !ready || atLast;
    firstBtn.disabled = !ready || atFirst;
    lastBtn.disabled = !ready || totalPages === null || atLast;

    const total = visibleTotal();
    if (isSpreadMode) {
      const rightNum = findVisiblePage(pageNum + 1, 1);
      const leftOrd = visibleOrdinal(pageNum);
      if (rightNum !== null) {
        currentPageEl.textContent = `${leftOrd}-${visibleOrdinal(rightNum)}`;
      } else {
        currentPageEl.textContent = String(leftOrd);
      }
    } else {
      currentPageEl.textContent = String(visibleOrdinal(pageNum));
    }
    totalPagesEl.textContent = total !== null ? String(total) : '?';

    if (toggleSpreadBtn) {
      toggleSpreadBtn.style.opacity = isSpreadMode ? '1' : '0.6';
      toggleSpreadBtn.setAttribute('aria-pressed', isSpreadMode ? 'true' : 'false');
    }
    viewerEl?.classList.toggle('spread-mode', isSpreadMode);
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
    updateControls();
    const token = ++renderToken;
    const preLeft = preloadPage(num);
    if (!preLeft) return;

    const rightNum = isSpreadMode ? findVisiblePage(num + 1, 1) : null;
    const preRight = rightNum !== null ? preloadPage(rightNum) : null;

    imageLeft.style.opacity = '0.3';
    if (isSpreadMode && preRight) imageRight.style.opacity = '0.3';
    showOverlay(
      isSpreadMode && rightNum
        ? `${num}-${rightNum}페이지 불러오는 중...`
        : `${num}페이지 불러오는 중...`
    );

    try {
      await waitForImage(preLeft);
      if (token !== renderToken) return;

      imageLeft.src = preLeft.src;
      imageLeft.alt = `노트 ${num}페이지`;
      imageLeft.style.opacity = '1';
      applyAspectRatio();

      if (isSpreadMode && preRight && rightNum !== null) {
        try {
          await waitForImage(preRight);
          if (token !== renderToken) return;
          imageRight.style.display = 'block';
          imageRight.src = preRight.src;
          imageRight.alt = `노트 ${rightNum}페이지`;
          imageRight.style.opacity = '1';
        } catch {
          if (token !== renderToken) return;
          clearRightImage();
        }
      } else {
        clearRightImage();
      }

      hideOverlay();
      updateControls();
      preloadAround(num);
      if (rightNum !== null) preloadAround(rightNum);
    } catch {
      if (token !== renderToken) return;
      preloadedImages.delete(num);
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
    const step = isSpreadMode ? 2 : 1;
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

  function startViewer() {
    const firstVisible = findVisiblePage(1, 1);
    if (firstVisible === null) {
      ready = false;
      updateControls();
      showOverlay('표시할 수 있는 페이지가 없습니다.');
      return;
    }
    ready = true;
    applyAspectRatio();
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
  nextBtn.addEventListener('click', () => stepPages(1));
  firstBtn.addEventListener('click', () => goToPage(findVisiblePage(1, 1)));
  lastBtn.addEventListener('click', () => {
    if (totalPages !== null) goToPage(findVisiblePage(totalPages, -1));
  });
  toggleSpreadBtn?.addEventListener('click', toggleSpreadMode);

  const handleKeydown = (event) => {
    if (event.key === 'ArrowLeft') stepPages(-1);
    else if (event.key === 'ArrowRight') stepPages(1);
    else if (event.key === 's' || event.key === 'S') toggleSpreadMode();
    else if (event.key === '+' || event.key === '=') setViewScale(viewScale + 0.15);
    else if (event.key === '-') setViewScale(viewScale - 0.15);
    else if (event.key === '0') resetViewScale();
  };
  document.addEventListener('keydown', handleKeydown);

  /* PC: 마우스 휠 확대/축소 (비율 유지, 크롭 없음) */
  const handleWheel = (event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.12 : 0.12;
    setViewScale(viewScale + delta);
  };
  canvasWrap?.addEventListener('wheel', handleWheel, { passive: false });

  /* 모바일/타블렛: 두 손가락 핀치 줌 */
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  const handleTouchStart = (event) => {
    if (event.touches.length === 2) {
      pinchStartDist = touchDistance(event.touches);
      pinchStartScale = viewScale;
    }
  };
  const handleTouchMove = (event) => {
    if (event.touches.length !== 2 || !pinchStartDist) return;
    event.preventDefault();
    const dist = touchDistance(event.touches);
    setViewScale(pinchStartScale * (dist / pinchStartDist));
  };
  const handleTouchEnd = (event) => {
    if (event.touches.length < 2) {
      pinchStartDist = 0;
    }
  };
  canvasWrap?.addEventListener('touchstart', handleTouchStart, { passive: true });
  canvasWrap?.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvasWrap?.addEventListener('touchend', handleTouchEnd, { passive: true });
  canvasWrap?.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  function cleanup() {
    document.removeEventListener('keydown', handleKeydown);
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
