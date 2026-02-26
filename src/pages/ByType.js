/**
 * By type 페이지
 * 노트 타입별로 표시하는 페이지입니다.
 */

import { typeOptions } from '../data/typeOptions.js';
import { renderTypeSubMenu } from '../components/TypeSubMenu.js';
import { renderTypeScrollBar } from '../components/TypeScrollBar.js';
import { renderQuickScrollMenu } from '../components/QuickScrollMenu.js';
import { getNotionTypeItems } from '../utils/notionByType.js';
import { renderNotePdfViewer } from './NoteDetail.js';
import booksLottie from '../assets/Books.lottie';
import './Timeline.css';

// base 경로 가져오기
const BASE_URL = import.meta.env.BASE_URL || '/';

// 스크롤 위치 저장을 위한 전역 변수
let savedScrollPosition = null;
let currentType = null;
let isScrollingToTarget = false;
let currentFocusedNoteId = null;
let allNotesData = [];
const NOTION_ERROR_ID = 'notion-error-banner';
const TYPE_LOADING_OVERLAY_ID = 'type-loading-overlay';
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const TYPE_LOADING_MESSAGES = [
  '노트들을 상자에서 꺼내는 중...',
  '상자의 먼지를 털어내는 중....'
];
const ICONS = {
  close:
    "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><title>close_medium_line</title><g id='close_medium_line' fill='none' fill-rule='nonzero'><path d='M24 0v24H0V0zM12.594 23.258l-.012.002-.071.035-.02.004-.014-.004-.071-.036q-.016-.004-.024.006l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427q-.004-.016-.016-.018m.264-.113-.014.002-.184.093-.01.01-.003.011.018.43.005.012.008.008.201.092q.019.005.029-.008l.004-.014-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014-.034.614q.001.018.017.024l.015-.002.201-.093.01-.008.003-.011.018-.43-.003-.012-.01-.01z'/><path fill='currentColor' d='M15.889 6.697a1.001 1.001 0 0 1 1.415 1.414L13.414 12l3.89 3.89a1 1 0 0 1-1.414 1.414L12 13.414l-3.889 3.89a1 1 0 1 1-1.414-1.414L10.586 12 6.697 8.11a1 1 0 0 1 1.414-1.414L12 10.586z'/></g></svg>"
};
const TYPE_LOADING_MIN_VISIBLE_MS = 2500;
const TYPE_LOADING_FADE_MS = 200;
const TYPE_LOADING_TIMEOUT_MS = 7000;
let typeOverlayShownAt = 0;
let typeOverlayHideTimer = null;

function getRandomLoadingMessage() {
  const index = Math.floor(Math.random() * TYPE_LOADING_MESSAGES.length);
  return TYPE_LOADING_MESSAGES[index];
}

function showTypeLoadingOverlay() {
  let overlay = document.getElementById(TYPE_LOADING_OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = TYPE_LOADING_OVERLAY_ID;
    overlay.className = 'timeline-loading-overlay';
    document.body.appendChild(overlay);
  }

  if (typeOverlayHideTimer) {
    clearTimeout(typeOverlayHideTimer);
    typeOverlayHideTimer = null;
  }
  typeOverlayShownAt = Date.now();
  overlay.classList.remove('timeline-loading-overlay--hidden', 'timeline-loading-overlay--fading');
  overlay.innerHTML = `
    <div class="timeline-loading-content" role="status" aria-live="polite">
      <dotlottie-wc
        class="timeline-loading-lottie"
        src="${booksLottie}"
        autoplay
        loop
      ></dotlottie-wc>
      <p class="timeline-loading-text">${getRandomLoadingMessage()}</p>
    </div>
  `;
}

