/**
 * Timeline 페이지
 * 시기별 노트를 표시하는 페이지입니다.
 */

import { periodOptions } from '../data/notesData.js';
import { renderSideMenu } from '../components/SideMenu.js';
import { renderTimelineScrollBar } from '../components/TimelineScrollBar.js';
import { renderQuickScrollMenu } from '../components/QuickScrollMenu.js';
import { getNotesFromCoverImages } from '../utils/getNotesFromCoverImages.js';
import './Timeline.css';

// 스크롤 위치 저장을 위한 전역 변수
let savedScrollPosition = null;

export function renderTimeline(period = 'elementary') {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const selectedPeriod = period || 'elementary';
  
  // 현재 페이지가 이미 timeline인지 확인하여 스크롤 위치 저장
  const existingTimelinePage = document.querySelector('.timeline-page');
  if (existingTimelinePage) {
    savedScrollPosition = existingTimelinePage.scrollLeft;
  }

  // 사이드 메뉴를 body 레벨에 추가 (fixed 위치용)
  let sideMenuContainer = document.getElementById('side-menu');
  if (!sideMenuContainer) {
    sideMenuContainer = document.createElement('aside');
    sideMenuContainer.id = 'side-menu';
    document.body.appendChild(sideMenuContainer);
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

  // 전체 노트 개수 및 period별 노트 개수 계산
  const notesCountByPeriod = {};
  periodOptions.forEach(periodOption => {
    const notes = getNotesFromCoverImages(periodOption.value);
    notesCountByPeriod[periodOption.value] = notes.length;
  });
  const totalNotesCount = Object.values(notesCountByPeriod).reduce((sum, count) => sum + count, 0);

  renderSideMenu(selectedPeriod, null, totalNotesCount, notesCountByPeriod);
  renderTimelineScrollBar(totalNotesCount, notesCountByPeriod);

  const timelineMain = document.getElementById('timeline-main');
  if (!timelineMain) return;

  // 모든 시기별로 섹션 생성 (cover 폴더의 실제 이미지 파일 기반)
  timelineMain.innerHTML = periodOptions.map(periodOption => {
    const periodNotes = getNotesFromCoverImages(periodOption.value);
    const isSelected = selectedPeriod === periodOption.value;

    return `
      <section 
        id="${periodOption.value}"
        class="timeline-period-section"
      >
        ${periodNotes.length > 0 ? `
          <div class="notes-list">
            ${periodNotes.map(note => {
              return `
              <article class="note-card">
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
                </div>
              </article>
            `;
            }).join('')}
          </div>
        ` : `
          <div class="no-notes">
            <p>이 시기에 해당하는 노트가 없습니다.</p>
          </div>
        `}
      </section>
    `;
  }).join('');

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
    
    const targetElement = document.getElementById(selectedPeriod);
    if (!targetElement) return;
    
    // 이미 스크롤 위치가 저장되어 있고 (기존 페이지에서 이동), 해당 period가 이미 보이는 경우 스크롤하지 않음
    if (savedScrollPosition !== null) {
      const targetLeft = targetElement.offsetLeft;
      const targetRight = targetLeft + targetElement.offsetWidth;
      const savedRight = savedScrollPosition + timelinePage.clientWidth;
      
      // 저장된 스크롤 위치에서 대상 period가 이미 보이는 경우, 저장된 위치로 복원
      if (targetLeft >= savedScrollPosition && targetRight <= savedRight) {
        timelinePage.scrollLeft = savedScrollPosition;
        savedScrollPosition = null;
        return;
      }
    }
    
    // 다른 period로 이동 또는 초기 로드
    let targetScrollLeft;
    
    // elementary이고 초기 로드인 경우 첫 번째 노트로 스크롤
    if (selectedPeriod === 'elementary' && savedScrollPosition === null) {
      const notesList = targetElement.querySelector('.notes-list');
      if (notesList && notesList.children.length > 0) {
        const firstNote = notesList.children[0];
        const timelinePageRect = timelinePage.getBoundingClientRect();
        const notesListRect = notesList.getBoundingClientRect();
        const noteRect = firstNote.getBoundingClientRect();
        const paddingLeft = 32; // notes-list의 padding-left (2rem = 32px)
        const notesListScrollLeft = notesListRect.left - timelinePageRect.left + timelinePage.scrollLeft;
        const noteLeftInNotesList = noteRect.left - notesListRect.left;
        targetScrollLeft = notesListScrollLeft + noteLeftInNotesList - paddingLeft;
      } else {
        targetScrollLeft = targetElement.offsetLeft;
      }
    } else {
      // 다른 경우 섹션 시작 위치로 스크롤
      targetScrollLeft = targetElement.offsetLeft;
    }
    
    timelinePage.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth'
    });
    
    savedScrollPosition = null;
  }, 100);

  // Intersection Observer를 사용하여 스크롤 위치에 따라 사이드바 메뉴 자동 활성화
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
}

