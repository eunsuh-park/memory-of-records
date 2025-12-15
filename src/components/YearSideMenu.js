/**
 * YearSideMenu 컴포넌트
 * Year 페이지에서 사용하는 사이드 메뉴입니다.
 */

import { getAvailableYears } from '../data/notesData.js';
import '../components/YearSideMenu.css';

export function renderYearSideMenu(selectedYear, onYearChange) {
  const container = document.getElementById('year-side-menu');
  if (!container) return;

  const availableYears = getAvailableYears();
  const isOverview = selectedYear === null;

  container.innerHTML = `
    <aside class="year-side-menu">
      <nav class="year-side-nav">
        <h2 class="year-side-menu-title">연도별 노트</h2>
        <ul class="year-menu-list">
          <li class="year-menu-item">
            <a
              href="/year"
              class="year-menu-link ${isOverview ? 'active' : ''}"
              data-link
            >
              Overview
            </a>
          </li>
          ${availableYears.map(year => `
            <li class="year-menu-item">
              <a
                href="/year/${year}"
                class="year-menu-link ${selectedYear === year ? 'active' : ''}"
                data-link
              >
                ${year}년
              </a>
            </li>
          `).join('')}
        </ul>
      </nav>
    </aside>
  `;
}