function hideTypeLoadingOverlay() {
  const overlay = document.getElementById(TYPE_LOADING_OVERLAY_ID);
  if (!overlay) return;
  const elapsed = Date.now() - typeOverlayShownAt;
  const remaining = Math.max(0, TYPE_LOADING_MIN_VISIBLE_MS - elapsed);
  if (remaining === 0) {
    overlay.classList.add('timeline-loading-overlay--fading');
    typeOverlayHideTimer = setTimeout(() => {
      overlay.classList.add('timeline-loading-overlay--hidden');
      overlay.classList.remove('timeline-loading-overlay--fading');
      typeOverlayHideTimer = null;
    }, TYPE_LOADING_FADE_MS);
    return;
  }
  typeOverlayHideTimer = setTimeout(() => {
    overlay.classList.add('timeline-loading-overlay--fading');
    setTimeout(() => {
      overlay.classList.add('timeline-loading-overlay--hidden');
      overlay.classList.remove('timeline-loading-overlay--fading');
    }, TYPE_LOADING_FADE_MS);
    typeOverlayHideTimer = null;
  }, remaining);
}

function waitForTypeImages(container) {
  if (!container) return Promise.resolve();

  const images = Array.from(container.querySelectorAll('.note-cover-image'));
  const pending = images.filter((img) => !img.complete);

  if (pending.length === 0) {
    return Promise.resolve();
  }

  const loadPromises = pending.map(
    (img) =>
      new Promise((resolve) => {
        const cleanup = () => {
          img.removeEventListener('load', handleLoad);
          img.removeEventListener('error', handleLoad);
        };
        const handleLoad = () => {
          cleanup();
          resolve();
        };
        img.addEventListener('load', handleLoad, { once: true });
        img.addEventListener('error', handleLoad, { once: true });
      })
  );

  return Promise.race([
    Promise.all(loadPromises),
    new Promise((resolve) => {
      setTimeout(resolve, TYPE_LOADING_TIMEOUT_MS);
    })
  ]);
}

function normalizeTypeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveTypeKeyFromTitle(title) {
  const trimmed = String(title || '').trim();
  const prefix = trimmed.slice(0, 2);
  switch (prefix) {
    case '01':
      return 'diary-scheduler';
    case '02':
      return 'notebook-memo';
    case '03':
      return 'sketchbook';
    case '04':
      return 'lined-notebook';
    default:
      return null;
  }
}

