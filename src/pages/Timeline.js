/**
 * Timeline 페이지
 * 시기별 노트를 표시하는 페이지입니다.
 */

import { periodOptions, notesData } from '../data/notesData.js';
import { renderSubMenu } from '../components/SubMenu.js';
import { renderTimelineScrollBar } from '../components/TimelineScrollBar.js';
import { renderQuickScrollMenu } from '../components/QuickScrollMenu.js';
import { getNotesFromCoverImages } from '../utils/getNotesFromCoverImages.js';
import './Timeline.css';

// base 경로 가져오기
const BASE_URL = import.meta.env.BASE_URL || '/';

// 스크롤 위치 저장을 위한 전역 변수
let savedScrollPosition = null;
let currentPeriod = null; // 현재 선택된 period 추적
let isScrollingToTarget = false; // 타겟으로 스크롤 중인지 추적
let currentFocusedNoteId = null; // 현재 포커스된 노트 ID
let allNotesData = []; // 전체 노트 데이터 (순서대로)

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
    const notesCountByPeriod = {};
    periodOptions.forEach(periodOption => {
      const notes = getNotesFromCoverImages(periodOption.value);
      notesCountByPeriod[periodOption.value] = notes.length;
    });
    renderSubMenu(selectedPeriod, null, Object.values(notesCountByPeriod).reduce((sum, count) => sum + count, 0), notesCountByPeriod);
    
    // 배경색 업데이트
    updateBackgroundColor(selectedPeriod);
    
    // 현재 period 업데이트
    currentPeriod = selectedPeriod;
    
    return; // DOM 재생성 없이 종료
  }

  // 새로운 timeline 페이지로 들어오는 경우에만 DOM 생성
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

  // 전체 노트 개수 및 period별 노트 개수 계산
  const notesCountByPeriod = {};
  periodOptions.forEach(periodOption => {
    const notes = getNotesFromCoverImages(periodOption.value);
    notesCountByPeriod[periodOption.value] = notes.length;
  });
  const totalNotesCount = Object.values(notesCountByPeriod).reduce((sum, count) => sum + count, 0);

  renderSubMenu(selectedPeriod, null, totalNotesCount, notesCountByPeriod);
  renderTimelineScrollBar(totalNotesCount, notesCountByPeriod);

  const timelineMain = document.getElementById('timeline-main');
  if (!timelineMain) return;

  // 전체 노트 데이터 수집 (순서대로)
  allNotesData = [];
  periodOptions.forEach(periodOption => {
    const periodNotes = getNotesFromCoverImages(periodOption.value);
    periodNotes.forEach(note => {
      allNotesData.push({
        ...note,
        period: periodOption.value
      });
    });
  });

  // 모든 노트를 하나의 리스트로 합치기
  const allNotesHTML = [];
  const firstNoteId = allNotesData.length > 0 ? allNotesData[0].id : null;
  const lastNoteId = allNotesData.length > 0 ? allNotesData[allNotesData.length - 1].id : null;
  
  // 첫 번째 노트 앞에 placeholder 추가
  if (firstNoteId) {
    allNotesHTML.push('<div class="note-placeholder"></div>');
  }

  // 모든 노트 추가
  allNotesData.forEach(note => {
    // notesData에서 매칭되는 노트 정보 찾기 (id 기반)
    const noteData = notesData.find(n => {
      // note.id가 "elementary-05-1" 형식이면 숫자 부분 추출
      const noteIdStr = String(note.id);
      if (noteIdStr.includes('-')) {
        // period와 숫자로 매칭 시도
        return false; // 일단 기본값 사용
      }
      return n.id === parseInt(note.id);
    });
    
    const noteTitle = noteData?.title || `노트 ${note.id}`;
    const diaryCount = noteData?.diaryCount || '0';
    const noteSize = noteData?.size || 'A5';
    const noteDescription = noteData?.content || noteData?.description || '노트에 대한 간단한 소개입니다.';
    
    allNotesHTML.push(`
      <article class="note-card" data-note-id="${note.id}" data-period="${note.period}" data-note-title="${noteTitle}" data-diary-count="${diaryCount}" data-note-size="${noteSize}" data-note-description="${noteDescription}">
        <div class="note-card-link">
          <div class="note-cover-container">
            <img 
              src="${note.coverPath}" 
              alt="노트 표지" 
              class="note-cover-image note-cover-front"
              onerror="this.style.display='none';"
            />
            <img 
              src="${note.backCoverPath}" 
              alt="노트 뒷표지" 
              class="note-cover-image note-cover-back"
              onerror="this.style.display='none';"
            />
          </div>
          <div class="note-info">
            <h3 class="note-info-title">${noteTitle}</h3>
            <h5 class="note-info-meta">${diaryCount}개 / ${noteSize}</h5>
            <p class="note-info-description">${noteDescription}</p>
          </div>
        </div>
      </article>
    `);
  });

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

  // QuickScrollMenu 아이템 생성
  const quickScrollItems = periodOptions.map(option => {
    const firstYear = option.years.split('-')[0];
    return {
      id: option.value,
      label: firstYear
    };
  });

  renderQuickScrollMenu(quickScrollItems);

  // 선택된 시기로 스크롤 처리
  setTimeout(() => {
    const timelinePage = document.querySelector('.timeline-page');
    if (!timelinePage) return;
    
    // 서브메뉴로 이동할 경우: 해당 period의 첫 번째 노트에 포커스
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

  // 노트 포커스 시스템 초기화
  setupNoteFocusSystem();
  
  // 키보드 화살키로 노트 이동 기능 설정
  setupKeyboardNavigation();
  
  // Intersection Observer를 사용하여 스크롤 위치에 따라 서브 메뉴 자동 활성화
  setupScrollObserver();

  // 마우스 휠로 가로 스크롤 가능하도록 설정
  setupHorizontalWheelScroll();

  // 스크롤 위치에 따라 타임라인 인디케이터 업데이트
  setupTimelineIndicator();

  // 타임라인 진행 표시줄 드래그 기능 설정
  setupTimelineProgressDrag();

  // 메인 영역 드래그 기능 설정
  setupMainAreaDrag();

  // 초기 배경색 설정
  updateBackgroundColor(selectedPeriod);
  
  // 현재 period 업데이트
  currentPeriod = selectedPeriod;
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

