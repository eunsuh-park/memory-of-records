/**
 * PdfModal
 * 노트 PDF 뷰어. 모달 또는 전체 페이지로 표시됩니다.
 * - 모달: Jukebox에서 노트 클릭 시
 * - 전체 페이지: /note/:id 경로
 */

import { getNotionNotebooks } from '../../services/notionNotebooks.js';
import { render as renderButton } from '../Button/Button.js';
import '../Button/Button.css';
import './PdfModal.css';

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const PDF_LOADING_LOTTIE =
  'https://lottie.host/ac9f0d95-b144-482c-a2d4-fb707e069f94/lHcmDqwHwt.lottie';

const ICONS = {
  arrowsLeftLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><title>arrows_left_line</title><g id='arrows_left_line' fill='none' fill-rule='evenodd'><path d='M24 0v24H0V0h24ZM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036c-.01-.003-.019 0-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.016-.018Zm.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01-.184-.092Z'/><path fill='currentColor' d='M11.707 6.293a1 1 0 0 1 0 1.414L7.414 12l4.293 4.293a1 1 0 0 1-1.414 1.414l-5-5a1 1 0 0 1 0-1.414l5-5a1 1 0 0 1 1.414 0Zm6 0a1 1 0 0 1 0 1.414L13.414 12l4.293 4.293a1 1 0 0 1-1.414 1.414l-5-5a1 1 0 0 1 0-1.414l5-5a1 1 0 0 1 1.414 0Z'/></g></svg>",
  arrowsRightLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><title>arrows_right_line</title><g id='arrows_right_line' fill='none' fill-rule='evenodd'><path d='M24 0v24H0V0h24ZM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036c-.01-.003-.019 0-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.016-.018Zm.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01-.184-.092Z'/><path fill='currentColor' d='M9.707 11.293a1 1 0 0 1 0 1.414l-5.657 5.657a1 1 0 1 1-1.414-1.414l4.95-4.95-4.95-4.95a1 1 0 0 1 1.414-1.414l5.657 5.657Zm6 0a1 1 0 0 1 0 1.414l-5.657 5.657a1 1 0 1 1-1.414-1.414l4.95-4.95-4.95-4.95a1 1 0 0 1 1.414-1.414l5.657 5.657Z'/></g></svg>",
  leftLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><title>left_line</title><g id='left_line' fill='none' fill-rule='evenodd'><path d='M24 0v24H0V0h24ZM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018Zm.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01-.184-.092Z'/><path fill='currentColor' d='M8.293 12.707a1 1 0 0 1 0-1.414l5.657-5.657a1 1 0 1 1 1.414 1.414L10.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414l-5.657-5.657Z'/></g></svg>",
  rightLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><title>right_line</title><g id='right_line' fill='none' fill-rule='evenodd'><path d='M24 0v24H0V0h24ZM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018Zm.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01-.184-.092Z'/><path fill='currentColor' d='M15.707 11.293a1 1 0 0 1 0 1.414l-5.657 5.657a1 1 0 1 1-1.414-1.414l4.95-4.95-4.95-4.95a1 1 0 0 1 1.414-1.414l5.657 5.657Z'/></g></svg>",
  refreshLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><title>refresh_anticlockwise_1_line</title><g id='refresh_anticlockwise_1_line' fill='none' fill-rule='evenodd'><path d='M24 0v24H0V0zM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036c-.01-.003-.019 0-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.016-.018m.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01z'/><path fill='currentColor' d='M14.07 19.727a8.003 8.003 0 0 1-9.146-3.99 1 1 0 0 0-1.77.933c2.13 4.04 6.836 6.221 11.434 4.99 5.335-1.43 8.5-6.914 7.071-12.248-1.43-5.335-6.913-8.5-12.247-7.071a10.003 10.003 0 0 0-7.414 9.58c-.007.903.995 1.402 1.713.919l2.673-1.801c1.008-.68.332-2.251-.854-1.986l-1.058.236a8 8 0 1 1 9.598 10.439Z'/></g></svg>"
};

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

  const viewerMarkup = `
    <section class="pdf-viewer${isModal ? ' pdf-viewer--modal' : ''}">
      <div class="pdf-canvas-wrap">
        ${renderButton({ variant: 'navPrev', ariaLabel: '이전 페이지', content: ICONS.leftLine, className: 'pdf-nav-prev' })}
        ${renderButton({ variant: 'navNext', ariaLabel: '다음 페이지', content: ICONS.rightLine, className: 'pdf-nav-next' })}
        <div class="pdf-page-indicator">
          ${renderButton({ variant: 'toolbar', ariaLabel: '처음 페이지', content: ICONS.arrowsLeftLine, className: 'pdf-nav-first' })}
          <span id="pdf-current-page">1</span>/<span id="pdf-total-pages">-</span>
          ${renderButton({ variant: 'toolbar', ariaLabel: '마지막 페이지', content: ICONS.arrowsRightLine, className: 'pdf-nav-last' })}
        </div>
        <div class="pdf-zoom-controls">
          ${renderButton({ variant: 'toolbar', ariaLabel: '100% 비율로 초기화', content: ICONS.refreshLine, className: 'pdf-zoom-reset' })}
          ${renderButton({ variant: 'toolbar', ariaLabel: '확대', content: '+', className: 'pdf-zoom-in' })}
          ${renderButton({ variant: 'toolbar', ariaLabel: '축소', content: '-', className: 'pdf-zoom-out' })}
        </div>
        <canvas id="pdf-canvas"></canvas>
        <div id="pdf-overlay" class="pdf-overlay show">
          <dotlottie-wc class="pdf-overlay-lottie" src="${PDF_LOADING_LOTTIE}" style="width: 300px; height: 300px" autoplay loop></dotlottie-wc>
          <div id="pdf-overlay-text">PDF 목록 불러오는 중...</div>
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

  const overlay = targetEl.querySelector('#pdf-overlay');
  const overlayText = targetEl.querySelector('#pdf-overlay-text');
  const canvas = targetEl.querySelector('#pdf-canvas');
  const ctx = canvas.getContext('2d');
  const prevBtn = targetEl.querySelector('.pdf-nav-prev');
  const nextBtn = targetEl.querySelector('.pdf-nav-next');
  const firstBtn = targetEl.querySelector('.pdf-nav-first');
  const lastBtn = targetEl.querySelector('.pdf-nav-last');
  const currentPageEl = targetEl.querySelector('#pdf-current-page');
  const totalPagesEl = targetEl.querySelector('#pdf-total-pages');
  const zoomResetBtn = targetEl.querySelector('.pdf-zoom-reset');
  const zoomOutBtn = targetEl.querySelector('.pdf-zoom-out');
  const zoomInBtn = targetEl.querySelector('.pdf-zoom-in');

  let pdfDoc = null;
  let pageNum = 1;
  let pageRendering = false;
  let pageNumPending = null;
  const initialScale = 0.6;
  let scale = initialScale;

  function showOverlay(message) {
    if (overlayText) overlayText.textContent = message;
    overlay?.classList.add('show');
  }

  function hideOverlay() {
    overlay?.classList.remove('show');
  }

  function updateControls() {
    prevBtn.disabled = pageNum <= 1 || pageRendering;
    nextBtn.disabled = !pdfDoc || pageNum >= pdfDoc.numPages || pageRendering;
    if (firstBtn) firstBtn.disabled = pageNum <= 1 || pageRendering;
    if (lastBtn) lastBtn.disabled = !pdfDoc || pageNum >= pdfDoc.numPages || pageRendering;
    currentPageEl.textContent = pageNum;
    totalPagesEl.textContent = pdfDoc ? pdfDoc.numPages : '-';
  }

  function renderPage(num) {
    pageRendering = true;
    updateControls();
    canvas.style.opacity = '0.2';

    pdfDoc.getPage(num).then((page) => {
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const renderContext = { canvasContext: ctx, viewport };
      return page.render(renderContext).promise;
    }).then(() => {
      pageRendering = false;
      canvas.style.opacity = '1';
      updateControls();
      if (pageNumPending !== null) {
        const pending = pageNumPending;
        pageNumPending = null;
        renderPage(pending);
      }
    }).catch(() => {
      pageRendering = false;
      showOverlay('페이지 렌더링 실패');
    });
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

  async function loadPdf(url) {
    try {
      showOverlay('PDF 불러오는 중...');
      const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
      const loadingTask = pdfjsLib.getDocument({ url, withCredentials: false });
      pdfDoc = await loadingTask.promise;
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
    const timelineNotes = await loadTimelineNotes();
    const timelineNote = timelineNotes.find((note) => note.id === noteId) || null;
    const notionPdfUrl = timelineNote?.pdfUrl || null;
    const pdfUrl = preferredPdfUrl || notionPdfUrl;

    if (!pdfUrl) {
      showOverlay('PDF를 찾을 수 없습니다. Notion의 pdf_url을 확인해주세요.');
      return;
    }
    loadPdf(pdfUrl);
  }

  prevBtn.addEventListener('click', () => { if (pageNum > 1) goToPage(pageNum - 1); });
  nextBtn.addEventListener('click', () => { if (pdfDoc && pageNum < pdfDoc.numPages) goToPage(pageNum + 1); });
  firstBtn?.addEventListener('click', () => { if (pdfDoc && pageNum > 1) goToPage(1); });
  lastBtn?.addEventListener('click', () => { if (pdfDoc && pageNum < pdfDoc.numPages) goToPage(pdfDoc.numPages); });
  zoomResetBtn.addEventListener('click', resetZoom);
  zoomInBtn.addEventListener('click', () => changeZoom(0.2));
  zoomOutBtn.addEventListener('click', () => changeZoom(-0.2));

  const handleKeydown = (event) => {
    if (event.key === '+' || event.key === '=') changeZoom(0.2);
    else if (event.key === '-') changeZoom(-0.2);
  };
  document.addEventListener('keydown', handleKeydown);

  initPdfViewer();
  return () => document.removeEventListener('keydown', handleKeydown);
}

/**
 * /note/:id 라우트용: main-content에 전체 페이지로 렌더링
 */
export function renderNoteDetailPage(id) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;
  renderPdfViewer(mainContent, id);
}