function resolveTypeKey(notebookType) {
  const prefixMatch = resolveTypeKeyFromTitle(notebookType);
  if (prefixMatch) return prefixMatch;
  const normalized = normalizeTypeValue(notebookType);
  const match = typeOptions.find((option) => {
    const candidateList = [
      option.value,
      option.label,
      option.detail,
      ...(option.aliases || [])
    ];
    return candidateList.some((candidate) => normalizeTypeValue(candidate) === normalized);
  });
  return match?.value || typeOptions[0]?.value || 'diary-scheduler';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getNotesCountByType(notes) {
  const counts = {};
  typeOptions.forEach((typeOption) => {
    counts[typeOption.value] = 0;
  });
  notes.forEach((note) => {
    const key = resolveTypeKey(note.type || note.notebookType || note.title);
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

/** 현재 선택 타입에 해당하는 노트만 반환 (타입 결정이 이미 된 allNotesData 기준) */
function getNotesForType(notes, selectedType) {
  return notes.filter((note) => note.type === selectedType);
}

function getTypeLabel(typeKey, fallback = '') {
  const match = typeOptions.find((option) => option.value === typeKey);
  return match?.label || fallback || '';
}

/**
 * 타입별 리스트 설명 영역 HTML (타이틀, 본문, scroll 텍스트)
 * 내용은 src/data/typeOptions.js 에서 각 타입 옵션의 listTitle, listBody 에 넣으면 됨.
 * 예: { value: 'diary-scheduler', label: '...', listTitle: '이 리스트 제목', listBody: '설명 본문...', ... }
 */
function getTypeListIntroHTML(selectedType) {
  const option = typeOptions.find((o) => o.value === selectedType);
  const title = option?.listTitle ?? '';
  const body = option?.listBody ?? '';
  return `
    <div class="type-list-intro">
      <h2 class="type-list-intro-title">${escapeHtml(title)}</h2>
      <p class="type-list-intro-body">${escapeHtml(body)}</p>
      <span class="type-list-intro-scroll" aria-hidden="true">scroll</span>
    </div>
  `;
}

/**
 * 선택한 타입에 해당하는 노트만 메인 영역에 렌더링 (타입 전환 시 재사용)
 */
function renderNotesListForType(typeMain, selectedType) {
  const notesToShow = getNotesForType(allNotesData, selectedType);
  const allNotesHTML = [];
  const firstNoteId = notesToShow.length > 0 ? notesToShow[0].id : null;
  const lastNoteId = notesToShow.length > 0 ? notesToShow[notesToShow.length - 1].id : null;

  if (firstNoteId) {
    allNotesHTML.push('<div class="note-placeholder"></div>');
  }
  if (notesToShow.length === 0) {
    allNotesHTML.push(`
      <div class="no-notes">이 타입에 해당하는 노트가 없습니다.</div>
    `);
  } else {
    notesToShow.forEach((note) => {
      const noteTitle = escapeHtml(note.title);
      const typeLabel = escapeHtml(getTypeLabel(note.type, note.type || ''));
      const description = escapeHtml(note.description || '');
      const coverSrc = note.coverFrontUrl || TRANSPARENT_PIXEL;
      const backCoverSrc = note.coverBackUrl || TRANSPARENT_PIXEL;
      const pdfUrl = note.pdfUrl || '';
      const noteId = escapeHtml(note.id);
      const typeKey = escapeHtml(note.type);
      allNotesHTML.push(`
        <article class="note-card" data-note-id="${noteId}" data-type="${typeKey}" data-pdf-url="${escapeHtml(
        pdfUrl
      )}">
          <div class="note-card-link">
            <div class="note-cover-container">
              <img src="${escapeHtml(coverSrc)}" alt="노트 표지" class="note-cover-image note-cover-front" loading="lazy" referrerpolicy="no-referrer" />
              <img src="${escapeHtml(backCoverSrc)}" alt="노트 뒷표지" class="note-cover-image note-cover-back" loading="lazy" referrerpolicy="no-referrer" />
            </div>
            <div class="note-info">
              <h5 class="note-info-meta">${typeLabel}</h5>
              <p class="note-info-description">${description}</p>
            </div>
          </div>
        </article>
      `);
    });
  }
  if (lastNoteId) {
    allNotesHTML.push('<div class="note-placeholder"></div>');
  }

  typeMain.innerHTML = `
    <div class="notes-list">
      ${getTypeListIntroHTML(selectedType)}
      ${allNotesHTML.join('')}
    </div>
  `;

  typeMain.querySelectorAll('.note-cover-image').forEach((img) => {
    img.addEventListener('error', () => {
      img.classList.add('note-cover-image--error');
      console.warn('노트 표지 로드 실패:', img.src);
    }, { once: true });
  });

  typeMain.querySelectorAll('.note-card[data-note-id]').forEach((noteCard) => {
    noteCard.addEventListener('click', (event) => {
      event.preventDefault();
      const noteId = noteCard.getAttribute('data-note-id');
      if (!noteId) return;
      if (noteCard.classList.contains('note-focus')) {
        const pdfUrl = noteCard.getAttribute('data-pdf-url') || null;
        openPdfModal(noteId, pdfUrl);
        return;
      }
      focusNote(noteId);
    });
  });
}

export function renderByType(type = 'diary-scheduler') {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const selectedType = resolveTypeKey(type);

  const typeChanged = currentType !== null && currentType !== selectedType;
  const existingTypePage = document.querySelector('.timeline-page');

  if (existingTypePage && typeChanged && allNotesData.length > 0) {
    const typeMain = document.getElementById('timeline-main');
    if (typeMain) {
      renderNotesListForType(typeMain, selectedType);
      renderTypeScrollBar(
        (getNotesCountByType(allNotesData)[selectedType] ?? 0),
        getNotesCountByType(allNotesData),
        selectedType
      );
      setupTimelineDots();
      const notesForType = getNotesForType(allNotesData, selectedType);
      if (notesForType.length > 0) {
        focusNote(notesForType[0].id);
        updatePlaceholderWidth();
      } else {
        currentFocusedNoteId = null;
        updateNoteStates();
      }
    }
    const notesCountByType = getNotesCountByType(allNotesData);
    renderTypeSubMenu(selectedType, null, 0, notesCountByType);
    currentType = selectedType;
    return;
  }

  showTypeLoadingOverlay();

  let subMenuContainer = document.getElementById('sub-menu');
  if (!subMenuContainer) {
    subMenuContainer = document.createElement('aside');
    subMenuContainer.id = 'sub-menu';
    document.body.appendChild(subMenuContainer);
  }

  mainContent.className = 'app-main timeline-active';
  const mainWrapper = mainContent.closest('.main-wrapper');
  if (mainWrapper) {
    mainWrapper.classList.add('timeline-active');
  }
  document.body.classList.add('timeline-active');

  mainContent.innerHTML = `
    <div class="timeline-page by-type-page">
      <div class="timeline-container">
        <main class="timeline-main" id="timeline-main"></main>
        <div id="timeline-scrollbar"></div>
      </div>
      <div id="quick-scroll-menu"></div>
    </div>
  `;

  const timelinePage = document.querySelector('.timeline-page');
  if (timelinePage) {
    timelinePage.style.scrollSnapType = 'none';
  }

  if (existingTypePage && !typeChanged) {
    savedScrollPosition = existingTypePage.scrollLeft;
  }

  const notesCountByType = getNotesCountByType(allNotesData);
  const totalNotesCount = Object.values(notesCountByType).reduce(
    (sum, count) => sum + count,
    0
  );

  renderTypeSubMenu(selectedType, null, totalNotesCount, notesCountByType);
  const countForType = notesCountByType[selectedType] ?? 0;
  renderTypeScrollBar(countForType, notesCountByType, selectedType);

  const typeMain = document.getElementById('timeline-main');
  if (!typeMain) return;

  allNotesData = [];

  const allNotesHTML = [];
  const firstNoteId = allNotesData.length > 0 ? allNotesData[0].id : null;
  const lastNoteId = allNotesData.length > 0 ? allNotesData[allNotesData.length - 1].id : null;

  if (firstNoteId) {
    allNotesHTML.push('<div class="note-placeholder"></div>');
  }

  allNotesHTML.push(`
    <div class="no-notes">노트를 불러오는 중...</div>
  `);

  if (lastNoteId) {
    allNotesHTML.push('<div class="note-placeholder"></div>');
  }

  typeMain.innerHTML = `
    <div class="notes-list">
      ${getTypeListIntroHTML(selectedType)}
      ${allNotesHTML.join('')}
    </div>
  `;

  const quickScrollItems = typeOptions.map((option) => ({
    id: option.value,
    label: option.label
  }));

  renderQuickScrollMenu(quickScrollItems);

  loadNotionNotesAndRender(typeMain, selectedType);
  currentType = selectedType;
}

async function loadNotionNotesAndRender(typeMain, selectedType) {
  if (!typeMain) return;

  try {
    const typeItems = await getNotionTypeItems();
    removeNotionError();

    if (!Array.isArray(typeItems) || typeItems.length === 0) {
      typeMain.innerHTML = `
        <div class="notes-list">
          ${getTypeListIntroHTML(selectedType)}
          <div class="no-notes">표시할 노트가 없습니다.</div>
        </div>
      `;
      hideTypeLoadingOverlay();
      return;
    }

    allNotesData = typeItems.map((note) => ({
      ...note,
      type: resolveTypeKey(note.type || note.notebookType || note.title)
    }));

    const notesCountByType = getNotesCountByType(allNotesData);
    const totalNotesCount = Object.values(notesCountByType).reduce(
      (sum, count) => sum + count,
      0
    );

    renderTypeSubMenu(selectedType, null, totalNotesCount, notesCountByType);
    const countForType = notesCountByType[selectedType] ?? 0;
    renderTypeScrollBar(countForType, notesCountByType, selectedType);

    const notesToShow = getNotesForType(allNotesData, selectedType);
    const allNotesHTML = [];
    const firstNoteId = notesToShow.length > 0 ? notesToShow[0].id : null;
    const lastNoteId = notesToShow.length > 0 ? notesToShow[notesToShow.length - 1].id : null;

    if (firstNoteId) {
      allNotesHTML.push('<div class="note-placeholder"></div>');
    }

    if (notesToShow.length === 0) {
      allNotesHTML.push(`
        <div class="no-notes">이 타입에 해당하는 노트가 없습니다.</div>
      `);
    } else {
      notesToShow.forEach((note) => {
      const noteTitle = escapeHtml(note.title);
      const typeLabel = escapeHtml(getTypeLabel(note.type, note.type || ''));
      const description = escapeHtml(note.description || '');
      const coverSrc = note.coverFrontUrl || TRANSPARENT_PIXEL;
      const backCoverSrc = note.coverBackUrl || TRANSPARENT_PIXEL;
      const pdfUrl = note.pdfUrl || '';
      const noteId = escapeHtml(note.id);
      const typeKey = escapeHtml(note.type);

      allNotesHTML.push(`
        <article class="note-card" data-note-id="${noteId}" data-type="${typeKey}" data-pdf-url="${escapeHtml(
        pdfUrl
      )}">
          <div class="note-card-link">
            <div class="note-cover-container">
              <img 
                src="${escapeHtml(coverSrc)}" 
                alt="노트 표지" 
                class="note-cover-image note-cover-front"
                loading="lazy"
                referrerpolicy="no-referrer"
              />
              <img 
                src="${escapeHtml(backCoverSrc)}" 
                alt="노트 뒷표지" 
                class="note-cover-image note-cover-back"
                loading="lazy"
                referrerpolicy="no-referrer"
              />
            </div>
            <div class="note-info">
              <h5 class="note-info-meta">${typeLabel}</h5>
              <p class="note-info-description">${description}</p>
            </div>
          </div>
        </article>
      `);
    });
    }
    if (lastNoteId) {
      allNotesHTML.push('<div class="note-placeholder"></div>');
    }

    typeMain.innerHTML = `
      <div class="notes-list">
        ${getTypeListIntroHTML(selectedType)}
        ${allNotesHTML.join('')}
      </div>
    `;

    typeMain.querySelectorAll('.note-cover-image').forEach((img) => {
      img.addEventListener(
        'error',
        () => {
          img.classList.add('note-cover-image--error');
          console.warn('노트 표지 로드 실패:', img.src);
        },
        { once: true }
      );
    });

    waitForTypeImages(typeMain).then(hideTypeLoadingOverlay);

    typeMain.querySelectorAll('.note-card[data-note-id]').forEach((noteCard) => {
      noteCard.addEventListener('click', (event) => {
        event.preventDefault();
        const noteId = noteCard.getAttribute('data-note-id');
        if (!noteId) return;

        if (noteCard.classList.contains('note-focus')) {
          const pdfUrl = noteCard.getAttribute('data-pdf-url') || null;
          openPdfModal(noteId, pdfUrl);
          return;
        }

        focusNote(noteId);
      });
    });

    setTimeout(() => {
      if (notesToShow.length > 0) {
        focusNote(notesToShow[0].id);
      }
      savedScrollPosition = null;
      currentType = selectedType;
    }, 100);

    setupNoteFocusSystem();
    setupKeyboardNavigation();
    setupScrollObserver();
    setupHorizontalWheelScroll();
    setupTimelineDots();
    setupMainAreaDrag();
    currentType = selectedType;
  } catch (error) {
    console.warn('노션 노트 로드 실패:', error);
    showNotionError(error);
    hideTypeLoadingOverlay();
  }
}

let scrollObserver = null;

function updatePlaceholderWidth() {
  const timelinePage = document.querySelector('.timeline-page');
  if (!timelinePage) return;
  const allNoteCards = document.querySelectorAll('.note-card[data-note-id]');
  if (allNoteCards.length > 0) {
    const firstNoteCard = allNoteCards[0];
    const firstNoteRect = firstNoteCard.getBoundingClientRect();
    const placeholderWidth = timelinePage.clientWidth / 2 - firstNoteRect.width / 2;
    const placeholders = document.querySelectorAll('.note-placeholder');
    placeholders.forEach((placeholder) => {
      placeholder.style.width = `${Math.max(0, placeholderWidth)}px`;
    });
  }
}

function setupNoteFocusSystem() {
  const timelinePage = document.querySelector('.timeline-page');
  if (!timelinePage) return;

  setTimeout(updatePlaceholderWidth, 0);
  window.addEventListener('resize', updatePlaceholderWidth, { passive: true });

  const allNoteCards = document.querySelectorAll('.note-card[data-note-id]');
  if (allNoteCards.length > 0) {
    const firstNoteId = allNoteCards[0].getAttribute('data-note-id');
    currentFocusedNoteId = firstNoteId;
    updateNoteStates();
  }

  let scrollTimeout = null;

  const handleScroll = () => {
    if (isScrollingToTarget) return;

    const allNoteCards = document.querySelectorAll('.note-card[data-note-id]');
    const viewportCenter = timelinePage.scrollLeft + timelinePage.clientWidth / 2;
    let closestNote = null;
    let minDistance = Infinity;

    allNoteCards.forEach((noteCard) => {
      const noteRect = noteCard.getBoundingClientRect();
      const noteLeft = noteRect.left + timelinePage.scrollLeft;
      const noteCenter = noteLeft + noteRect.width / 2;
      const distance = Math.abs(viewportCenter - noteCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestNote = noteCard;
      }
    });

    if (closestNote) {
      const closestType = closestNote.getAttribute('data-type');
      if (closestType) {
        const previousNote = currentFocusedNoteId
          ? document.querySelector(`.note-card[data-note-id="${currentFocusedNoteId}"]`)
          : null;
        const previousType = previousNote ? previousNote.getAttribute('data-type') : null;

        if (previousType !== closestType) {
          updateActiveMenu(closestType);
        }
      }
    }

    clearTimeout(scrollTimeout);

    scrollTimeout = setTimeout(() => {
      if (closestNote) {
        const noteId = closestNote.getAttribute('data-note-id');
        if (noteId !== currentFocusedNoteId || minDistance > 5) {
          focusNote(noteId);
        }
      }
    }, 150);
  };

  timelinePage.addEventListener('scroll', handleScroll, { passive: true });

  setTimeout(() => {
    if (currentFocusedNoteId) {
      focusNote(currentFocusedNoteId);
    }
  }, 100);
}

function updateNoteStates() {
  if (!currentFocusedNoteId) {
    const allNoteCards = Array.from(document.querySelectorAll('.note-card[data-note-id]'));
    allNoteCards.forEach((noteCard) => {
      noteCard.classList.remove(
        'note-focus',
        'note-adjacent',
        'note-adjacent-adjacent',
        'note-outer'
      );
    });
    return;
  }

  const allNoteCards = Array.from(document.querySelectorAll('.note-card[data-note-id]'));

  const focusedIndex = allNoteCards.findIndex(
    (card) => card.getAttribute('data-note-id') === currentFocusedNoteId
  );

  if (focusedIndex === -1) {
    allNoteCards.forEach((noteCard) => {
      noteCard.classList.remove(
        'note-focus',
        'note-adjacent',
        'note-adjacent-adjacent',
        'note-outer'
      );
    });
    return;
  }

  allNoteCards.forEach((noteCard, index) => {
    const distance = Math.abs(index - focusedIndex);
    noteCard.classList.remove(
      'note-focus',
      'note-adjacent',
      'note-adjacent-adjacent',
      'note-outer'
    );

    if (distance === 0) {
      noteCard.classList.add('note-focus');
    } else if (distance === 1) {
      noteCard.classList.add('note-adjacent');
    } else if (distance === 2) {
      noteCard.classList.add('note-adjacent-adjacent');
    } else {
      noteCard.classList.add('note-outer');
    }
  });
}

function focusNote(noteId) {
  const noteCard = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
  if (!noteCard) return;

  const timelinePage = document.querySelector('.timeline-page');
  if (!timelinePage) return;

  isScrollingToTarget = true;
  timelinePage.style.scrollSnapType = 'none';

  const noteRect = noteCard.getBoundingClientRect();
  const timelinePageRect = timelinePage.getBoundingClientRect();
  const noteLeft = noteRect.left - timelinePageRect.left + timelinePage.scrollLeft;
  const noteCenter = noteLeft + noteRect.width / 2;
  const viewportCenter = timelinePage.clientWidth / 2;
  const targetScrollLeft = noteCenter - viewportCenter;

  timelinePage.scrollTo({
    left: targetScrollLeft,
    behavior: 'smooth'
  });

  currentFocusedNoteId = noteId;
  updateNoteStates();
  updateActiveScrollbarDot(noteId);

  const type = noteCard.getAttribute('data-type');
  if (type) {
    updateActiveMenu(type);
  }

  setTimeout(() => {
    timelinePage.style.scrollSnapType = '';
    isScrollingToTarget = false;
  }, 600);
}

function updateActiveScrollbarDot(noteId) {
  const dots = document.querySelectorAll('.scrollbar-dot');
  if (!dots.length) return;

  const notesForCurrentType = getNotesForType(allNotesData, currentType);
  const targetIndex = notesForCurrentType.findIndex((note) => note.id === noteId);
  if (targetIndex === -1) return;

  dots.forEach((dot) => {
    const dotIndex = parseInt(dot.getAttribute('data-note-index'), 10);
    dot.classList.toggle('scrollbar-dot--active', dotIndex === targetIndex);
  });
}

function openPdfModal(noteId, pdfUrl = null) {
  const existing = document.querySelector('.pdf-modal-overlay');
  if (existing) {
    existing.remove();
  }

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
  const cleanupViewer = renderNotePdfViewer(content, noteId, {
    mode: 'modal',
    pdfUrl
  });

  const closeModal = () => {
    cleanupViewer?.();
    overlay.remove();
    document.body.classList.remove('pdf-modal-open');
    document.removeEventListener('keydown', handleEscape);
  };

  const handleEscape = (event) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  };

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });
  overlay.querySelector('.pdf-modal-close')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', handleEscape);
}

function setupKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    const timelinePage = document.querySelector('.timeline-page');
    if (!timelinePage) return;

    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable)
    ) {
      return;
    }

    if (isScrollingToTarget) return;

    const allNoteCards = Array.from(document.querySelectorAll('.note-card[data-note-id]'));
    if (allNoteCards.length === 0) return;

    const currentIndex = allNoteCards.findIndex(
      (card) => card.getAttribute('data-note-id') === currentFocusedNoteId
    );

    if (currentIndex === -1) return;

    let targetIndex = -1;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentIndex > 0) {
        targetIndex = currentIndex - 1;
      }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentIndex < allNoteCards.length - 1) {
        targetIndex = currentIndex + 1;
      }
    }

    if (targetIndex !== -1) {
      const targetNoteId = allNoteCards[targetIndex].getAttribute('data-note-id');
      if (targetNoteId) {
        focusNote(targetNoteId);
      }
    }
  });
}

