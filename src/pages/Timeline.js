/**
 * Timeline 페이지
 * 시기별 노트를 표시하는 페이지입니다.
 */

import { getNotesByPeriod, periodOptions } from '../data/notesData.js';
import { renderSideMenu } from '../components/SideMenu.js';
import { renderQuickScrollMenu } from '../components/QuickScrollMenu.js';
import { getCoverImagePath, getBackCoverImagePath } from '../utils/coverImage.js';
import './Timeline.css';

export function renderTimeline(period = 'elementary') {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const selectedPeriod = period || 'elementary';

  // 사이드 메뉴 렌더링
  mainContent.innerHTML = `
    <div class="timeline-page">
      <div class="timeline-container">
        <aside id="side-menu"></aside>
        <main class="timeline-main" id="timeline-main"></main>
      </div>
      <div id="quick-scroll-menu"></div>
    </div>
  `;

  renderSideMenu(selectedPeriod);

  const timelineMain = document.getElementById('timeline-main');
  if (!timelineMain) return;

  // 모든 시기별로 섹션 생성
  timelineMain.innerHTML = periodOptions.map(periodOption => {
    const periodNotes = getNotesByPeriod(periodOption.value);
    const isSelected = selectedPeriod === periodOption.value;

    return `
      <section 
        id="${periodOption.value}"
        class="timeline-period-section"
      >
        <header class="timeline-header">
          <h1>${periodOption.label}</h1>
          <p class="timeline-years">${periodOption.years}</p>
        </header>

        ${periodNotes.length > 0 ? `
          <div class="notes-list">
            ${periodNotes.map(note => {
              const coverImagePath = getCoverImagePath(note);
              const backCoverImagePath = getBackCoverImagePath(note);
              return `
              <article class="note-card">
                <a href="/note/${note.id}" class="note-card-link" data-link>
                  ${coverImagePath ? `
                    <div class="note-cover-container">
                      <img 
                        src="${coverImagePath}" 
                        alt="${note.title} 표지" 
                        class="note-cover-image note-cover-front"
                      />
                      ${backCoverImagePath ? `
                      <img 
                        src="${backCoverImagePath}" 
                        alt="${note.title} 뒷표지" 
                        class="note-cover-image note-cover-back"
                      />
                      ` : ''}
                      <div class="note-card-fallback" style="display: none;">
                        <h2 class="note-card-title">${note.title}</h2>
                        <div class="note-card-meta">
                          <span class="note-card-year">${note.year}년</span>
                        </div>
                        <p class="note-card-preview">
                          ${note.content.length > 100 
                            ? note.content.substring(0, 100) + '...' 
                            : note.content}
                        </p>
                      </div>
                    </div>
                  ` : `
                    <div class="note-card-fallback">
                      <h2 class="note-card-title">${note.title}</h2>
                      <div class="note-card-meta">
                        <span class="note-card-year">${note.year}년</span>
                      </div>
                      <p class="note-card-preview">
                        ${note.content.length > 100 
                          ? note.content.substring(0, 100) + '...' 
                          : note.content}
                      </p>
                    </div>
                  `}
                </a>
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

  // 선택된 시기로 스크롤
  setTimeout(() => {
    const targetElement = document.getElementById(selectedPeriod);
    if (targetElement) {
      const navHeight = 64;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navHeight;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, 100);
}

