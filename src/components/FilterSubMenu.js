/**
 * FilterSubMenu - Timeline / By Type 공통 사이드 필터 메뉴
 *
 * - Timeline: periodOptions (period_name → Elementary School, University, ...)
 * - By Type:  typeOptions  (notebook_type → 다이어리(일기장), 스케줄러, ...)
 *
 * filterOptions는 각 페이지에서 1:1 매칭용으로 정의된 옵션 배열
 */

import './SubMenu.css';

/**
 * 사이드 필터 메뉴 렌더링
 * @param {string} selectedValue - 현재 선택된 필터 값 (opt.value)
 * @param {string} basePath - '/timeline' | '/by-type'
 * @param {Array<{value: string, label: string, years?: string, detail?: string}>} filterOptions
 *        Timeline: periodOptions / By Type: typeOptions
 * @param {Record<string, number>} [countsByFilter] - 필터값별 노트 개수
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