// Observer 인스턴스를 저장하여 중복 생성 방지
let scrollObserver = null;

/**
 * 스크롤 위치에 따라 사이드바 메뉴를 자동으로 활성화하는 함수
 */
function setupScrollObserver() {
  const timelinePage = document.querySelector('.timeline-page');
  if (!timelinePage) return;

  const sections = document.querySelectorAll('.timeline-period-section');
  if (sections.length === 0) return;

  // 기존 observer가 있으면 해제
  if (scrollObserver) {
    sections.forEach(section => {
      scrollObserver.unobserve(section);
    });
    scrollObserver.disconnect();
  }

  // Intersection Observer 옵션 - 스크롤 위치 기반으로 더 정확하게 감지
  const observerOptions = {
    root: timelinePage,
    rootMargin: '-40% 0px -40% 0px', // 섹션이 뷰포트 중앙 40% 영역에 있을 때 트리거
    threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
  };

  // 스크롤 이벤트로도 활성 섹션 감지 (더 정확함)
  const updateActiveSection = () => {
    const scrollLeft = timelinePage.scrollLeft;
    const viewportCenter = scrollLeft + timelinePage.clientWidth / 2;
    
    let activeSection = null;
    let minDistance = Infinity;

    sections.forEach(section => {
      const sectionLeft = section.offsetLeft;
      const sectionWidth = section.offsetWidth;
      const sectionCenter = sectionLeft + sectionWidth / 2;
      const distance = Math.abs(viewportCenter - sectionCenter);
      
      // 섹션이 뷰포트에 보이는지 확인
      if (sectionLeft < scrollLeft + timelinePage.clientWidth && 
          sectionLeft + sectionWidth > scrollLeft) {
        if (distance < minDistance) {
          minDistance = distance;
          activeSection = section;
        }
      }
    });

    if (activeSection) {
      updateActiveMenu(activeSection.id);
    }
  };

  scrollObserver = new IntersectionObserver((entries) => {
    // 가장 많이 보이는 섹션 찾기
    let mostVisibleEntry = null;
    let maxIntersectionRatio = 0;

    entries.forEach(entry => {
      if (entry.intersectionRatio > maxIntersectionRatio) {
        maxIntersectionRatio = entry.intersectionRatio;
        mostVisibleEntry = entry;
      }
    });

    if (mostVisibleEntry && mostVisibleEntry.isIntersecting) {
      const sectionId = mostVisibleEntry.target.id;
      updateActiveMenu(sectionId);
    }
  }, observerOptions);

  // 스크롤 이벤트로도 활성 섹션 업데이트
  timelinePage.addEventListener('scroll', updateActiveSection, { passive: true });

  // 각 섹션을 관찰
  sections.forEach(section => {
    scrollObserver.observe(section);
  });
}

/**
 * 사이드바 메뉴의 active 상태를 업데이트하는 함수
 */
