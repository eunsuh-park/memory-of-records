/**
 * FilterSubMenu
 *
 * Timeline / By Type 페이지의 사이드 필터 메뉴를 렌더링합니다.
 * 옵션·경로·카운트를 인자로 받아 공통 UI로 그립니다.
 *
 * - Timeline: filterOptions = periodOptions (시기별)
 * - By Type:  filterOptions = typeOptions  (노트 타입별)
 * - viewModeToggle: Timeline|By Type 뷰 모드 토글 (통합 페이지에서 사용)
 */

import './FilterSubMenu.css';

/**
 * #sub-menu 컨테이너에 필터 링크 목록을 그립니다.
 *
 * @param {string} selectedValue - 현재 선택된 값 (opt.value)
 * @param {string} basePath - 링크 prefix. '/timeline' 또는 '/by-type'
 * @param {Array<{value: string, label: string}>} filterOptions - 표시할 필터 옵션 배열
 * @param {Record<string, number>} [countsByFilter] - 옵션별 노트 개수 (메뉴에 숫자 표시)
 * @param {{ current: 'timeline'|'type' }} [viewModeToggle] - 뷰 모드 토글 (Timeline | By Type)
 */
export function renderFilterSubMenu(selectedValue, basePath, filterOptions, countsByFilter = {}, viewModeToggle = null) {
  const container = document.getElementById('sub-menu');
  if (!container) return;

  const timelineHref = viewModeToggle?.current === 'timeline' && selectedValue ? `/timeline/${selectedValue}` : '/timeline';
  const byTypeHref = viewModeToggle?.current === 'type' && selectedValue ? `/by-type/${selectedValue}` : '/by-type';
  const viewToggleHtml = viewModeToggle ? `
    <div class="view-mode-toggle">
      <a href="${timelineHref}" class="view-mode-link ${viewModeToggle.current === 'timeline' ? 'active' : ''}" data-link>Timeline</a>
      <a href="${byTypeHref}" class="view-mode-link ${viewModeToggle.current === 'type' ? 'active' : ''}" data-link>By type</a>
    </div>
  ` : '';

  container.innerHTML = `
    <aside class="sub-menu">
      <nav class="sub-nav">
        ${viewToggleHtml}
        <ul class="filter-list">
          ${filterOptions.map((opt) => {
            const isActive = selectedValue === opt.value;
            const count = countsByFilter[opt.value] ?? 0;
            return `
              <li class="filter-item">
                <a
                  href="${basePath}/${opt.value}"
                  class="filter-link filter-link--${opt.value} ${isActive ? 'active' : ''}"
                  data-link
                >
                  ${opt.labelMobile
                    ? `<span class="filter-label filter-label--desktop">${opt.label}</span><span class="filter-label filter-label--mobile">${opt.labelMobile}</span>`
                    : `<span class="filter-label">${opt.label}</span>`
                  }
                  ${count > 0 ? `<span class="filter-count">${count}</span>` : ''}
                </a>
              </li>
            `;
          }).join('')}
        </ul>
      </nav>
    </aside>
  `;
}
