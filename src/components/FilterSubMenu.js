/**
 * FilterSubMenu - Timeline / By Type 공통 필터 메뉴
 * SubMenu(period_name) + TypeSubMenu(notebook_type) 통합
 */

import './SubMenu.css';

/**
 * @param {Object} params
 * @param {string} selectedValue - 현재 선택된 필터 값
 * @param {string} basePath - '/timeline' | '/by-type'
 * @param {Array<{value: string, label: string, years?: string, detail?: string}>} filterOptions
 * @param {Record<string, number>} [countsByFilter] - 필터값별 노트 개수 (있으면 카운트 표시)
 */
export function renderFilterSubMenu(selectedValue, basePath, filterOptions, countsByFilter = {}) {
  const container = document.getElementById('sub-menu');
  if (!container) return;

  container.innerHTML = `
    <aside class="sub-menu">
      <nav class="sub-nav">
        <ul class="period-list">
          ${filterOptions.map((opt) => {
            const isActive = selectedValue === opt.value;
            const count = countsByFilter[opt.value] ?? 0;
            const sublabel = opt.years || opt.detail || '';
            return `
              <li class="period-item">
                <a
                  href="${basePath}/${opt.value}"
                  class="period-link period-link--${opt.value} ${isActive ? 'active' : ''}"
                  data-link
                >
                  <span class="period-label">${opt.label}</span>
                  ${sublabel ? `<span class="period-years">${sublabel}</span>` : ''}
                  ${count > 0 ? `<span class="period-count">${count}</span>` : ''}
                </a>
              </li>
            `;
          }).join('')}
        </ul>
      </nav>
    </aside>
  `;
}
