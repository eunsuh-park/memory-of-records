/**
 * NoteDetail 페이지
 * 타임라인 노트의 PDF를 표시하는 상세 페이지입니다.
 */

import { getNotebookAssets } from '../utils/cloudinary.js';
import { getNotebookContentUrls } from '../utils/notebookContents.js';
import { getNotionNotebooks } from '../utils/notionNotebooks.js';
import './NoteDetailPage.css';
import '../components/NoteDetail.css';

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const CLOUDINARY_NOTE_LIMIT = 18;

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

async function resolvePdfUrlForNote(noteId, timelineIndex, cloudinaryKey) {
  try {
    const data = await getNotebookAssets();
    const notes = Array.isArray(data?.notes) ? data.notes : [];
    if (cloudinaryKey) {
      const matched = notes.find((note) => note.key === cloudinaryKey);
      return matched?.contents || null;
    }
    if (timelineIndex < 0 || timelineIndex >= CLOUDINARY_NOTE_LIMIT) return null;
    const indexedNote = notes[timelineIndex];
    const key = indexedNote?.key;
    if (key) {
      const matched = notes.find((note) => note.key === key);
      return matched?.contents || indexedNote?.contents || null;
    }
    if (indexedNote?.contents) return indexedNote.contents;

    // /api/cloudinary?folder=Notebooks/Contents 기반 PDF 목록으로 보완
    const contentUrls = await getNotebookContentUrls();
    return contentUrls?.[timelineIndex] || null;
  } catch (error) {
    console.error('Cloudinary PDF 로드 실패:', error);
    return null;
  }
}

export function renderNotePdfViewer(targetEl, id, options = {}) {
  if (!targetEl) return null;

  const noteId = decodeURIComponent(String(id || '')).trim();
  const isModal = options.mode === 'modal';
  const cloudinaryKey = options.cloudinaryKey || null;
  const preferredPdfUrl = options.pdfUrl || null;

  let timelineIndex = -1;

  const viewerMarkup = `
    <section class="pdf-viewer${isModal ? ' pdf-viewer--modal' : ''}">
      <div class="pdf-canvas-wrap">
        <button id="pdf-prev" class="pdf-nav-button pdf-nav-prev" type="button" aria-label="이전 페이지">←</button>
        <button id="pdf-next" class="pdf-nav-button pdf-nav-next" type="button" aria-label="다음 페이지">→</button>
        <div class="pdf-page-indicator">
          <button id="pdf-first" type="button" aria-label="처음 페이지">«</button>
          <span id="pdf-current-page">1</span>/<span id="pdf-total-pages">-</span>
          <button id="pdf-last" type="button" aria-label="마지막 페이지">»</button>
        </div>
        <div class="pdf-zoom-controls">
          <button id="pdf-zoom-reset" type="button" aria-label="100% 비율로 초기화">100%</button>
          <button id="pdf-zoom-in" type="button" aria-label="확대">+</button>
          <button id="pdf-zoom-out" type="button" aria-label="축소">-</button>
        </div>
        <canvas id="pdf-canvas"></canvas>
        <div id="pdf-overlay" class="pdf-overlay show">
          <div class="pdf-spinner" aria-hidden="true"></div>
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

  const overlay = targetEl.querySelector('#pdf-overlay');
  const overlayText = targetEl.querySelector('#pdf-overlay-text');
  const canvas = targetEl.querySelector('#pdf-canvas');
  const ctx = canvas.getContext('2d');
  const prevBtn = targetEl.querySelector('#pdf-prev');
  const nextBtn = targetEl.querySelector('#pdf-next');
  const firstBtn = targetEl.querySelector('#pdf-first');
  const lastBtn = targetEl.querySelector('#pdf-last');
  const currentPageEl = targetEl.querySelector('#pdf-current-page');
  const totalPagesEl = targetEl.querySelector('#pdf-total-pages');
  const zoomResetBtn = targetEl.querySelector('#pdf-zoom-reset');
  const zoomOutBtn = targetEl.querySelector('#pdf-zoom-out');
  const zoomInBtn = targetEl.querySelector('#pdf-zoom-in');

  let pdfDoc = null;
  let pageNum = 1;
  let pageRendering = false;
  let pageNumPending = null;
  const initialScale = 0.6;
  let scale = initialScale;

  function showOverlay(message) {
    if (overlayText) {
      overlayText.textContent = message;
    }
    overlay?.classList.add('show');
  }

  function hideOverlay() {
    overlay?.classList.remove('show');
  }

  function updateControls() {
    prevBtn.disabled = pageNum <= 1 || pageRendering;
    nextBtn.disabled = !pdfDoc || pageNum >= pdfDoc.numPages || pageRendering;
    if (firstBtn) {
      firstBtn.disabled = pageNum <= 1 || pageRendering;
    }
    if (lastBtn) {
      lastBtn.disabled = !pdfDoc || pageNum >= pdfDoc.numPages || pageRendering;
    }
    currentPageEl.textContent = pageNum;
    totalPagesEl.textContent = pdfDoc ? pdfDoc.numPages : '-';
  }

  function renderPage(num) {
    pageRendering = true;
    updateControls();
    canvas.style.opacity = '0.2';

    pdfDoc.getPage(num).then(page => {
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
    if (pageRendering) {
      pageNumPending = num;
    } else {
      renderPage(num);
    }
  }

  function goToPage(num) {
    if (!pdfDoc) return;
    if (num < 1 || num > pdfDoc.numPages) return;
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
    timelineIndex = timelineNotes.findIndex(note => note.id === noteId);
    const timelineNote = timelineIndex >= 0 ? timelineNotes[timelineIndex] : null;
    const notionPdfUrl = timelineNote?.pdfUrl || null;
    if (!timelineNote && !preferredPdfUrl) {
      showOverlay('노트를 찾을 수 없습니다.');
      return;
    }
    const pdfUrl =
      preferredPdfUrl ||
      notionPdfUrl ||
      (await resolvePdfUrlForNote(noteId, timelineIndex, cloudinaryKey));

    if (!pdfUrl) {
      showOverlay('PDF를 찾을 수 없습니다. Notion/Cloudinary 파일을 확인해주세요.');
      return;
    }
    loadPdf(pdfUrl);
  }

  prevBtn.addEventListener('click', () => {
    if (pageNum <= 1) return;
    goToPage(pageNum - 1);
  });

  nextBtn.addEventListener('click', () => {
    if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
    goToPage(pageNum + 1);
  });

  firstBtn?.addEventListener('click', () => {
    if (!pdfDoc || pageNum <= 1) return;
    goToPage(1);
  });

  lastBtn?.addEventListener('click', () => {
    if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
    goToPage(pdfDoc.numPages);
  });

  zoomResetBtn.addEventListener('click', resetZoom);
  zoomInBtn.addEventListener('click', () => changeZoom(0.2));
  zoomOutBtn.addEventListener('click', () => changeZoom(-0.2));

  const handleKeydown = (event) => {
    if (event.key === '+' || event.key === '=') {
      changeZoom(0.2);
    } else if (event.key === '-') {
      changeZoom(-0.2);
    }
  };
  document.addEventListener('keydown', handleKeydown);

  initPdfViewer();
  return () => {
    document.removeEventListener('keydown', handleKeydown);
  };
}

export function renderNoteDetail(id) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;
  renderNotePdfViewer(mainContent, id);
}

