/**
 * Timeline 페이지
 * 시기별 노트를 표시하는 페이지입니다.
 */

import { periodOptions } from '../data/notesData.js';
import { renderSubMenu } from '../components/SubMenu.js';
import { renderTimelineScrollBar } from '../components/TimelineScrollBar.js';
import { renderQuickScrollMenu } from '../components/QuickScrollMenu.js';
import { getNotionNotebooks } from '../utils/notionNotebooks.js';
import { renderNotePdfViewer } from './NoteDetail.js';
import './Timeline.css';

// base 경로 가져오기
const BASE_URL = import.meta.env.BASE_URL || '/';

// 스크롤 위치 저장을 위한 전역 변수
let savedScrollPosition = null;
let currentPeriod = null; // 현재 선택된 period 추적
let isScrollingToTarget = false; // 타겟으로 스크롤 중인지 추적
let currentFocusedNoteId = null; // 현재 포커스된 노트 ID
let allNotesData = []; // 전체 노트 데이터 (순서대로)
const NOTION_ERROR_ID = 'notion-error-banner';
const TIMELINE_LOADING_OVERLAY_ID = 'timeline-loading-overlay';
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const TIMELINE_LOADING_MESSAGES = [
  '노트들을 상자에서 꺼내는 중...',
  '상자의 먼지를 털어내는 중....'
];
const TIMELINE_LOADING_MIN_VISIBLE_MS = 2500;
const TIMELINE_LOADING_FADE_MS = 200;
const TIMELINE_LOADING_TIMEOUT_MS = 7000;
let timelineOverlayShownAt = 0;
let timelineOverlayHideTimer = null;

function getRandomLoadingMessage() {
  const index = Math.floor(Math.random() * TIMELINE_LOADING_MESSAGES.length);
  return TIMELINE_LOADING_MESSAGES[index];
}

function showTimelineLoadingOverlay() {
  let overlay = document.getElementById(TIMELINE_LOADING_OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = TIMELINE_LOADING_OVERLAY_ID;
    overlay.className = 'timeline-loading-overlay';
    document.body.appendChild(overlay);
  }

  if (timelineOverlayHideTimer) {
    clearTimeout(timelineOverlayHideTimer);
    timelineOverlayHideTimer = null;
  }
  timelineOverlayShownAt = Date.now();
  overlay.classList.remove('timeline-loading-overlay--hidden', 'timeline-loading-overlay--fading');
  overlay.innerHTML = `
    <div class="timeline-loading-content" role="status" aria-live="polite">
      <div class="timeline-loading-spinner" aria-hidden="true"></div>
      <p class="timeline-loading-text">${getRandomLoadingMessage()}</p>
    </div>
  `;
}

function hideTimelineLoadingOverlay() {
  const overlay = document.getElementById(TIMELINE_LOADING_OVERLAY_ID);
  if (!overlay) return;
  const elapsed = Date.now() - timelineOverlayShownAt;
  const remaining = Math.max(0, TIMELINE_LOADING_MIN_VISIBLE_MS - elapsed);
  if (remaining === 0) {
    overlay.classList.add('timeline-loading-overlay--fading');
    timelineOverlayHideTimer = setTimeout(() => {
      overlay.classList.add('timeline-loading-overlay--hidden');
      overlay.classList.remove('timeline-loading-overlay--fading');
      timelineOverlayHideTimer = null;
    }, TIMELINE_LOADING_FADE_MS);
    return;
  }
  timelineOverlayHideTimer = setTimeout(() => {
    overlay.classList.add('timeline-loading-overlay--fading');
    setTimeout(() => {
      overlay.classList.add('timeline-loading-overlay--hidden');
      overlay.classList.remove('timeline-loading-overlay--fading');
    }, TIMELINE_LOADING_FADE_MS);
    timelineOverlayHideTimer = null;
  }, remaining);
}

function waitForTimelineImages(container) {
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
      setTimeout(resolve, TIMELINE_LOADING_TIMEOUT_MS);
    })
  ]);
}

function resolvePeriodKey(notebookType) {
  const normalized = String(notebookType || '').trim().toLowerCase();
  const match = periodOptions.find(
    (option) =>
      option.value.toLowerCase() === normalized ||
      option.label.toLowerCase() === normalized
  );
  return match?.value || periodOptions[0]?.value || 'elementary';
}

