/**
 * Navigation 컴포넌트
 * 모든 페이지에 표시되는 네비게이션 헤더입니다.
 */

import '../components/TopNavigation.css';
import logo from '../logo.png';

// base 경로 가져오기
const BASE_URL = import.meta.env.BASE_URL || '/';

// base 경로를 제거한 실제 경로 반환
function getActualPath(pathname) {
  if (BASE_URL === '/') {
    return pathname;
  }
  // base 경로가 있으면 제거
  // BASE_URL은 항상 '/'로 끝나므로, 마지막 '/'를 제거한 길이만큼 슬라이스
  const basePathWithoutTrailingSlash = BASE_URL.endsWith('/')
    ? BASE_URL.slice(0, -1)
    : BASE_URL;

  if (pathname.startsWith(basePathWithoutTrailingSlash)) {
    const actualPath = pathname.slice(basePathWithoutTrailingSlash.length) || '/';
    return actualPath;
  }
  return pathname;
}

export function renderNavigation() {
  const container = document.getElementById('navigation');
  if (!container) return;

  const currentPath = getActualPath(window.location.pathname);

  const backIconSvg = `
    <svg class="logo-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <title>left_line</title>
      <g id="left_line" fill="none" fill-rule="evenodd">
        <path d="M24 0v24H0V0h24ZM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018Zm.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01-.184-.092Z"/>
        <path fill="#09244BFF" d="M8.293 12.707a1 1 0 0 1 0-1.414l5.657-5.657a1 1 0 1 1 1.414 1.414L10.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414l-5.657-5.657Z"/>
      </g>
    </svg>
  `;
  const menuIconSvg = `
    <svg class="nav-hamburger-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <title>menu_line</title>
      <g id="menu_line" fill="none">
        <path d="M24 0v24H0V0h24ZM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01-.184-.092Z"/>
        <path fill="#09244BFF" d="M20 18a1 1 0 0 1 .117 1.993L20 20H4a1 1 0 0 1-.117-1.993L4 18zm0-7a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2zm0-7a1 1 0 1 1 0 2H4a1 1 0 0 1 0-2z"/>
      </g>
    </svg>
  `;

  const isHome = currentPath === '/';

  container.innerHTML = `
    <nav class="navigation${isHome ? ' navigation--home' : ''}">
      <div class="nav-container">
        <a href="/" class="logo" data-link>
          ${backIconSvg}
          <span class="logo-text">Back</span>
          <img src="${logo}" alt="Memory of Records" class="logo-image" />
        </a>
        <ul class="nav-menu">
          <li>
            <a
              href="/timeline"
              class="${currentPath.startsWith('/timeline') ? 'active' : ''}"
              data-link
            >
              Timeline
            </a>
          </li>
          <li>
            <a
              href="/by-type"
              class="${currentPath.startsWith('/by-type') ? 'active' : ''}"
              data-link
            >
              By type
            </a>
          </li>
          <li>
            <a
              href="/jukebox"
              class="${currentPath.startsWith('/jukebox') ? 'active' : ''}"
              data-link
            >
              Jukebox
            </a>
          </li>
        </ul>
        <a
          href="/timeline"
          class="nav-hamburger"
          data-link
          role="button"
          aria-label="타임라인으로 이동"
        >
          ${menuIconSvg}
        </a>
      </div>
    </nav>
  `;
}

