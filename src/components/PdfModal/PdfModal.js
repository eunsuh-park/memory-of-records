/**
 * PdfModal
 * 노트 PDF 뷰어. 모달 또는 전체 페이지로 표시됩니다.
 * - 모달: Jukebox에서 노트 클릭 시
 * - 전체 페이지: /note/:id 경로
 */

import { getNotionNotebooks } from '../../services/notionNotebooks.js';
import { getNotionTypeItems } from '../../services/notionByType.js';
import {
  computeNoteDisplayBoxes,
  fitAspectBox,
  isLandscapeSpread
} from '../../utils/noteSize.js';
import { render as renderButton } from '../Button/Button.js';
import {
  render as wrapInNoteDetailPage,
  mount as mountNoteDetailPage
} from '../NoteDetailPage/NoteDetailPage.js';
import { showToast } from '../Toast/Toast.js';
import { findNoteByRouteParam } from '../../utils/noteSlug.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import '../Button/Button.css';
import './PdfModal.css';

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const PDF_LOADING_LOTTIE =
  'https://lottie.host/ac9f0d95-b144-482c-a2d4-fb707e069f94/lHcmDqwHwt.lottie';

let cachedTimelineNotes = null;
let cachedTimelineNotesPromise = null;

async function loadTimelineNotes() {
  if (cachedTimelineNotes) return cachedTimelineNotes;
  if (cachedTimelineNotesPromise) return cachedTimelineNotesPromise;

  cachedTimelineNotesPromise = getNotionNotebooks()
    .then((notes) => {
      cachedTimelineNotes = notes;
      return notes;
    })
    .catch((error) => {
      console.warn('노션 노트 목록 로드 실패:', error);
      cachedTimelineNotes = null;
      cachedTimelineNotesPromise = null;
      return [];
    });

  return cachedTimelineNotesPromise;
}

async function findNoteMetaById(noteId) {
  const [notebookResult, typeResult] = await Promise.allSettled([
    getNotionNotebooks(),
    getNotionTypeItems()
  ]);
  const notebooks = notebookResult.status === 'fulfilled' ? notebookResult.value : [];
  const typeItems = typeResult.status === 'fulfilled' ? typeResult.value : [];
  const notes = [...(notebooks || []), ...(typeItems || [])];
  return (
    findNoteByRouteParam(notes, noteId) ||
    notes.find((note) => note.id === noteId) ||
    null
  );
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('스크립트 로드 실패')));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    });
    script.addEventListener('error', () => reject(new Error('스크립트 로드 실패')));
    document.head.appendChild(script);
  });
}

async function ensurePdfJs() {
  if (window.pdfjsLib || window['pdfjs-dist/build/pdf']) {
    return;
  }
  await loadScript(PDFJS_CDN);
}

/**
 * PDF 뷰어를 targetEl에 렌더링합니다.
 * @param {HTMLElement} targetEl - 렌더 대상
 * @param {string} id - 노트 ID
 * @param {Object} options - { mode: 'modal' | 'page', pdfUrl?: string }
 * @returns {Function} cleanup 함수
 */