function formatPeriodRange(periodStart, periodEnd) {
  if (periodStart && periodEnd) return `${periodStart} ~ ${periodEnd}`;
  if (periodStart) return periodStart;
  if (periodEnd) return periodEnd;
  return '';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getNotesCountByPeriod(notes) {
  const counts = {};
  periodOptions.forEach((period) => {
    counts[period.value] = 0;
  });
  notes.forEach((note) => {
    const key = resolvePeriodKey(note.notebookType || note.period);
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

export function renderTimeline(period = 'elementary') {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const selectedPeriod = period || 'elementary';
  
  // period가 변경되었는지 확인
  const periodChanged = currentPeriod !== null && currentPeriod !== selectedPeriod;
  
  // 이미 timeline 페이지가 존재하는지 확인
  const existingTimelinePage = document.querySelector('.timeline-page');
  
  // 이미 timeline 페이지가 존재하고 period만 변경되는 경우, DOM 재생성 없이 스크롤만 변경
  if (existingTimelinePage && periodChanged) {
    // 서브메뉴로 이동할 경우: 해당 period의 첫 번째 노트에 포커스
    const firstNoteOfPeriod = document.querySelector(`.note-card[data-period="${selectedPeriod}"]`);
    if (firstNoteOfPeriod) {
      const firstNoteId = firstNoteOfPeriod.getAttribute('data-note-id');
      if (firstNoteId) {
        focusNote(firstNoteId);
      }
    }
    
    // 서브 메뉴 active 상태 업데이트 (스크롤 애니메이션 시작 전에 즉시 업데이트)
    const notesCountByPeriod = getNotesCountByPeriod(allNotesData);
    renderSubMenu(
      selectedPeriod,
      null,
      Object.values(notesCountByPeriod).reduce((sum, count) => sum + count, 0),
      notesCountByPeriod
    );
    
    // 배경색 업데이트
    updateBackgroundColor(selectedPeriod);
    
    // 현재 period 업데이트
    currentPeriod = selectedPeriod;
    
    return; // DOM 재생성 없이 종료
  }

  // 새로운 timeline 페이지로 들어오는 경우에만 DOM 생성
  showTimelineLoadingOverlay();

  // 서브 메뉴를 body 레벨에 추가 (fixed 위치용)
  let subMenuContainer = document.getElementById('sub-menu');
  if (!subMenuContainer) {
    subMenuContainer = document.createElement('aside');
    subMenuContainer.id = 'sub-menu';
    document.body.appendChild(subMenuContainer);
  }

  // 타임라인 스크롤바를 body 레벨에 추가 (fixed 위치용)
  let scrollBarContainer = document.getElementById('timeline-scrollbar');
  if (!scrollBarContainer) {
    scrollBarContainer = document.createElement('div');
    scrollBarContainer.id = 'timeline-scrollbar';
    document.body.appendChild(scrollBarContainer);
  }

  // 메인 콘텐츠 렌더링
  mainContent.className = 'app-main timeline-active';
  const mainWrapper = mainContent.closest('.main-wrapper');
  if (mainWrapper) {
    mainWrapper.classList.add('timeline-active');
  }
  document.body.classList.add('timeline-active');
  
  mainContent.innerHTML = `
    <div class="timeline-page">
      <div class="timeline-container">
        <main class="timeline-main" id="timeline-main"></main>
      </div>
      <div id="quick-scroll-menu"></div>
    </div>
  `;
  
  // DOM 생성 직후 scroll-snap을 즉시 비활성화하여 브라우저의 자동 snap 동작 방지
  const timelinePage = document.querySelector('.timeline-page');
  if (timelinePage) {
    timelinePage.style.scrollSnapType = 'none';
  }
  
  // DOM 교체 전에 현재 스크롤 위치 저장 (다른 페이지에서 돌아올 때만)
  if (existingTimelinePage && !periodChanged) {
    savedScrollPosition = existingTimelinePage.scrollLeft;
  }

  // 전체 노트 개수 및 period별 노트 개수 계산 (노션 데이터 로드 후 갱신)
  const notesCountByPeriod = getNotesCountByPeriod(allNotesData);
  const totalNotesCount = Object.values(notesCountByPeriod).reduce((sum, count) => sum + count, 0);

  renderSubMenu(selectedPeriod, null, totalNotesCount, notesCountByPeriod);
  renderTimelineScrollBar(totalNotesCount, notesCountByPeriod);

  const timelineMain = document.getElementById('timeline-main');
  if (!timelineMain) return;

  // 노션 데이터를 로드하기 전까지는 빈 목록으로 시작
  allNotesData = [];

  // 모든 노트를 하나의 리스트로 합치기
  const allNotesHTML = [];
  const firstNoteId = allNotesData.length > 0 ? allNotesData[0].id : null;
  const lastNoteId = allNotesData.length > 0 ? allNotesData[allNotesData.length - 1].id : null;
  
  // 첫 번째 노트 앞에 placeholder 추가
  if (firstNoteId) {
    allNotesHTML.push('<div class="note-placeholder"></div>');
  }

  // 노션 로딩 전에는 빈 리스트로 렌더링 (로딩 상태 표시)
  allNotesHTML.push(`
    <div class="no-notes">노트를 불러오는 중...</div>
  `);

  // 마지막 노트 뒤에 placeholder 추가
  if (lastNoteId) {
    allNotesHTML.push('<div class="note-placeholder"></div>');
  }

  // 하나의 notes-list로 모든 노트 렌더링
  timelineMain.innerHTML = `
    <div class="notes-list">
      ${allNotesHTML.join('')}
    </div>
  `;

  // 노션 데이터 로딩 후 노트 클릭 이벤트가 바인딩됩니다.

  // QuickScrollMenu 아이템 생성
  const quickScrollItems = periodOptions.map(option => {
    const firstYear = option.years.split('-')[0];
    return {
      id: option.value,
      label: firstYear
    };
  });

  renderQuickScrollMenu(quickScrollItems);

  // 노션 데이터 로딩 후 인터랙션 초기화
  loadNotionNotesAndRender(timelineMain, selectedPeriod);
  updateBackgroundColor(selectedPeriod);
  currentPeriod = selectedPeriod;
}

async function loadNotionNotesAndRender(timelineMain, selectedPeriod) {
  if (!timelineMain) return;

  try {
    const notebooks = await getNotionNotebooks();
    removeNotionError();

    if (!Array.isArray(notebooks) || notebooks.length === 0) {
      timelineMain.innerHTML = `
        <div class="notes-list">
          <div class="no-notes">표시할 노트가 없습니다.</div>
        </div>
      `;
      hideTimelineLoadingOverlay();
      return;
    }

    allNotesData = notebooks.map((note) => ({
      ...note,
      period: resolvePeriodKey(note.notebookType)
    }));

    const notesCountByPeriod = getNotesCountByPeriod(allNotesData);
    const totalNotesCount = Object.values(notesCountByPeriod).reduce((sum, count) => sum + count, 0);

    renderSubMenu(selectedPeriod, null, totalNotesCount, notesCountByPeriod);
    renderTimelineScrollBar(totalNotesCount, notesCountByPeriod);

    const allNotesHTML = [];
    const firstNoteId = allNotesData.length > 0 ? allNotesData[0].id : null;
    const lastNoteId = allNotesData.length > 0 ? allNotesData[allNotesData.length - 1].id : null;

    if (firstNoteId) {
      allNotesHTML.push('<div class="note-placeholder"></div>');
    }

    allNotesData.forEach((note) => {
      const noteTitle = escapeHtml(note.title);
      const notebookType = escapeHtml(note.notebookType || '');
      const periodRange = escapeHtml(formatPeriodRange(note.periodStart, note.periodEnd));
      const coverSrc = note.coverFrontUrl || TRANSPARENT_PIXEL;
      const backCoverSrc = note.coverBackUrl || TRANSPARENT_PIXEL;
      const pdfUrl = note.pdfUrl || '';
      const noteId = escapeHtml(note.id);
      const periodKey = escapeHtml(note.period);

      allNotesHTML.push(`
        <article class="note-card" data-note-id="${noteId}" data-period="${periodKey}" data-pdf-url="${escapeHtml(pdfUrl)}">
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
              <h3 class="note-info-title">${noteTitle}</h3>
              <h5 class="note-info-meta">${notebookType}</h5>
              <p class="note-info-description">${periodRange}</p>
            </div>
          </div>
        </article>
      `);
    });

    if (lastNoteId) {
      allNotesHTML.push('<div class="note-placeholder"></div>');
    }

    timelineMain.innerHTML = `
      <div class="notes-list">
        ${allNotesHTML.join('')}
      </div>
    `;

    timelineMain.querySelectorAll('.note-cover-image').forEach((img) => {
      img.addEventListener(
        'error',
        () => {
          img.classList.add('note-cover-image--error');
          console.warn('노트 표지 로드 실패:', img.src);
        },
        { once: true }
      );
    });

    waitForTimelineImages(timelineMain).then(hideTimelineLoadingOverlay);

    timelineMain.querySelectorAll('.note-card[data-note-id]').forEach(noteCard => {
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
      const timelinePage = document.querySelector('.timeline-page');
      if (!timelinePage) return;

      const firstNoteOfPeriod = document.querySelector(`.note-card[data-period="${selectedPeriod}"]`);
      if (firstNoteOfPeriod) {
        const firstNoteId = firstNoteOfPeriod.getAttribute('data-note-id');
        if (firstNoteId) {
          focusNote(firstNoteId);
          return;
        }
      }

      savedScrollPosition = null;
      currentPeriod = selectedPeriod;
    }, 100);

    setupNoteFocusSystem();
    setupKeyboardNavigation();
    setupScrollObserver();
    setupHorizontalWheelScroll();
    setupTimelineIndicator();
    setupTimelineProgressDrag();
    setupMainAreaDrag();
    updateBackgroundColor(selectedPeriod);
    currentPeriod = selectedPeriod;
  } catch (error) {
    console.warn('노션 노트 로드 실패:', error);
    showNotionError(error);
    hideTimelineLoadingOverlay();
  }
}

// Observer 인스턴스를 저장하여 중복 생성 방지
let scrollObserver = null;

/**
 * 노트 포커스 시스템 설정 함수
 * 스크롤 위치에 따라 현재 포커스된 노트를 감지하고 노트 상태를 업데이트합니다.
 */
function setupNoteFocusSystem() {
  const timelinePage = document.querySelector('.timeline-page');
  if (!timelinePage) return;

  // placeholder 너비 설정 (첫 번째 노트의 너비를 기준으로) - DOM 렌더링 후 실행
  const updatePlaceholderWidth = () => {
    const allNoteCards = document.querySelectorAll('.note-card[data-note-id]');
    if (allNoteCards.length > 0) {
      const firstNoteCard = allNoteCards[0];
      const firstNoteRect = firstNoteCard.getBoundingClientRect();
      const placeholderWidth = (timelinePage.clientWidth / 2) - (firstNoteRect.width / 2);
      
      const placeholders = document.querySelectorAll('.note-placeholder');
      placeholders.forEach(placeholder => {
        placeholder.style.width = `${Math.max(0, placeholderWidth)}px`;
      });
    }
  };

  // DOM 렌더링 후 placeholder 너비 설정
  setTimeout(updatePlaceholderWidth, 0);

  // 초기 포커스 설정 (첫 번째 노트)
  const allNoteCards = document.querySelectorAll('.note-card[data-note-id]');
  if (allNoteCards.length > 0) {
    const firstNoteId = allNoteCards[0].getAttribute('data-note-id');
    currentFocusedNoteId = firstNoteId;
    updateNoteStates();
  }

  // 스크롤 끝 감지를 위한 타이머
  let scrollTimeout = null;
  
  // 스크롤 이벤트로 포커스 노트 감지 및 자동 스냅
  const handleScroll = () => {
    if (isScrollingToTarget) return; // 프로그래매틱 스크롤 중에는 업데이트하지 않음
    
    // 실시간으로 가장 가까운 노트 찾기 (서브메뉴 업데이트용)
    const allNoteCards = document.querySelectorAll('.note-card[data-note-id]');
    const viewportCenter = timelinePage.scrollLeft + timelinePage.clientWidth / 2;
    let closestNote = null;
    let minDistance = Infinity;

    allNoteCards.forEach(noteCard => {
      const noteRect = noteCard.getBoundingClientRect();
      const noteLeft = noteRect.left + timelinePage.scrollLeft;
      const noteCenter = noteLeft + noteRect.width / 2;
      const distance = Math.abs(viewportCenter - noteCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestNote = noteCard;
      }
    });

    // 실시간으로 서브메뉴 업데이트 (가장 가까운 노트의 period 기반)
    if (closestNote) {
      const closestPeriod = closestNote.getAttribute('data-period');
      
      // period가 변경되었을 때만 서브메뉴 업데이트 (성능 최적화)
      if (closestPeriod) {
        const previousNote = currentFocusedNoteId ? 
          document.querySelector(`.note-card[data-note-id="${currentFocusedNoteId}"]`) : null;
        const previousPeriod = previousNote ? previousNote.getAttribute('data-period') : null;
        
        if (previousPeriod !== closestPeriod) {
          updateActiveMenu(closestPeriod);
        }
      }
    }
    
    // 스크롤이 끝났는지 확인하기 위해 타이머 리셋
    clearTimeout(scrollTimeout);
    
    // 스크롤이 끝난 후 가장 가까운 노트로 스냅
    scrollTimeout = setTimeout(() => {
      if (closestNote) {
        const noteId = closestNote.getAttribute('data-note-id');
        // 포커스 노트가 변경되었거나, 현재 포커스 노트가 정중앙에 없으면 스냅
        if (noteId !== currentFocusedNoteId || minDistance > 5) {
          focusNote(noteId);
        }
      }
    }, 150); // 스크롤이 끝난 후 150ms 후에 스냅
  };

  timelinePage.addEventListener('scroll', handleScroll, { passive: true });
  
  // 초기 포커스 노트를 정중앙으로 스크롤
  setTimeout(() => {
    if (currentFocusedNoteId) {
      focusNote(currentFocusedNoteId);
    }
  }, 100);
}

/**
 * 현재 포커스된 노트를 기준으로 모든 노트의 상태를 업데이트하는 함수
 */
function updateNoteStates() {
  if (!currentFocusedNoteId) {
    // focus된 노트가 없으면 모든 노트의 focus 클래스 제거 (CSS에서 자동으로 정보 숨김)
    const allNoteCards = Array.from(document.querySelectorAll('.note-card[data-note-id]'));
    allNoteCards.forEach(noteCard => {
      noteCard.classList.remove('note-focus', 'note-adjacent', 'note-adjacent-adjacent', 'note-outer');
    });
    return;
  }

  const allNoteCards = Array.from(document.querySelectorAll('.note-card[data-note-id]'));
  
  // 현재 포커스된 노트의 인덱스 찾기
  const focusedIndex = allNoteCards.findIndex(card => 
    card.getAttribute('data-note-id') === currentFocusedNoteId
  );

  if (focusedIndex === -1) {
    // focus된 노트를 찾을 수 없으면 모든 노트의 focus 클래스 제거
    allNoteCards.forEach(noteCard => {
      noteCard.classList.remove('note-focus', 'note-adjacent', 'note-adjacent-adjacent', 'note-outer');
    });
    return;
  }

  allNoteCards.forEach((noteCard, index) => {
    const distance = Math.abs(index - focusedIndex);
    noteCard.classList.remove('note-focus', 'note-adjacent', 'note-adjacent-adjacent', 'note-outer');

    if (distance === 0) {
      noteCard.classList.add('note-focus');
      // CSS에서 자동으로 정보 표시됨
    } else if (distance === 1) {
      noteCard.classList.add('note-adjacent');
    } else if (distance === 2) {
      noteCard.classList.add('note-adjacent-adjacent');
    } else {
      noteCard.classList.add('note-outer');
    }
  });
}


/**
 * 특정 노트에 포커스를 맞추고 정중앙으로 스크롤하는 함수
 */
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
  
  // 포커스 노트 변경 시 서브메뉴도 업데이트
  const period = noteCard.getAttribute('data-period');
  if (period) {
    updateActiveMenu(period);
  }

  setTimeout(() => {
    timelinePage.style.scrollSnapType = '';
    isScrollingToTarget = false;
  }, 600);
}

/**
 * PDF 뷰어 모달을 여는 함수
 */
function openPdfModal(noteId, pdfUrl = null) {
  const existing = document.querySelector('.pdf-modal-overlay');
  if (existing) {
    existing.remove();
  }

  const overlay = document.createElement('div');
  overlay.className = 'pdf-modal-overlay';
  overlay.innerHTML = `
    <div class="pdf-modal" role="dialog" aria-modal="true">
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
  document.addEventListener('keydown', handleEscape);
}

/**
 * 키보드 화살키로 노트 이동 기능 설정 함수
 */
function setupKeyboardNavigation() {
  // 키보드 이벤트 리스너 추가
  document.addEventListener('keydown', (e) => {
    // timeline 페이지가 활성화되어 있는지 확인
    const timelinePage = document.querySelector('.timeline-page');
    if (!timelinePage) return;
    
    // 입력 필드 등 다른 요소에 포커스가 있을 때는 무시
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    )) {
      return;
    }
    
    // 프로그래매틱 스크롤 중이면 무시
    if (isScrollingToTarget) return;
    
    const allNoteCards = Array.from(document.querySelectorAll('.note-card[data-note-id]'));
    if (allNoteCards.length === 0) return;
    
    // 현재 포커스된 노트의 인덱스 찾기
    const currentIndex = allNoteCards.findIndex(card => 
      card.getAttribute('data-note-id') === currentFocusedNoteId
    );
    
    if (currentIndex === -1) return;
    
    let targetIndex = -1;
    
    // 왼쪽 화살키 또는 위 화살키: 이전 노트
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentIndex > 0) {
        targetIndex = currentIndex - 1;
      }
    }
    // 오른쪽 화살키 또는 아래 화살키: 다음 노트
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentIndex < allNoteCards.length - 1) {
        targetIndex = currentIndex + 1;
      }
    }
    
    // 타겟 노트로 포커스 이동
    if (targetIndex !== -1) {
      const targetNoteId = allNoteCards[targetIndex].getAttribute('data-note-id');
      if (targetNoteId) {
        focusNote(targetNoteId);
      }
    }
  });
}

/**
 * 스크롤 위치에 따라 서브 메뉴를 자동으로 활성화하는 함수
 * handleScroll 함수 내에서 이미 실시간으로 업데이트되므로 여기서는 초기 업데이트만 수행
 */
function setupScrollObserver() {
  const timelinePage = document.querySelector('.timeline-page');
  if (!timelinePage) return;

  // 기존 observer가 있으면 해제
  if (scrollObserver) {
    scrollObserver.disconnect();
  }

  // 초기 period 업데이트 (현재 포커스된 노트의 period 기반)
  const updateActivePeriod = () => {
    if (isScrollingToTarget) {
      return;
    }
    
    if (currentFocusedNoteId) {
      const focusedNote = document.querySelector(`.note-card[data-note-id="${currentFocusedNoteId}"]`);
      if (focusedNote) {
        const period = focusedNote.getAttribute('data-period');
        if (period) {
          updateActiveMenu(period);
        }
      }
    }
  };
  
  // 초기 업데이트
  setTimeout(updateActivePeriod, 100);
}

/**
 * 서브 메뉴의 active 상태를 업데이트하는 함수
 */
function updateActiveMenu(activePeriodId) {
  const subMenu = document.getElementById('sub-menu');
  if (!subMenu) return;

  const periodLinks = subMenu.querySelectorAll('.period-link');
  periodLinks.forEach(link => {
    const href = link.getAttribute('href');
    const periodId = href ? href.split('/').pop() : '';
    
    if (periodId === activePeriodId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // URL 업데이트 (히스토리 변경 없이)
  // base 경로를 포함한 전체 경로 생성
  const path = `/timeline/${activePeriodId}`;
  const newUrl = BASE_URL === '/' ? path : BASE_URL.slice(0, -1) + path;
  if (window.location.pathname !== newUrl) {
    window.history.replaceState({}, '', newUrl);
  }

  // 배경색 업데이트
  updateBackgroundColor(activePeriodId);
}

/**
 * 현재 period에 따라 배경색을 업데이트하는 함수
 */
function updateBackgroundColor(period) {
  document.body.classList.remove(
    'period-elementary',
    'period-middle-high',
    'period-university',
    'period-after-graduation'
  );
  
  if (period) {
    document.body.classList.add(`period-${period}`);
  }
}

/**
 * 마우스 휠로 가로 스크롤 가능하도록 설정하는 함수
 * 스크롤 휠 1회 = 노트 1개 이동
 */
function setupHorizontalWheelScroll() {
  const timelinePage = document.querySelector('.timeline-page');
  if (!timelinePage) return;

  let wheelTimeout = null;
  let canScroll = true; // 스크롤 가능 여부 (디바운싱)

  timelinePage.addEventListener('wheel', (e) => {
    // 이미 가로 스크롤 휠 이벤트가 있으면 기본 동작 허용
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      return;
    }

    // 세로 스크롤을 가로채서 노트 이동으로 변환
    e.preventDefault();
    
    if (isScrollingToTarget || !canScroll) return; // 프로그래매틱 스크롤 중이거나 디바운싱 중이면 무시

    const allNoteCards = Array.from(document.querySelectorAll('.note-card[data-note-id]'));
    const currentIndex = allNoteCards.findIndex(card => 
      card.getAttribute('data-note-id') === currentFocusedNoteId
    );

    if (currentIndex === -1) return;

    // 스크롤 방향에 따라 다음/이전 노트로 이동
    if (e.deltaY > 0 && currentIndex < allNoteCards.length - 1) {
      // 아래로 스크롤 (deltaY > 0) = 다음 노트
      canScroll = false;
      const nextNoteId = allNoteCards[currentIndex + 1].getAttribute('data-note-id');
      focusNote(nextNoteId);
      
      // 300ms 후에 다시 스크롤 가능하도록 (스크롤 애니메이션 시간)
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        canScroll = true;
      }, 300);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      // 위로 스크롤 (deltaY < 0) = 이전 노트
      canScroll = false;
      const prevNoteId = allNoteCards[currentIndex - 1].getAttribute('data-note-id');
      focusNote(prevNoteId);
      
      // 300ms 후에 다시 스크롤 가능하도록
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        canScroll = true;
      }, 300);
    }
  }, { passive: false });
}

// 인디케이터 위치 업데이트 함수를 전역으로 저장
let updateIndicatorPosition = null;

/**
 * 스크롤 위치에 따라 타임라인 인디케이터 위치를 업데이트하는 함수
 */
function setupTimelineIndicator() {
  const timelinePage = document.querySelector('.timeline-page');
  const indicator = document.getElementById('scrollbar-indicator');
  if (!timelinePage || !indicator) return;

  updateIndicatorPosition = () => {
    const scrollLeft = timelinePage.scrollLeft;
    const scrollWidth = timelinePage.scrollWidth;
    const clientWidth = timelinePage.clientWidth;
    const maxScroll = scrollWidth - clientWidth;

    if (maxScroll <= 0) {
      indicator.style.left = '0%';
      return;
    }

    const scrollPercentage = (scrollLeft / maxScroll) * 100;
    indicator.style.left = `${scrollPercentage}%`;
  };

  // 초기 위치 설정
  updateIndicatorPosition();

  // 스크롤 이벤트 리스너 추가
  timelinePage.addEventListener('scroll', updateIndicatorPosition, { passive: true });
  
  // 리사이즈 이벤트도 감지
  window.addEventListener('resize', updateIndicatorPosition, { passive: true });
  
  // 리사이즈 시 placeholder 너비 업데이트
  window.addEventListener('resize', () => {
    const allNoteCards = document.querySelectorAll('.note-card[data-note-id]');
    if (allNoteCards.length > 0) {
      const firstNoteCard = allNoteCards[0];
      const firstNoteRect = firstNoteCard.getBoundingClientRect();
      const placeholderWidth = (timelinePage.clientWidth / 2) - (firstNoteRect.width / 2);
      
      const placeholders = document.querySelectorAll('.note-placeholder');
      placeholders.forEach(placeholder => {
        placeholder.style.width = `${Math.max(0, placeholderWidth)}px`;
      });
    }
  }, { passive: true });
}


/**
 * 타임라인 진행 표시줄 드래그 기능 설정
 */
function setupTimelineProgressDrag() {
  const timelinePage = document.querySelector('.timeline-page');
  const progressBar = document.querySelector('.scrollbar-track');
  const indicator = document.getElementById('scrollbar-indicator');
  
  if (!timelinePage || !progressBar || !indicator) return;

  let isDragging = false;

  const handleIndicatorMouseDown = (e) => {
    e.stopPropagation();
    isDragging = true;
    indicator.style.transition = 'none';
    timelinePage.style.scrollBehavior = 'auto';
    updatePositionFromEvent(e);
  };

  const handleProgressBarMouseDown = (e) => {
    isDragging = true;
    indicator.style.transition = 'none';
    timelinePage.style.scrollBehavior = 'auto';
    updatePositionFromEvent(e);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    updatePositionFromEvent(e);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      isDragging = false;
      indicator.style.transition = 'left 0.3s ease';
      
      // 스크롤바 드래그 완료 후 인디케이터 위치만 업데이트
      setTimeout(() => {
        if (updateIndicatorPosition) {
          updateIndicatorPosition();
        }
      }, 10);
    }
  };

  const updatePositionFromEvent = (e) => {
    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    indicator.style.left = `${percentage}%`;

    // 스크롤 위치 업데이트
    const scrollWidth = timelinePage.scrollWidth;
    const clientWidth = timelinePage.clientWidth;
    const maxScroll = scrollWidth - clientWidth;

    if (maxScroll > 0) {
      const scrollLeft = (percentage / 100) * maxScroll;
      timelinePage.scrollLeft = scrollLeft;
    }
  };

  // 스크롤바 마크 클릭 이벤트 (각 노트로 포커스)
  setTimeout(() => {
    const scrollbarMarks = progressBar.querySelectorAll('.scrollbar-mark');
    scrollbarMarks.forEach((mark) => {
      mark.style.cursor = 'pointer';
      const noteIndex = parseInt(mark.getAttribute('data-note-index'));
      mark.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // allNotesData에서 해당 인덱스의 노트 ID 찾기
        if (allNotesData[noteIndex]) {
          const noteId = allNotesData[noteIndex].id;
          focusNote(noteId);
        }
      });
    });
  }, 100);

  // 마우스 이벤트
  progressBar.addEventListener('mousedown', handleProgressBarMouseDown);
  indicator.addEventListener('mousedown', handleIndicatorMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  // 터치 이벤트
  const handleProgressBarTouchStart = (e) => {
    isDragging = true;
    indicator.style.transition = 'none';
    updatePositionFromEvent(e.touches[0]);
  };

  const handleIndicatorTouchStart = (e) => {
    e.stopPropagation();
    isDragging = true;
    indicator.style.transition = 'none';
    updatePositionFromEvent(e.touches[0]);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    updatePositionFromEvent(e.touches[0]);
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      isDragging = false;
      indicator.style.transition = 'left 0.3s ease';
      
      // 스크롤바 드래그 완료 후 인디케이터 위치만 업데이트
      setTimeout(() => {
        if (updateIndicatorPosition) {
          updateIndicatorPosition();
        }
      }, 10);
    }
  };

  progressBar.addEventListener('touchstart', handleProgressBarTouchStart, { passive: false });
  indicator.addEventListener('touchstart', handleIndicatorTouchStart, { passive: false });
  progressBar.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);
}

/**
 * 메인 영역 드래그 기능 설정
 */
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
    const walk = (x - startX) * 2; // 스크롤 속도 조절
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

  // 마우스 이벤트
  timelinePage.style.cursor = 'grab';
  timelinePage.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  timelinePage.addEventListener('mouseleave', handleMouseLeave);

  // 터치 이벤트
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
    error?.message ||
    'Notion API 호출에 실패했습니다. 환경 변수/배포 설정을 확인해주세요.';

  const banner = document.createElement('div');
  banner.id = NOTION_ERROR_ID;
  banner.style.cssText =
    'position: sticky; top: 0; z-index: 10; background: rgba(200,0,0,0.1); color: #b00020; padding: 8px 12px; font-size: 12px;';
  banner.textContent = `Notion 오류: ${message}`;

  const timelineMain = document.getElementById('timeline-main');
  timelineMain?.prepend(banner);
}

function removeNotionError() {
  const banner = document.getElementById(NOTION_ERROR_ID);
  banner?.remove();
}