function setupScrollObserver() {
  const timelinePage = document.querySelector('.timeline-page');
  if (!timelinePage) return;

  if (scrollObserver) {
    scrollObserver.disconnect();
  }

  const updateActiveType = () => {
    if (isScrollingToTarget) {
      return;
    }

    if (currentFocusedNoteId) {
      const focusedNote = document.querySelector(
        `.note-card[data-note-id="${currentFocusedNoteId}"]`
      );
      if (focusedNote) {
        const type = focusedNote.getAttribute('data-type');
        if (type) {
          updateActiveMenu(type);
        }
      }
    }
  };

  setTimeout(updateActiveType, 100);
}

function updateActiveMenu(activeTypeId) {
  const subMenu = document.getElementById('sub-menu');
  if (!subMenu) return;

  const typeLinks = subMenu.querySelectorAll('.period-link');
  typeLinks.forEach((link) => {
    const href = link.getAttribute('href');
    const typeId = href ? href.split('/').pop() : '';

    if (typeId === activeTypeId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const path = `/by-type/${activeTypeId}`;
  const newUrl = BASE_URL === '/' ? path : BASE_URL.slice(0, -1) + path;
  if (window.location.pathname !== newUrl) {
    window.history.replaceState({}, '', newUrl);
  }
}

function setupHorizontalWheelScroll() {
  const timelinePage = document.querySelector('.timeline-page');
  if (!timelinePage) return;

  let wheelTimeout = null;
  let canScroll = true;

  timelinePage.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return;
      }

      e.preventDefault();

      if (isScrollingToTarget || !canScroll) return;

      const allNoteCards = Array.from(document.querySelectorAll('.note-card[data-note-id]'));
      const currentIndex = allNoteCards.findIndex(
        (card) => card.getAttribute('data-note-id') === currentFocusedNoteId
      );

      if (currentIndex === -1) return;

      if (e.deltaY > 0 && currentIndex < allNoteCards.length - 1) {
        canScroll = false;
        const nextNoteId = allNoteCards[currentIndex + 1].getAttribute('data-note-id');
        focusNote(nextNoteId);

        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
          canScroll = true;
        }, 300);
      } else if (e.deltaY < 0 && currentIndex > 0) {
        canScroll = false;
        const prevNoteId = allNoteCards[currentIndex - 1].getAttribute('data-note-id');
        focusNote(prevNoteId);

        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => {
          canScroll = true;
        }, 300);
      }
    },
    { passive: false }
  );
}

