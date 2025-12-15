/**
 * SideMenu 컴포넌트
 * Timeline 페이지에서 사용하는 사이드 메뉴입니다.
 */

import { periodOptions } from '../data/notesData.js';
import '../components/SideMenu.css';

export function renderSideMenu(selectedPeriod, onPeriodChange) {
  const container = document.getElementById('side-menu');
  if (!container) return;

  container.innerHTML = `
    <aside class="side-menu">
      <nav class="side-nav">
        <h2 class="side-menu-title">시기별 노트</h2>
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
}

