/**
 * NoteImageViewer
 * Cloudinary에 페이지별 이미지로 업로드된 노트 뷰어.
 * pdf_folder_url(폴더 base URL) + page_count로 페이지 이미지 URL을 조립해
 * 한 번에 한 페이지씩 표시합니다. (이전/다음/처음/마지막 네비게이션 포함)
 * - 모달: Jukebox에서 노트 클릭 시
 * - 전체 페이지: /note/:id 경로
 *
 * pdf_folder_url이 비어 있는 노트는 기존 PDF 뷰어(PdfModal)로 폴백합니다.
 */

import { getNotionNotebooks } from '../../services/notionNotebooks.js';
import { getNotionTypeItems } from '../../services/notionByType.js';
import { renderPdfViewer } from '../PdfModal/PdfModal.js';
import { render as renderButton } from '../Button/Button.js';
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
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><title>left_line</title><g id='left_line' fill='none' fill-rule='evenodd'><path d='M24 0v24H0V0h24ZM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018Zm.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01-.184-.092Z'/><path fill='currentColor' d='M8.293 12.707a1 1 0 0 1 0-1.414l5.657-5.657a1 1 0 1 1 1.414 1.414L10.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414l-5.657-5.657Z'/></g></svg>"
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
 * @param {Object} options - { mode: 'modal' | 'page', pdfFolderUrl?: string, pageCount?: number }
 *   pdfFolderUrl 미전달 시 노트 ID로 조회하고, 그래도 없으면 기존 PDF 뷰어로 폴백합니다.
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
        <div class="niv-image-container">
          <img class="niv-page-image" alt="" draggable="false" referrerpolicy="no-referrer" />
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

  const overlay = targetEl.querySelector('.niv-overlay');
  const overlayText = targetEl.querySelector('.niv-overlay-text');
  const imageEl = targetEl.querySelector('.niv-page-image');
  const prevBtn = targetEl.querySelector('.niv-nav-prev');
  const nextBtn = targetEl.querySelector('.niv-nav-next');
  const firstBtn = targetEl.querySelector('.niv-nav-first');
  const lastBtn = targetEl.querySelector('.niv-nav-last');
  const currentPageEl = targetEl.querySelector('.niv-current-page');
  const totalPagesEl = targetEl.querySelector('.niv-total-pages');

  let folderUrl = String(options.pdfFolderUrl || '').trim();
  /* page_count가 비어 있으면 null: 로드 실패 지점에서 마지막 페이지를 동적으로 확정 */
  let totalPages =
    Number.isFinite(Number(options.pageCount)) && Number(options.pageCount) > 0
      ? Math.floor(Number(options.pageCount))
      : null;
  const hasKnownPageCount = totalPages !== null;

  let pageNum = 1;
  let ready = false;
  let renderToken = 0;
  /** Cloudinary metadata visible=false 페이지 번호 (뷰어에서 건너뜀) */
  let hiddenPages = new Set();
  /** pageNum → HTMLImageElement (preload 캐시) */
  const preloadedImages = new Map();

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
    const atFirst = findVisiblePage(pageNum - 1, -1) === null;
    const atLast = totalPages !== null && findVisiblePage(pageNum + 1, 1) === null;
    prevBtn.disabled = !ready || atFirst;
    nextBtn.disabled = !ready || atLast;
    firstBtn.disabled = !ready || atFirst;
    lastBtn.disabled = !ready || totalPages === null || atLast;
    const total = visibleTotal();
    currentPageEl.textContent = String(visibleOrdinal(pageNum));
    totalPagesEl.textContent = total !== null ? String(total) : '?';
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

  function showPage(num) {
    pageNum = num;
    updateControls();
    const token = ++renderToken;
    const preImg = preloadPage(num);
    if (!preImg) return;

    const onReady = () => {
      if (token !== renderToken) return;
      imageEl.src = preImg.src;
      imageEl.alt = `노트 ${num}페이지`;
      imageEl.style.opacity = '1';
      hideOverlay();
      updateControls();
      preloadAround(num);
    };
    const onFail = () => {
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
    };

    if (isLoaded(preImg)) {
      onReady();
      return;
    }
    if (isFailed(preImg)) {
      onFail();
      return;
    }
    imageEl.style.opacity = '0.3';
    showOverlay(`${num}페이지 불러오는 중...`);
    preImg.addEventListener('load', onReady, { once: true });
    preImg.addEventListener('error', onFail, { once: true });
  }

  function goToPage(num) {
    if (!ready || num === null || num < 1) return;
    if (totalPages !== null && num > totalPages) return;
    if (num === pageNum) return;
    showPage(num);
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
      } else if (note?.pdfUrl || !isModal) {
        /* 아직 마이그레이션 전(pdf_folder_url 없음): 기존 PDF 뷰어로 폴백 */
        cleanup();
        renderPdfViewer(targetEl, noteId, isModal ? { mode: 'modal', pdfUrl: note?.pdfUrl } : {});
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

  prevBtn.addEventListener('click', () => goToPage(findVisiblePage(pageNum - 1, -1)));
  nextBtn.addEventListener('click', () => goToPage(findVisiblePage(pageNum + 1, 1)));
  firstBtn.addEventListener('click', () => goToPage(findVisiblePage(1, 1)));
  lastBtn.addEventListener('click', () => {
    if (totalPages !== null) goToPage(findVisiblePage(totalPages, -1));
  });

  const handleKeydown = (event) => {
    if (event.key === 'ArrowLeft') goToPage(findVisiblePage(pageNum - 1, -1));
    else if (event.key === 'ArrowRight') goToPage(findVisiblePage(pageNum + 1, 1));
  };
  document.addEventListener('keydown', handleKeydown);

  function cleanup() {
    document.removeEventListener('keydown', handleKeydown);
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
