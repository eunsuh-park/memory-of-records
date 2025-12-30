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

  container.innerHTML = `
    <nav class="navigation">
      <div class="nav-container">
        <a href="/" class="logo" data-link>
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
              href="/story" 
              class="${currentPath.startsWith('/story') ? 'active' : ''}"
              data-link
            >
              Story
            </a>
          </li>
        </ul>
      </div>
    </nav>
  `;
}

