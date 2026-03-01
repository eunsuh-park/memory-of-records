/**
 * Timeline 페이지
 * 시기별 노트를 표시합니다. Jukebox와 동일한 Cover Flow UI를 사용합니다.
 */

import { periodOptions } from '../data/notesData.js';
import { renderSubMenu } from '../components/SubMenu.js';
import { getNotionNotebooks } from '../utils/notionNotebooks.js';
import { renderNotePdfViewer } from './NoteDetail.js';
import {
  updateCardAngles,
  enableCenterPerspective,
  enableGalleryScroll
} from './Jukebox.js';
import booksLottie from '../assets/Books.lottie';
import './Timeline.css';
import './Jukebox.css';

const BASE_URL = import.meta.env.BASE_URL || '/';
const JUKEBOX_LOADING_LOTTIE =
  'https://lottie.host/1ff458b1-27f6-4957-92d6-f3d5d9b52d17/qbzEiamboY.lottie';
const JUKEBOX_NAV_ICON_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><title>left_line</title><g fill='none' fill-rule='evenodd'><path d='M24 0v24H0V0z'/><path fill='currentColor' d='M8.293 12.707a1 1 0 0 1 0-1.414l5.657-5.657a1 1 0 1 1 1.414 1.414L10.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414l-5.657-5.657Z'/></g></svg>`;
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const TIMELINE_LOADING_OVERLAY_ID = 'timeline-loading-overlay';
const TIMELINE_LOADING_MESSAGES = [
  '노트들을 상자에서 꺼내는 중...',
  '상자의 먼지를 털어내는 중....'
];
const TIMELINE_LOADING_MIN_VISIBLE_MS = 2500;
const TIMELINE_LOADING_FADE_MS = 200;
const NOTION_ERROR_ID = 'notion-error-banner';
let currentPeriod = null;
let allNotesData = [];
let timelineOverlayShownAt = 0;
let timelineOverlayHideTimer = null;

const ICONS = {
  close:
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><title>close</title><path fill='currentColor' d='M15.889 6.697a1.001 1.001 0 0 1 1.415 1.414L13.414 12l3.89 3.89a1 1 0 0 1-1.414 1.414L12 13.414l-3.889 3.89a1 1 0 1 1-1.414-1.414L10.586 12 6.697 8.11a1 1 0 0 1 1.414-1.414L12 10.586z'/></svg>"
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolvePeriodKey(notebookType) {
  const normalized = String(notebookType || '').trim().toLowerCase();
  const match = periodOptions.find(
    (opt) =>
      opt.value.toLowerCase() === normalized || opt.label.toLowerCase() === normalized
  );
  return match?.value || periodOptions[0]?.value || 'elementary';
}

function getNotesCountByPeriod(notes) {
  const counts = {};
  periodOptions.forEach((p) => (counts[p.value] = 0));
  notes.forEach((n) => {
    const k = resolvePeriodKey(n.notebookType || n.period);
    counts[k] = (counts[k] || 0) + 1;
  });
  return counts;
}

function getRandomLoadingMessage() {
  return TIMELINE_LOADING_MESSAGES[
    Math.floor(Math.random() * TIMELINE_LOADING_MESSAGES.length)
  ];
}

function showTimelineLoadingOverlay() {
  let overlay = document.getElementById(TIMELINE_LOADING_OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = TIMELINE_LOADING_OVERLAY_ID;
    overlay.className = 'timeline-loading-overlay';
    document.body.appendChild(overlay);
  }
  document.body.classList.add('timeline-loading-active');
  if (timelineOverlayHideTimer) {
    clearTimeout(timelineOverlayHideTimer);
    timelineOverlayHideTimer = null;
  }
  timelineOverlayShownAt = Date.now();
  overlay.classList.remove('timeline-loading-overlay--hidden', 'timeline-loading-overlay--fading');
  overlay.innerHTML = `
    <div class="timeline-loading-content" role="status" aria-live="polite">
      <dotlottie-wc class="timeline-loading-lottie" src="${booksLottie}" style="width:160px;height:160px" autoplay loop></dotlottie-wc>
      <p class="timeline-loading-text">${getRandomLoadingMessage()}</p>
    </div>
  `;
}

function hideTimelineLoadingOverlay() {
  const overlay = document.getElementById(TIMELINE_LOADING_OVERLAY_ID);
  if (!overlay) return;
  const elapsed = Date.now() - timelineOverlayShownAt;
  const remaining = Math.max(0, TIMELINE_LOADING_MIN_VISIBLE_MS - elapsed);
  const doHide = () => {
    overlay.classList.add('timeline-loading-overlay--fading');
    setTimeout(() => {
      overlay.classList.add('timeline-loading-overlay--hidden');
      overlay.classList.remove('timeline-loading-overlay--fading');
      document.body.classList.remove('timeline-loading-active');
    }, TIMELINE_LOADING_FADE_MS);
    timelineOverlayHideTimer = null;
  };
  if (remaining === 0) doHide();
  else timelineOverlayHideTimer = setTimeout(doHide, remaining);
}

function updateBackgroundColor(period) {
  document.body.classList.remove(
    'period-elementary',
    'period-middle-high',
    'period-university',
    'period-after-graduation'
  );
  if (period) document.body.classList.add(`period-${period}`);
}

function updateActiveMenu(activePeriodId) {
  const subMenu = document.getElementById('sub-menu');
  if (!subMenu) return;
  subMenu.querySelectorAll('.period-link').forEach((link) => {
    const href = link.getAttribute('href');
    const periodId = href ? href.split('/').pop() : '';
    link.classList.toggle('active', periodId === activePeriodId);
  });
  const path = `/timeline/${activePeriodId}`;
  const newUrl = BASE_URL === '/' ? path : BASE_URL.slice(0, -1) + path;
  if (window.location.pathname !== newUrl) window.history.replaceState({}, '', newUrl);
  updateBackgroundColor(activePeriodId);
}

function openPdfModal(noteId, pdfUrl = null) {
  const existing = document.querySelector('.pdf-modal-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'pdf-modal-overlay';
  overlay.innerHTML = `
    <div class="pdf-modal" role="dialog" aria-modal="true">
      <button class="pdf-modal-close" type="button" aria-label="닫기">${ICONS.close}</button>
      <div class="pdf-modal-content"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.classList.add('pdf-modal-open');
  const content = overlay.querySelector('.pdf-modal-content');
  const cleanupViewer = renderNotePdfViewer(content, noteId, { mode: 'modal', pdfUrl });
  const closeModal = () => {
    cleanupViewer?.();
    overlay.remove();
    document.body.classList.remove('pdf-modal-open');
    document.removeEventListener('keydown', handleEscape);
  };
  const handleEscape = (e) => e.key === 'Escape' && closeModal();
  overlay.addEventListener('click', (e) => e.target === overlay && closeModal());
  overlay.querySelector('.pdf-modal-close')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', handleEscape);
}