export function renderPdfViewer(targetEl, id, options = {}) {
  if (!targetEl) return null;

  const noteId = decodeURIComponent(String(id || '')).trim();
  const isModal = options.mode === 'modal';
  const preferredPdfUrl = options.pdfUrl || null;
  let noteSize = options.size || null;
  /** size 없을 때: 첫 1페이지 비율을 노트 전체에 고정 */
  let fallbackSingleAspect = null;
  /** 노트당 1페이지/2페이지 박스(px). resize 전까지 고정 → 페이지마다 동일 크기 */
  let lockedBoxes = null;

  const viewerMarkup = `
    <section class="pdf-viewer${isModal ? ' pdf-viewer--modal' : ''}">
      <div class="pdf-canvas-wrap">
        ${renderButton({ shape: 'circle', size: 'm', role: 'navPrev', ariaLabel: '이전 페이지', content: MINGCUTE.leftLine, className: 'pdf-nav-prev' })}
        ${renderButton({ shape: 'circle', size: 'm', role: 'navNext', ariaLabel: '다음 페이지', content: MINGCUTE.leftLine, className: 'pdf-nav-next' })}
        <div class="pdf-page-indicator">
          ${renderButton({ shape: 'circle', size: 's', role: 'toolbar', ariaLabel: '처음 페이지', content: MINGCUTE.arrowsLeftLine, className: 'pdf-nav-first' })}
          <span id="pdf-current-page">1</span>/<span id="pdf-total-pages">-</span>
          ${renderButton({ shape: 'circle', size: 's', role: 'toolbar', ariaLabel: '마지막 페이지', content: MINGCUTE.arrowsRightLine, className: 'pdf-nav-last' })}
        </div>
        <div class="pdf-zoom-controls">
          ${renderButton({ shape: 'circle', size: 's', role: 'toolbar', ariaLabel: '양면 보기 전환', content: MINGCUTE.bookOpenLine, className: 'pdf-toggle-spread' })}
          ${renderButton({ shape: 'circle', size: 's', role: 'toolbar', ariaLabel: '100% 비율로 초기화', content: MINGCUTE.refreshLine, className: 'pdf-zoom-reset' })}
          ${renderButton({ shape: 'circle', size: 's', role: 'toolbar', ariaLabel: '확대', content: MINGCUTE.zoomInLine, className: 'pdf-zoom-in' })}
          ${renderButton({ shape: 'circle', size: 's', role: 'toolbar', ariaLabel: '축소', content: MINGCUTE.zoomOutLine, className: 'pdf-zoom-out' })}
        </div>
        <div class="pdf-canvas-container">
          <canvas id="pdf-canvas-left"></canvas>
          <canvas id="pdf-canvas-right"></canvas>
        </div>
        <div id="pdf-overlay" class="pdf-overlay show">
          <dotlottie-wc class="pdf-overlay-lottie" src="${PDF_LOADING_LOTTIE}" style="width: 300px; height: 300px" autoplay loop></dotlottie-wc>
          <div id="pdf-overlay-text">PDF 목록 불러오는 중...</div>
        </div>
      </div>
    </section>
  `;

  targetEl.innerHTML = isModal ? viewerMarkup : wrapInNoteDetailPage(viewerMarkup);

  const unmountDetailPage = !isModal ? mountNoteDetailPage(targetEl) : null;

  const overlay = targetEl.querySelector('#pdf-overlay');
  const overlayText = targetEl.querySelector('#pdf-overlay-text');
  const canvasWrap = targetEl.querySelector('.pdf-canvas-wrap');
  const canvasLeft = targetEl.querySelector('#pdf-canvas-left');
  const canvasRight = targetEl.querySelector('#pdf-canvas-right');
  const canvasContainer = targetEl.querySelector('.pdf-canvas-container');
  const ctxLeft = canvasLeft.getContext('2d');
  const ctxRight = canvasRight.getContext('2d');
  const prevBtn = targetEl.querySelector('.pdf-nav-prev');
  const nextBtn = targetEl.querySelector('.pdf-nav-next');
  const firstBtn = targetEl.querySelector('.pdf-nav-first');
  const lastBtn = targetEl.querySelector('.pdf-nav-last');
  const currentPageEl = targetEl.querySelector('#pdf-current-page');
  const totalPagesEl = targetEl.querySelector('#pdf-total-pages');
  const toggleSpreadBtn = targetEl.querySelector('.pdf-toggle-spread');
  const zoomResetBtn = targetEl.querySelector('.pdf-zoom-reset');
  const zoomOutBtn = targetEl.querySelector('.pdf-zoom-out');
  const zoomInBtn = targetEl.querySelector('.pdf-zoom-in');

  let pdfDoc = null;
  let pageNum = 1;
  let pageRendering = false;
  let pageNumPending = null;
  const initialScale = 1.0;
  let scale = initialScale;
  let isSpreadMode = false;
  /** 실제로 단페이지 두 장을 나란히 보여주는 중일 때만 true */
  let isPairing = false;

  function getContentBounds() {
    const el = canvasContainer;
    if (!el) {
      const wrap = canvasWrap?.getBoundingClientRect();
      return wrap ? { width: wrap.width, height: wrap.height } : null;
    }
    const parent = el.parentElement; /* .pdf-canvas-wrap */
    const boxEl = parent || el;
    const cs = getComputedStyle(boxEl);
    const padX =
      (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY =
      (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    return {
      width: Math.max(0, boxEl.clientWidth - padX),
      height: Math.max(0, boxEl.clientHeight - padY)
    };
  }

  function invalidateLockedBoxes() {
    lockedBoxes = null;
  }

  function isSpreadAssetPage(width, height) {
    return isLandscapeSpread(width, height, noteSize);
  }

  /** size 없을 때 1페이지 비율 고정. 가로형이면 절반 폭을 1페이지로 간주 */
  function ensureFallbackFromDims(width, height) {
    if (noteSize || fallbackSingleAspect || !(width > 0 && height > 0)) return;
    if (isSpreadAssetPage(width, height)) {
      fallbackSingleAspect = { width: width / 2, height };
    } else {
      fallbackSingleAspect = { width, height };
    }
    invalidateLockedBoxes();
  }

  function getLockedBoxes() {
    if (lockedBoxes) return lockedBoxes;
    const bounds = getContentBounds();
    lockedBoxes = computeNoteDisplayBoxes(noteSize, bounds, fallbackSingleAspect);
    return lockedBoxes;
  }

  /**
   * 노트당 박스는 2종뿐: 1페이지 / 2페이지.
   * 2페이지 스캔은 자연 비율로 컨테이너에 전체 노출.
   */
  function applyCanvasFrame(canvas, { halfOfPair = false } = {}) {
    if (!canvas || !canvas.width || !canvas.height) return;

    ensureFallbackFromDims(canvas.width, canvas.height);

    const bounds = getContentBounds();
    const maxW = Math.max(80, bounds?.width || window.innerWidth);
    const maxH = Math.max(80, bounds?.height || window.innerHeight);
    const spreadAsset = isSpreadAssetPage(canvas.width, canvas.height);

    if (spreadAsset) {
      const box = fitAspectBox(canvas.width, canvas.height, maxW, maxH);
      canvas.style.width = `${Math.round(box.width)}px`;
      canvas.style.height = `${Math.round(box.height)}px`;
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = '100%';
      return;
    }

    const boxes = getLockedBoxes();
    const box = halfOfPair ? boxes.singleHalf : boxes.single;
    if (!box) return;

    canvas.style.width = `${Math.round(box.width)}px`;
    canvas.style.height = `${Math.round(box.height)}px`;
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '100%';
  }

  function refreshCanvasFrames() {
    if (canvasLeft?.width) {
      applyCanvasFrame(canvasLeft, { halfOfPair: isPairing });
    }
    if (isPairing && canvasRight?.width && canvasRight.style.display !== 'none') {
      applyCanvasFrame(canvasRight, { halfOfPair: true });
    }
  }

  function showOverlay(message) {
    if (overlayText) overlayText.textContent = message;
    overlay?.classList.add('show');
  }

  function hideOverlay() {
    overlay?.classList.remove('show');
  }

  function navigationStep() {
    return isSpreadMode && isPairing ? 2 : 1;
  }

  function updateControls() {
    const atFirst = pageNum <= 1 || pageRendering;
    const atLast = !pdfDoc || pageNum >= pdfDoc.numPages || pageRendering;
    prevBtn.disabled = atFirst;
    /* 마지막 페이지: 시각적으로 disabled, 클릭 시 토스트를 위해 disabled 속성은 쓰지 않음 */
    nextBtn.disabled = pageRendering || !pdfDoc;
    nextBtn.classList.toggle('is-at-end', Boolean(pdfDoc) && !pageRendering && pageNum >= pdfDoc.numPages);
    nextBtn.setAttribute(
      'aria-disabled',
      pdfDoc && !pageRendering && pageNum >= pdfDoc.numPages ? 'true' : 'false'
    );
    if (firstBtn) firstBtn.disabled = atFirst;
    if (lastBtn) lastBtn.disabled = atLast;
    
    if (isPairing && pdfDoc) {
      const endPage = Math.min(pageNum + 1, pdfDoc.numPages);
      currentPageEl.textContent = `${pageNum}-${endPage}`;
    } else {
      currentPageEl.textContent = pageNum;
    }
    totalPagesEl.textContent = pdfDoc ? pdfDoc.numPages : '-';
    
    if (toggleSpreadBtn) {
      toggleSpreadBtn.style.opacity = isSpreadMode ? '1' : '0.6';
    }
  }

  async function renderPage(num) {
    if (!pdfDoc) return;
    
    pageRendering = true;
    isPairing = false;
    canvasContainer.classList.remove('spread-mode');
    updateControls();
    canvasLeft.style.opacity = '0.3';
    canvasRight.style.opacity = '0.3';
    canvasRight.style.display = 'none';

    try {
      const pageLeft = await pdfDoc.getPage(num);
      const viewportLeft = pageLeft.getViewport({ scale });
      canvasLeft.width = viewportLeft.width;
      canvasLeft.height = viewportLeft.height;
      await pageLeft.render({ canvasContext: ctxLeft, viewport: viewportLeft }).promise;

      const leftIsSpreadAsset = isSpreadAssetPage(canvasLeft.width, canvasLeft.height);
      /*
       * 2페이지 스캔본은 이미 양면이 들어 있으므로
       * 양면 모드여도 그 페이지 한 장만 표시한다.
       */
      let showPair = isSpreadMode && !leftIsSpreadAsset && num + 1 <= pdfDoc.numPages;

      if (showPair) {
        const pageRight = await pdfDoc.getPage(num + 1);
        const viewportRight = pageRight.getViewport({ scale });
        /* 오른쪽이 스캔본이면 짝짓지 않음 */
        if (isSpreadAssetPage(viewportRight.width, viewportRight.height)) {
          showPair = false;
        } else {
          canvasRight.width = viewportRight.width;
          canvasRight.height = viewportRight.height;
          await pageRight.render({ canvasContext: ctxRight, viewport: viewportRight }).promise;
        }
      }

      isPairing = showPair;
      applyCanvasFrame(canvasLeft, { halfOfPair: isPairing });
      canvasLeft.style.opacity = '1';

      if (isPairing) {
        canvasContainer.classList.add('spread-mode');
        canvasRight.style.display = 'block';
        applyCanvasFrame(canvasRight, { halfOfPair: true });
        canvasRight.style.opacity = '1';
      } else {
        canvasContainer.classList.remove('spread-mode');
        canvasRight.style.display = 'none';
        ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
      }

      pageRendering = false;
      updateControls();
      
      if (pageNumPending !== null) {
        const pending = pageNumPending;
        pageNumPending = null;
        renderPage(pending);
      }
    } catch (error) {
      pageRendering = false;
      isPairing = false;
      showOverlay('페이지 렌더링 실패');
      console.error('Page render error:', error);
    }
  }

  function queueRenderPage(num) {
    if (pageRendering) pageNumPending = num;
    else renderPage(num);
  }

  function goToPage(num) {
    if (!pdfDoc || num < 1 || num > pdfDoc.numPages) return;
    pageNum = num;
    queueRenderPage(pageNum);
    updateControls();
  }

  function changeZoom(delta) {
    const nextScale = Math.min(3, Math.max(0.6, scale + delta));
    if (nextScale === scale) return;
    scale = nextScale;
    queueRenderPage(pageNum);
  }

  function resetZoom() {
    if (scale === initialScale) return;
    scale = initialScale;
    queueRenderPage(pageNum);
  }

  function toggleSpreadMode() {
    isSpreadMode = !isSpreadMode;
    queueRenderPage(pageNum);
  }

  async function loadPdf(url) {
    try {
      showOverlay('PDF 불러오는 중...');
      const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
      const loadingTask = pdfjsLib.getDocument({ url, withCredentials: false });
      pdfDoc = await loadingTask.promise;

      /* 1페이지 비율을 먼저 잠가 이후 모든 페이지에 동일 박스 적용 */
      try {
        const firstPage = await pdfDoc.getPage(1);
        const firstViewport = firstPage.getViewport({ scale: 1 });
        ensureFallbackFromDims(firstViewport.width, firstViewport.height);
      } catch {
        /* ignore — render 시점에 다시 시도 */
      }
      invalidateLockedBoxes();

      pageNum = 1;
      updateControls();
      hideOverlay();
      renderPage(pageNum);
    } catch (error) {
      showOverlay('PDF 로드 실패. 네트워크/URL을 확인해주세요.');
      console.error('PDF load error:', error);
    }
  }

  async function initPdfViewer() {
    showOverlay('PDF 목록 불러오는 중...');
    await ensurePdfJs();
    const noteMeta = (await findNoteMetaById(noteId)) || null;
    const timelineNotes = await loadTimelineNotes();
    const timelineNote = timelineNotes.find((note) => note.id === noteId) || null;
    const notionPdfUrl = noteMeta?.pdfUrl || timelineNote?.pdfUrl || null;
    if (!noteSize) noteSize = noteMeta?.size || timelineNote?.size || null;
    invalidateLockedBoxes();
    const pdfUrl = preferredPdfUrl || notionPdfUrl;

    if (!pdfUrl) {
      showOverlay('PDF를 찾을 수 없습니다. Notion의 pdf_url을 확인해주세요.');
      return;
    }
    loadPdf(pdfUrl);
  }

  prevBtn.addEventListener('click', () => { 
    const step = navigationStep();
    if (pageNum > 1) goToPage(Math.max(1, pageNum - step)); 
  });
  nextBtn.addEventListener('click', () => {
    if (!pdfDoc || pageRendering) return;
    if (nextBtn.classList.contains('is-at-end') || pageNum >= pdfDoc.numPages) {
      showToast('마지막 페이지입니다');
      return;
    }
    const step = navigationStep();
    goToPage(Math.min(pdfDoc.numPages, pageNum + step));
  });
  firstBtn?.addEventListener('click', () => { if (pdfDoc && pageNum > 1) goToPage(1); });
  lastBtn?.addEventListener('click', () => { if (pdfDoc && pageNum < pdfDoc.numPages) goToPage(pdfDoc.numPages); });
  toggleSpreadBtn.addEventListener('click', toggleSpreadMode);
  zoomResetBtn.addEventListener('click', resetZoom);
  zoomInBtn.addEventListener('click', () => changeZoom(0.2));
  zoomOutBtn.addEventListener('click', () => changeZoom(-0.2));

  const handleKeydown = (event) => {
    if (event.key === '+' || event.key === '=') changeZoom(0.2);
    else if (event.key === '-') changeZoom(-0.2);
    else if (event.key === 's' || event.key === 'S') toggleSpreadMode();
  };
  document.addEventListener('keydown', handleKeydown);

  let resizeTimer = null;
  const handleResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      invalidateLockedBoxes();
      refreshCanvasFrames();
    }, 80);
  };
  window.addEventListener('resize', handleResize);

  initPdfViewer();
  return () => {
    unmountDetailPage?.();
    document.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('resize', handleResize);
    clearTimeout(resizeTimer);
  };
}

/**
 * /note/:id 라우트용: main-content에 전체 페이지로 렌더링
 */
export function renderNoteDetailPage(id) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;
  mainContent._routeCleanup = renderPdfViewer(mainContent, id);
}
