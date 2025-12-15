/**
 * Year 페이지
 * 연도별 노트를 표시하는 페이지입니다.
 */

import { getNotesByYear, getAvailableYears } from '../data/notesData.js';
import { renderYearSideMenu } from '../components/YearSideMenu.js';
import { renderQuickScrollMenu } from '../components/QuickScrollMenu.js';
import { router } from '../router.js';
import './Year.css';

export function renderYear(year = null) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const selectedYear = year;

  // 사이드 메뉴 렌더링
  mainContent.innerHTML = `
    <div class="year-page">
      <div class="year-container">
        <aside id="year-side-menu"></aside>
        <main class="year-main" id="year-main"></main>
      </div>
      <div id="quick-scroll-menu"></div>
    </div>
  `;

  renderYearSideMenu(selectedYear);

  const yearMain = document.getElementById('year-main');
  if (!yearMain) return;

  const availableYears = getAvailableYears();

  // Overview 섹션
  yearMain.innerHTML = `
    <section id="overview" class="year-section">
      <div class="overview-content">
        <h1>Year Overview</h1>
        <p class="overview-description">
          연도별로 정리된 노트들을 탐색해보세요.
        </p>
        <div class="year-stats">
          ${availableYears.map(y => {
            const yearNotes = getNotesByYear(y);
            return `
              <a href="/year/${y}" class="year-stat-card" data-link>
                <h2>${y}년</h2>
                <p class="stat-count">${yearNotes.length}개의 노트</p>
              </a>
            `;
          }).join('')}
        </div>
      </div>
    </section>

    ${availableYears.map(y => {
      const yearNotes = getNotesByYear(y);
      return `
        <section id="year-${y}" class="year-section">
          <header class="year-header">
            <h1>${y}년</h1>
            <p class="year-note-count">${yearNotes.length}개의 노트</p>
          </header>

          ${yearNotes.length > 0 ? `
            <div class="notes-list">
              ${yearNotes.map(note => `
                <article class="note-card">
                  <a href="/note/${note.id}" class="note-card-link" data-link>
                    <h2 class="note-card-title">${note.title}</h2>
                    <div class="note-card-meta">
                      <span class="note-card-period">${note.periodName}</span>
                    </div>
                    <p class="note-card-preview">
                      ${note.content.length > 100 
                        ? note.content.substring(0, 100) + '...' 
                        : note.content}
                    </p>
                  </a>
                </article>
              `).join('')}
            </div>
          ` : `
            <div class="no-notes">
              <p>이 연도에 해당하는 노트가 없습니다.</p>
            </div>
          `}
        </section>
      `;
    }).join('')}
  `;

  // QuickScrollMenu 아이템 생성
  const quickScrollItems = [
    { id: 'overview', label: 'Overview' },
    ...availableYears.map(y => ({
      id: `year-${y}`,
      label: `${y}`
    }))
  ];

  renderQuickScrollMenu(quickScrollItems);

  // 선택된 연도로 스크롤
  setTimeout(() => {
    const targetId = selectedYear ? `year-${selectedYear}` : 'overview';
    const targetElement = document.getElementById(targetId);
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

