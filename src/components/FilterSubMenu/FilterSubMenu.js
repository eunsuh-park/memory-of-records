/**
 * FilterSubMenu
 *
 * Timeline / By Type 페이지의 사이드 필터 메뉴를 렌더링합니다.
 * 옵션·경로·카운트를 인자로 받아 공통 UI로 그립니다.
 *
 * - Timeline: filterOptions = periodOptions (시기별)
 * - By Type:  filterOptions = typeOptions  (노트 타입별)
 * - viewModeToggle: Timeline|By Type|Favorites 뷰 모드 토글
 * - controls: 정렬
 * - 모바일: 상단 접이식 네비 (캐러셀 스크롤 시 자동 접힘)
 */

import { render as renderChip } from '../FilterChip/FilterChip.js';
import { render as renderSelect } from '../Select/Select.js';
import { FAVORITES_PATH } from '../../utils/noteFavorites.js';
import './FilterSubMenu.css';

const SORT_OPTIONS = [
  { value: 'default', label: '기본순' },
  { value: 'title', label: '제목순' },
  { value: 'pages', label: '장수순' },
  { value: 'size', label: '사이즈순' }
];

/** 모바일 접이식 네비 상태 (리렌더 시 유지) */
let filterSubMenuCollapsed = false;

function isMobileFilterNav() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
}

function applyCollapsedState(menu) {
  if (!menu) return;
  const collapsed = filterSubMenuCollapsed;
  menu.classList.toggle('is-collapsed', collapsed);
  document.body.classList.toggle('filter-nav-collapsed', collapsed);
  document.body.classList.toggle('filter-nav-open', !collapsed);
  const btn = menu.querySelector('.sub-menu__toggle');
  if (btn) {
    btn.setAttribute('aria-expanded', String(!collapsed));
    btn.setAttribute('aria-label', collapsed ? '필터 메뉴 열기' : '필터 메뉴 닫기');
    btn.setAttribute('title', collapsed ? '필터 메뉴 열기' : '필터 메뉴 닫기');
  }
  if (typeof window.__syncPageHeaderNavToggle === 'function') {
    window.__syncPageHeaderNavToggle();
  }
}

export function isFilterSubMenuCollapsed() {
  return filterSubMenuCollapsed;
}

/**
 * 모바일 필터 네비를 접거나 펼칩니다.
 * @param {boolean} collapsed
 */
export function setFilterSubMenuCollapsed(collapsed) {
  filterSubMenuCollapsed = !!collapsed;
  const menu = document.querySelector('#sub-menu .sub-menu');
  applyCollapsedState(menu);
}

/** 모바일 필터 네비를 접습니다 (캐러셀 스크롤 시). */
export function collapseFilterSubMenu() {
  if (!isMobileFilterNav()) return;
  if (filterSubMenuCollapsed) return;
  setFilterSubMenuCollapsed(true);
}

/**
 * #sub-menu 컨테이너에 필터 링크 목록을 그립니다.
 *
 * @param {string} selectedValue - 현재 선택된 값 (opt.value)
 * @param {string} basePath - 링크 prefix. '/timeline' 또는 '/by-type'
 * @param {Array<{value: string, label: string}>} filterOptions - 표시할 필터 옵션 배열
 * @param {Record<string, number>} [countsByFilter] - 옵션별 노트 개수 (메뉴에 숫자 표시)
 * @param {{ current: 'timeline'|'type'|'favorites' }} [viewModeToggle] - 뷰 모드 토글
 * @param {{
 *   sortKey?: string,
 *   onSortChange?: (value: string) => void
 * }} [controls]
 */
export function renderFilterSubMenu(
  selectedValue,
  basePath,
  filterOptions,
  countsByFilter = {},
  viewModeToggle = null,
  controls = null
) {
  const container = document.getElementById('sub-menu');
  if (!container) return;

  const timelineHref =
    viewModeToggle?.current === 'timeline' && selectedValue
      ? `/timeline/${selectedValue}`
      : '/timeline';
  const byTypeHref =
    viewModeToggle?.current === 'type' && selectedValue ? `/by-type/${selectedValue}` : '/by-type';
  const favoritesHref = FAVORITES_PATH;
  const viewToggleHtml = viewModeToggle
    ? `
    <div class="view-mode-toggle">
      <a href="${timelineHref}" class="view-mode-link ${viewModeToggle.current === 'timeline' ? 'active' : ''}" data-link>Timeline</a>
      <a href="${byTypeHref}" class="view-mode-link ${viewModeToggle.current === 'type' ? 'active' : ''}" data-link>By type</a>
      <a href="${favoritesHref}" class="view-mode-link ${viewModeToggle.current === 'favorites' ? 'active' : ''}" data-link>Favorites</a>
    </div>
  `
    : '';

  const sortKey = controls?.sortKey || 'default';
  const controlsHtml = controls
    ? `
    <div class="filter-controls">
      ${renderSelect({
        tone: 'pill',
        ariaLabel: '정렬',
        options: SORT_OPTIONS,
        value: sortKey,
        className: 'filter-sort__select'
      })}
    </div>
  `
    : '';

  container.innerHTML = `
    <aside class="sub-menu">
      <nav class="sub-nav" id="sub-menu-panel">
        ${viewToggleHtml}
        <ul class="filter-list">
          ${filterOptions
            .map(
              (opt) => `
              <li class="filter-item">
                ${renderChip({
                  label: opt.label,
                  labelMobile: opt.labelMobile || '',
                  count: countsByFilter[opt.value] ?? 0,
                  href: `${basePath}/${opt.value}`,
                  active: selectedValue === opt.value,
                  className: `chip--${opt.value}`
                })}
              </li>`
            )
            .join('')}
        </ul>
        ${controlsHtml}
      </nav>
    </aside>
  `;

  const menu = container.querySelector('.sub-menu');
  applyCollapsedState(menu);

  if (!controls) return;

  const sortSelect = container.querySelector('.filter-sort__select');
  sortSelect?.addEventListener('change', () => {
    if (typeof controls.onSortChange === 'function') {
      controls.onSortChange(sortSelect.value);
    }
  });
}
