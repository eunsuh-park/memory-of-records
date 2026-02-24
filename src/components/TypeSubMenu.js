/**
 * TypeSubMenu 컴포넌트
 * By type 페이지에서 사용하는 서브 메뉴입니다.
 */

import { typeOptions } from '../data/typeOptions.js';
import '../components/SubMenu.css';

export function renderTypeSubMenu(selectedType) {
  const container = document.getElementById('sub-menu');
  if (!container) return;

  container.innerHTML = `
    <aside class="sub-menu">
      <nav class="sub-nav">
        <ul class="period-list">
          ${typeOptions
            .map((typeOption) => {
              const isActive = selectedType === typeOption.value;
              const detailText = typeOption.detail || '';
              return `
                <li class="period-item">
                  <a
                    href="/by-type/${typeOption.value}"
                    class="period-link period-link--${typeOption.value} ${isActive ? 'active' : ''}"
                    data-link
                  >
                    <span class="period-label">${typeOption.label}</span>
                    ${detailText ? `<span class="period-years">${detailText}</span>` : ''}
                  </a>
                </li>
              `;
            })
            .join('')}
        </ul>
      </nav>
    </aside>
  `;
}

