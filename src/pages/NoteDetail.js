/**
 * NoteDetail 페이지
 * 타임라인 노트의 PDF를 표시하는 상세 페이지입니다.
 */

import { periodOptions } from '../data/notesData.js';
import { getNotesFromCoverImages } from '../utils/getNotesFromCoverImages.js';
import './NoteDetailPage.css';
import '../components/NoteDetail.css';

const COLLECTION_URL =
  'https://collection.cloudinary.com/djpgxjwpd/a34832296ffa829df1822992158a70b2';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const MANUAL_PDF_URLS = [
  // 임의 매핑 (1번째 노트로 연결)
  'https://res.cloudinary.com/djpgxjwpd/image/upload/v1768803706/2006-%EC%9D%BC%EA%B8%B02_compressed_1_juredk.pdf',
  // 17번째 노트 (1-based) = index 16
  , , , , , , , , , , , , , , ,
  'https://collection.cloudinary.com/djpgxjwpd/02c63df4415b70f88ac259d4f76859f9',
];

let cachedTimelineNotes = null;
let cachedPdfUrls = null;
let cachedPdfPromise = null;

function getTimelineNotes() {
  if (cachedTimelineNotes) return cachedTimelineNotes;
  const notes = [];
  periodOptions.forEach(periodOption => {
    const periodNotes = getNotesFromCoverImages(periodOption.value);
    periodNotes.forEach(note => notes.push(note));
  });
  cachedTimelineNotes = notes;
  return notes;
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

async function fetchTextWithCorsFallback(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('응답 오류');
    }
    return await response.text();
  } catch (error) {
    const proxiedUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const response = await fetch(proxiedUrl);
    if (!response.ok) {
      throw new Error('프록시 응답 오류');
    }
    return await response.text();
  }
}

async function fetchCollectionPdfUrls() {
  const manualUrls = MANUAL_PDF_URLS.filter(Boolean);
  if (manualUrls.length > 0) {
    return manualUrls;
  }

  const htmlText = await fetchTextWithCorsFallback(COLLECTION_URL);
  const matches = htmlText.match(/https?:\/\/res\.cloudinary\.com\/[^"'\\s]+?\.pdf[^"'\\s]*/g) || [];
  const unique = Array.from(new Set(matches));
  return unique;
}

async function getCollectionPdfUrls() {
  if (cachedPdfUrls) return cachedPdfUrls;
  if (cachedPdfPromise) return cachedPdfPromise;
  cachedPdfPromise = fetchCollectionPdfUrls()
    .then(urls => {
      cachedPdfUrls = urls;
      return urls;
    })
    .catch(() => {
      cachedPdfUrls = [];
      return [];
    });
  return cachedPdfPromise;
}

async function resolvePdfUrlForNote(noteId, timelineIndex) {
  if (timelineIndex < 0) return null;
  const urls = await getCollectionPdfUrls();
  return urls[timelineIndex] || null;
}

export function renderNotePdfViewer(targetEl, id) {
  if (!targetEl) return null;

  const noteId = decodeURIComponent(String(id || '')).trim();

  const timelineNotes = getTimelineNotes();
  const timelineIndex = timelineNotes.findIndex(note => note.id === noteId);
  const timelineNote = timelineIndex >= 0 ? timelineNotes[timelineIndex] : null;

  if (!timelineNote) {
    targetEl.innerHTML = `
      <div class="note-detail-page">
        <div class="note-detail">
          <div class="note-error">
            <p>노트를 찾을 수 없습니다.</p>
          </div>
        </div>
      </div>
    `;
    return null;
  }

  targetEl.innerHTML = `
    <div class="note-detail-page">
      <article class="note-detail">
        <section class="pdf-viewer">
          <div class="pdf-canvas-wrap">
            <canvas id="pdf-canvas"></canvas>
            <div id="pdf-overlay" class="pdf-overlay show">
              <div class="pdf-spinner" aria-hidden="true"></div>
              <div id="pdf-overlay-text">PDF 목록 불러오는 중...</div>
            </div>
          </div>
          <div class="pdf-controls">
            <button id="pdf-prev" type="button">← 이전</button>
            <input id="pdf-page-input" type="number" min="1" value="1" />
            <span class="pdf-page-info">/ <span id="pdf-total-pages">-</span></span>
            <button id="pdf-next" type="button">다음 →</button>
            <button id="pdf-zoom-out" type="button">축소</button>
            <button id="pdf-zoom-in" type="button">확대</button>
          </div>
          <div class="pdf-hint">키보드: ←/→ 페이지 이동, +/- 확대/축소</div>
        </section>
      </article>
    </div>
  `;

  const overlay = targetEl.querySelector('#pdf-overlay');
  const overlayText = targetEl.querySelector('#pdf-overlay-text');
  const canvas = targetEl.querySelector('#pdf-canvas');
  const ctx = canvas.getContext('2d');
  const prevBtn = targetEl.querySelector('#pdf-prev');
  const nextBtn = targetEl.querySelector('#pdf-next');
  const pageInput = targetEl.querySelector('#pdf-page-input');
  const totalPagesEl = targetEl.querySelector('#pdf-total-pages');
  const zoomOutBtn = targetEl.querySelector('#pdf-zoom-out');
  const zoomInBtn = targetEl.querySelector('#pdf-zoom-in');

  let pdfDoc = null;
  let pageNum = 1;
  let pageRendering = false;
  let pageNumPending = null;
  let scale = 0.6;
  let usingProxy = false;

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
    pageInput.value = pageNum;
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

  async function loadPdf(url) {
    try {
      showOverlay('PDF 불러오는 중...');
      const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
      const loadingTask = pdfjsLib.getDocument({ url, withCredentials: false });
      pdfDoc = await loadingTask.promise;
      pageNum = 1;
      usingProxy = false;
      updateControls();
      hideOverlay();
      renderPage(pageNum);
    } catch (error) {
      if (!usingProxy) {
        usingProxy = true;
        const proxiedUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
        loadPdf(proxiedUrl);
        return;
      }
      showOverlay('PDF 로드 실패. 네트워크/URL을 확인해주세요.');
      console.error('PDF load error:', error);
    }
  }

  async function initPdfViewer() {
    showOverlay('PDF 목록 불러오는 중...');
    await ensurePdfJs();
    const pdfUrl = await resolvePdfUrlForNote(noteId, timelineIndex);
    if (!pdfUrl) {
      showOverlay('PDF를 찾을 수 없습니다. 컬렉션 URL을 확인해주세요.');
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

  pageInput.addEventListener('change', (event) => {
    const value = parseInt(event.target.value, 10);
    if (!Number.isNaN(value)) {
      goToPage(value);
    } else {
      pageInput.value = pageNum;
    }
  });

  pageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const value = parseInt(pageInput.value, 10);
      if (!Number.isNaN(value)) {
        goToPage(value);
      }
    }
  });

  zoomInBtn.addEventListener('click', () => changeZoom(0.2));
  zoomOutBtn.addEventListener('click', () => changeZoom(-0.2));

  const handleKeydown = (event) => {
    if (document.activeElement === pageInput) return;
    if (event.key === 'ArrowLeft') {
      goToPage(pageNum - 1);
    } else if (event.key === 'ArrowRight') {
      goToPage(pageNum + 1);
    } else if (event.key === '+' || event.key === '=') {
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