function removeNotionError() {
  document.getElementById(NOTION_ERROR_ID)?.remove();
}

function showNotionError(error) {
  if (document.getElementById(NOTION_ERROR_ID)) return;
  const banner = document.createElement('div');
  banner.id = NOTION_ERROR_ID;
  banner.style.cssText =
    'position:sticky;top:0;z-index:10;background:rgba(200,0,0,0.1);color:#b00020;padding:8px 12px;font-size:12px;';
  banner.textContent = `Notion 오류: ${error?.message || 'API 호출 실패'}`;
  const gallery = document.getElementById('timeline-jukebox-gallery');
  gallery?.prepend(banner);
}

export function renderTimeline(period = 'elementary') {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const selectedPeriod = period || 'elementary';
  const existingGallery = document.getElementById('timeline-jukebox-gallery');
  const isPeriodSwitch =
    existingGallery && allNotesData.length > 0 && currentPeriod !== selectedPeriod;

  if (isPeriodSwitch) {
    const filtered = allNotesData.filter((n) => n.period === selectedPeriod);
    const notesCountByPeriod = getNotesCountByPeriod(allNotesData);
    const total = Object.values(notesCountByPeriod).reduce((a, b) => a + b, 0);
    renderSubMenu(selectedPeriod, null, total, notesCountByPeriod);
    updateBackgroundColor(selectedPeriod);
    updateActiveMenu(selectedPeriod);

    const itemsHtml =
      filtered.length === 0
        ? '<div class="jukebox-empty">해당 시기의 노트가 없습니다.</div>'
        : filtered
            .map((note) => {
              const coverSrc = note.coverFrontUrl || TRANSPARENT_PIXEL;
              const backSrc = note.coverBackUrl || TRANSPARENT_PIXEL;
              const title = escapeHtml(note.title);
              return `
                <div class="jukebox-card" data-note-id="${escapeHtml(note.id)}" data-period="${escapeHtml(note.period)}" data-pdf-url="${escapeHtml(note.pdfUrl || '')}">
                  <div class="jukebox-card-inner">
                    <div class="jukebox-card-face jukebox-card-face--front">
                      <img src="${escapeHtml(coverSrc)}" alt="${title}" loading="lazy" referrerpolicy="no-referrer" />
                    </div>
                    <div class="jukebox-card-face jukebox-card-face--back">
                      <img src="${escapeHtml(backSrc)}" alt="${title} (뒷표지)" loading="lazy" referrerpolicy="no-referrer" class="jukebox-card-back-cover" />
                    </div>
                  </div>
                </div>
              `;
            })
            .join('');

    existingGallery.innerHTML =
      filtered.length === 0
        ? itemsHtml
        : '<div class="jukebox-spacer jukebox-spacer--left" aria-hidden="true"></div>' +
          itemsHtml +
          '<div class="jukebox-spacer jukebox-spacer--right" aria-hidden="true"></div>';

    existingGallery.querySelectorAll('.jukebox-card-face--front img, .jukebox-card-back-cover').forEach(
      (img) => {
        img.addEventListener('error', () => img.classList.add('jukebox-cover-image--error'), {
          once: true
        });
      }
    );

    existingGallery.querySelectorAll('.jukebox-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const noteId = card.getAttribute('data-note-id');
        if (!noteId) return;
        openPdfModal(noteId, card.getAttribute('data-pdf-url') || null);
      });
    });

    updateCardAngles(existingGallery);
    currentPeriod = selectedPeriod;
    return;
  }

  if (!isPeriodSwitch) showTimelineLoadingOverlay();

  let subMenuContainer = document.getElementById('sub-menu');
  if (!subMenuContainer) {
    subMenuContainer = document.createElement('aside');
    subMenuContainer.id = 'sub-menu';
    document.body.appendChild(subMenuContainer);
  }

  mainContent.className = 'app-main timeline-active jukebox-active';
  const mainWrapper = mainContent.closest('.main-wrapper');
  if (mainWrapper) mainWrapper.classList.add('timeline-active', 'jukebox-active');
  document.body.classList.add('timeline-active', 'jukebox-active');

  mainContent.innerHTML = `
    <div class="jukebox-fullscreen" id="timeline-jukebox-fullscreen">
      <div class="jukebox-gallery-wrap">
        <button type="button" class="jukebox-nav jukebox-nav--prev" id="timeline-jukebox-prev" aria-label="이전">
          <span class="jukebox-nav-icon">${JUKEBOX_NAV_ICON_SVG}</span>
        </button>
        <button type="button" class="jukebox-nav jukebox-nav--next" id="timeline-jukebox-next" aria-label="다음">
          <span class="jukebox-nav-icon jukebox-nav-icon--next">${JUKEBOX_NAV_ICON_SVG}</span>
        </button>
        <div class="jukebox-gallery centerized" id="timeline-jukebox-gallery">
          <div class="jukebox-loading" role="status" aria-live="polite">
            <dotlottie-wc class="jukebox-loading-lottie" src="${JUKEBOX_LOADING_LOTTIE}" style="width:300px;height:300px" autoplay loop></dotlottie-wc>
            <p class="jukebox-loading-text">노트를 불러오는 중...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  const gallery = document.getElementById('timeline-jukebox-gallery');
  const prevBtn = document.getElementById('timeline-jukebox-prev');
  const nextBtn = document.getElementById('timeline-jukebox-next');

  getNotionNotebooks()
    .then((notebooks) => {
      removeNotionError();
      if (!Array.isArray(notebooks) || notebooks.length === 0) {
        gallery.innerHTML = '<div class="jukebox-empty">표시할 노트가 없습니다.</div>';
        hideTimelineLoadingOverlay();
        return;
      }

      allNotesData = notebooks.map((n) => ({
        ...n,
        period: resolvePeriodKey(n.notebookType)
      }));

      const filtered = allNotesData.filter((n) => n.period === selectedPeriod);
      const notesCountByPeriod = getNotesCountByPeriod(allNotesData);
      const total = Object.values(notesCountByPeriod).reduce((a, b) => a + b, 0);

      renderSubMenu(selectedPeriod, null, total, notesCountByPeriod);
      updateBackgroundColor(selectedPeriod);
      updateActiveMenu(selectedPeriod);

      if (filtered.length === 0) {
        gallery.innerHTML = '<div class="jukebox-empty">해당 시기의 노트가 없습니다.</div>';
        hideTimelineLoadingOverlay();
        return;
      }

      const itemsHtml = filtered
        .map((note) => {
          const coverSrc = note.coverFrontUrl || TRANSPARENT_PIXEL;
          const backSrc = note.coverBackUrl || TRANSPARENT_PIXEL;
          const title = escapeHtml(note.title);
          return `
            <div class="jukebox-card" data-note-id="${escapeHtml(note.id)}" data-period="${escapeHtml(note.period)}" data-pdf-url="${escapeHtml(note.pdfUrl || '')}">
              <div class="jukebox-card-inner">
                <div class="jukebox-card-face jukebox-card-face--front">
                  <img src="${escapeHtml(coverSrc)}" alt="${title}" loading="lazy" referrerpolicy="no-referrer" />
                </div>
                <div class="jukebox-card-face jukebox-card-face--back">
                  <img src="${escapeHtml(backSrc)}" alt="${title} (뒷표지)" loading="lazy" referrerpolicy="no-referrer" class="jukebox-card-back-cover" />
                </div>
              </div>
            </div>
          `;
        })
        .join('');

      gallery.innerHTML =
        '<div class="jukebox-spacer jukebox-spacer--left" aria-hidden="true"></div>' +
        itemsHtml +
        '<div class="jukebox-spacer jukebox-spacer--right" aria-hidden="true"></div>';

      gallery
        .querySelectorAll('.jukebox-card-face--front img, .jukebox-card-back-cover')
        .forEach((img) => {
          img.addEventListener('error', () => img.classList.add('jukebox-cover-image--error'), {
            once: true
          });
        });

      gallery.querySelectorAll('.jukebox-card').forEach((card) => {
        card.addEventListener('click', (e) => {
          e.preventDefault();
          const noteId = card.getAttribute('data-note-id');
          if (!noteId) return;
          const pdfUrl = card.getAttribute('data-pdf-url') || null;
          openPdfModal(noteId, pdfUrl);
        });
      });

      enableCenterPerspective(gallery);
      enableGalleryScroll(gallery, prevBtn, nextBtn);
      hideTimelineLoadingOverlay();
      currentPeriod = selectedPeriod;
    })
    .catch((err) => {
      console.warn('Timeline: 노트 로드 실패', err);
      showNotionError(err);
      gallery.innerHTML = '<div class="jukebox-empty">노트를 불러올 수 없습니다.</div>';
      hideTimelineLoadingOverlay();
    });
}