function setupTimelineDots() {
  const progressBar = document.querySelector('.scrollbar-track');
  if (!progressBar) return;

  setTimeout(() => {
    const scrollbarDots = progressBar.querySelectorAll('.scrollbar-dot');
    const noteCards = document.querySelectorAll('.note-card[data-note-id]');
    scrollbarDots.forEach((dot) => {
      dot.style.cursor = 'pointer';
      const noteIndex = parseInt(dot.getAttribute('data-note-index'), 10);
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = noteCards[noteIndex];
        if (card) {
          const noteId = card.getAttribute('data-note-id');
          if (noteId) focusNote(noteId);
        }
      });
    });

    if (currentFocusedNoteId) {
      updateActiveScrollbarDot(currentFocusedNoteId);
    }
  }, 100);
}

function setupMainAreaDrag() {
  const timelinePage = document.querySelector('.timeline-page');
  if (!timelinePage) return;

  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;

  const handleMouseDown = (e) => {
    isDragging = true;
    startX = e.pageX - timelinePage.offsetLeft;
    scrollLeft = timelinePage.scrollLeft;
    timelinePage.style.cursor = 'grabbing';
    timelinePage.style.userSelect = 'none';
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - timelinePage.offsetLeft;
    const walk = (x - startX) * 2;
    timelinePage.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    isDragging = false;
    timelinePage.style.cursor = 'grab';
    timelinePage.style.userSelect = '';
  };

  const handleMouseLeave = () => {
    isDragging = false;
    timelinePage.style.cursor = 'grab';
    timelinePage.style.userSelect = '';
  };

  timelinePage.style.cursor = 'grab';
  timelinePage.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  timelinePage.addEventListener('mouseleave', handleMouseLeave);

  let touchStartX = 0;
  let touchScrollLeft = 0;

  const handleTouchStart = (e) => {
    touchStartX = e.touches[0].pageX - timelinePage.offsetLeft;
    touchScrollLeft = timelinePage.scrollLeft;
  };

  const handleTouchMove = (e) => {
    const x = e.touches[0].pageX - timelinePage.offsetLeft;
    const walk = (x - touchStartX) * 2;
    timelinePage.scrollLeft = touchScrollLeft - walk;
  };

  timelinePage.addEventListener('touchstart', handleTouchStart, { passive: true });
  timelinePage.addEventListener('touchmove', handleTouchMove, { passive: false });
}

function showNotionError(error) {
  if (document.getElementById(NOTION_ERROR_ID)) return;

  const message =
    error?.message || 'Notion API 호출에 실패했습니다. 환경 변수/배포 설정을 확인해주세요.';

  const banner = document.createElement('div');
  banner.id = NOTION_ERROR_ID;
  banner.style.cssText =
    'position: sticky; top: 0; z-index: 10; background: rgba(200,0,0,0.1); color: #b00020; padding: 8px 12px; font-size: 12px;';
  banner.textContent = `Notion 오류: ${message}`;

  const typeMain = document.getElementById('timeline-main');
  typeMain?.prepend(banner);
}

function removeNotionError() {
  const banner = document.getElementById(NOTION_ERROR_ID);
  banner?.remove();
}

