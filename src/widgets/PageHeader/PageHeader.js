/**
 * PageHeader
 * 로고(좌) | FilterSubMenu(중앙) | Story 링크(우) 를 양끝정렬로 배치하는 헤더 위젯
 * - 뒤로가기 버튼: Story 페이지에만 존재 (헤더는 Story에서 숨김)
 */

import './PageHeader.css';
import logo from '../../logo.png';

const BASE_URL = import.meta.env.BASE_URL || '/';

function getActualPath(pathname) {
  if (BASE_URL === '/') return pathname;
  const basePathWithoutTrailingSlash = BASE_URL.endsWith('/')
    ? BASE_URL.slice(0, -1)
    : BASE_URL;
  if (pathname.startsWith(basePathWithoutTrailingSlash)) {
    return pathname.slice(basePathWithoutTrailingSlash.length) || '/';
  }
  return pathname;
}

export function renderPageHeader() {
  const container = document.getElementById('page-header');
  if (!container) return;

  const currentPath = getActualPath(window.location.pathname);

  container.innerHTML = `
    <header class="page-header">
      <div class="page-header__left">
        <a href="/" class="page-header__logo" data-link>
          <span class="page-header__logo-text">Memory of Records</span>
          <img src="${logo}" alt="Memory of Records" class="page-header__logo-image" />
        </a>
      </div>
      <div class="page-header__center" id="sub-menu">
        <!-- FilterSubMenu가 여기에 렌더링됨 -->
      </div>
      <div class="page-header__right">
        <a
          href="/story"
          class="page-header__story-link ${currentPath.startsWith('/story') ? 'active' : ''}"
          data-link
        >
          Story
        </a>
      </div>
    </header>
  `;
}
