/**
 * SideMenu 컴포넌트
 * Timeline 페이지에서 사용하는 사이드 메뉴입니다.
 */

import { periodOptions } from '../data/notesData.js';
import { getNotesFromCoverImages } from '../utils/getNotesFromCoverImages.js';
import '../components/SideMenu.css';

export function renderSideMenu(selectedPeriod, onPeriodChange, totalNotesCount, notesCountByPeriod) {
  const container = document.getElementById('side-menu');
  if (!container) return;

  container.innerHTML = `
    <aside class="side-menu">
      <nav class="side-nav">
        <ul class="period-list">
          ${periodOptions.map(period => `
            <li class="period-item">
              <a
                href="/timeline/${period.value}"
                class="period-link ${selectedPeriod === period.value ? 'active' : ''}"
                data-link
              >
                <span class="period-label">${period.label}</span>
                <span class="period-years">${period.years}</span>
              </a>
            </li>
          `).join('')}
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

