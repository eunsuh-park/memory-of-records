/**
 * SubMenu 컴포넌트
 * Timeline 페이지에서 사용하는 서브 메뉴입니다.
 */

import { periodOptions } from '../data/notesData.js';
import '../components/SubMenu.css';

export function renderSubMenu(selectedPeriod, onPeriodChange, totalNotesCount, notesCountByPeriod) {
  const container = document.getElementById('sub-menu');
  if (!container) return;

  container.innerHTML = `
    <aside class="sub-menu">
      <nav class="sub-nav">
        <ul class="period-list">
          ${periodOptions.map(period => {
            const isElementary = period.value === 'elementary';
            const isActive = selectedPeriod === period.value;
            return `
              <li class="period-item">
                ${isElementary
                  ? `
                    <a
                      href="/timeline/${period.value}"
                      class="period-link period-link--${period.value} ${isActive ? 'active' : ''}"
                      data-link
                    >
                      <span class="period-label">${period.label}</span>
                      <span class="period-years">${period.years}</span>
                    </a>
                  `
                  : `
                    <span
                      class="period-link period-link--${period.value} ${isActive ? 'active' : ''}"
                      aria-disabled="true"
                    >
                      <span class="period-label">${period.label}</span>
                      <span class="period-years">${period.years}</span>
                    </span>
                  `}
              </li>
            `;
          }).join('')}
        </ul>
      </nav>
    </aside>
  `;

  // 메뉴 너비는 콘텐츠 기준으로 자연스럽게 결정
}

