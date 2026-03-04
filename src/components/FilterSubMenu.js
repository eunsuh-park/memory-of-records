/**
 * FilterSubMenu
 *
 * Timeline / By Type 페이지의 사이드 필터 메뉴를 렌더링합니다.
 * 옵션·경로·카운트를 인자로 받아 공통 UI로 그립니다.
 *
 * - Timeline: filterOptions = periodOptions (시기별)
 * - By Type:  filterOptions = typeOptions  (노트 타입별)
 */

import './SubMenu.css';

/**
 * #sub-menu 컨테이너에 필터 링크 목록을 그립니다.
 *
 * @param {string} selectedValue - 현재 선택된 값 (opt.value)
 * @param {string} basePath - 링크 prefix. '/timeline' 또는 '/by-type'
 * @param {Array<{value: string, label: string, years?: string, detail?: string}>} filterOptions - 표시할 필터 옵션 배열
 * @param {Record<string, number>} [countsByFilter] - 옵션별 노트 개수 (메뉴에 숫자 표시)
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
