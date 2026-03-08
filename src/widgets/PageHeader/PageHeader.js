/**
 * PageHeader
 * 로고(좌) | FilterSubMenu(중앙) | Story 링크(우) 를 양끝정렬로 배치하는 헤더 위젯
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
  const isHome = currentPath === '/';

  const backIconSvg = `
    <svg class="page-header__logo-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <title>left_line</title>
      <g fill="none" fill-rule="evenodd">
        <path d="M24 0v24H0V0h24ZM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018Zm.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01-.184-.092Z"/>
        <path fill="#09244BFF" d="M8.293 12.707a1 1 0 0 1 0-1.414l5.657-5.657a1 1 0 1 1 1.414 1.414L10.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414l-5.657-5.657Z"/>
      </g>
    </svg>
  `;

  container.innerHTML = `
    <header class="page-header${isHome ? ' page-header--home' : ''}">
      <div class="page-header__left">
        <a href="/" class="page-header__logo" data-link>
          ${isHome ? '' : backIconSvg}
          <span class="page-header__logo-text">${isHome ? 'Memory of Records' : '이전 페이지로'}</span>
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
