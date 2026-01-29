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

  // 가장 긴 메뉴 항목의 너비에 맞춰 모든 항목의 너비 통일
  setTimeout(() => {
    const links = container.querySelectorAll('.period-link');
    if (links.length > 0) {
      let maxWidth = 0;
      links.forEach(link => {
        const width = link.getBoundingClientRect().width;
        if (width > maxWidth) {
          maxWidth = width;
        }
      });
      links.forEach(link => {
        link.style.width = `${maxWidth}px`;
      });
    }
  }, 0);
}