function updateActiveMenu(activePeriodId) {
  const sideMenu = document.getElementById('side-menu');
  if (!sideMenu) return;

  const periodLinks = sideMenu.querySelectorAll('.period-link');
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
  const newUrl = `/timeline/${activePeriodId}`;
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
 */
function setupHorizontalWheelScroll() {
  const timelinePage = document.querySelector('.timeline-page');
  if (!timelinePage) return;

  timelinePage.addEventListener('wheel', (e) => {
    // 이미 가로 스크롤 휠 이벤트가 있으면 기본 동작 허용
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      return;
    }

    // 세로 스크롤을 가로 스크롤로 변환
    e.preventDefault();
    
    timelinePage.scrollBy({
      left: e.deltaY,
      behavior: 'auto'
    });
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
}

/**
 * 각 노트의 시작 위치로 스냅 포인트를 계산하는 함수 (첫 번째 노트가 잘리지 않도록)
 */
function calculateSnapPoints() {
  const timelinePage = document.querySelector('.timeline-page');
  const sections = document.querySelectorAll('.timeline-period-section');
  if (!timelinePage || sections.length === 0) return [];

  const snapPoints = [];

  const timelinePageRect = timelinePage.getBoundingClientRect();
  
  sections.forEach((section, sectionIndex) => {
    const notesList = section.querySelector('.notes-list');
    if (!notesList || notesList.children.length === 0) return;

    // 노트 리스트의 실제 스크롤 위치 계산
    const notesListRect = notesList.getBoundingClientRect();
    const notesListScrollLeft = notesListRect.left - timelinePageRect.left + timelinePage.scrollLeft;
    const paddingLeft = 32; // notes-list의 padding-left (2rem = 32px)
    
    const totalNotes = notesList.children.length;
    
    // 각 노트의 시작 위치를 스냅 포인트로 계산
    for (let i = 0; i < totalNotes; i++) {
      const note = notesList.children[i];
      const noteRect = note.getBoundingClientRect();
      
      // 노트의 왼쪽 가장자리가 타임라인 페이지의 왼쪽 가장자리에 맞도록 스냅 포인트 계산
      const noteLeftInNotesList = noteRect.left - notesListRect.left;
      const snapLeft = notesListScrollLeft + noteLeftInNotesList - paddingLeft;
      
      snapPoints.push({
        scrollLeft: snapLeft,
        sectionIndex: sectionIndex,
        noteIndex: i
      });
    }
  });

  return snapPoints;
}

/**
 * 가장 가까운 스냅 포인트를 찾는 함수
 */
function findNearestSnapPoint(currentScrollLeft, snapPoints) {
  if (snapPoints.length === 0) return null;

  let nearest = snapPoints[0];
  let minDistance = Math.abs(currentScrollLeft - snapPoints[0].scrollLeft);

  snapPoints.forEach(point => {
    const distance = Math.abs(currentScrollLeft - point.scrollLeft);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = point;
    }
  });

  return nearest;
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
  let snapPoints = [];

  // 초기 스냅 포인트 계산 (렌더링 완료 후)
  const updateSnapPoints = () => {
    snapPoints = calculateSnapPoints();
  };
  
  // DOM이 완전히 렌더링된 후 스냅 포인트 계산
  setTimeout(() => {
    updateSnapPoints();
  }, 100);
  
  window.addEventListener('resize', () => {
    setTimeout(updateSnapPoints, 100);
  });

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
      
      // 스냅 포인트로 이동
      setTimeout(() => {
        const currentScrollLeft = timelinePage.scrollLeft;
        const nearestSnap = findNearestSnapPoint(currentScrollLeft, snapPoints);
        
        if (nearestSnap) {
          timelinePage.style.scrollBehavior = 'smooth';
          timelinePage.scrollTo({
            left: nearestSnap.scrollLeft,
            behavior: 'smooth'
          });
          
          // 스크롤 완료 후 인디케이터 위치 업데이트
          setTimeout(() => {
            if (updateIndicatorPosition) {
              updateIndicatorPosition();
            }
          }, 300);
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
      
      // 스냅 포인트로 이동
      setTimeout(() => {
        const currentScrollLeft = timelinePage.scrollLeft;
        const nearestSnap = findNearestSnapPoint(currentScrollLeft, snapPoints);
        
        if (nearestSnap) {
          timelinePage.style.scrollBehavior = 'smooth';
          timelinePage.scrollTo({
            left: nearestSnap.scrollLeft,
            behavior: 'smooth'
          });
          
          // 스크롤 완료 후 인디케이터 위치 업데이트
          setTimeout(() => {
            if (updateIndicatorPosition) {
              updateIndicatorPosition();
            }
          }, 300);
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

