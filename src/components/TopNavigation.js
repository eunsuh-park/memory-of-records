/**
 * TopNavigation 컴포넌트
 * 모든 페이지 상단에 표시되는 네비게이션 헤더입니다.
 */

import '../components/TopNavigation.css';

export function renderTopNavigation() {
  const container = document.getElementById('top-navigation');
  if (!container) return;

  const currentPath = window.location.pathname;

  container.innerHTML = `
    <nav class="top-navigation">
      <div class="nav-container">
        <a href="/" class="logo" data-link>
          <span class="logo-text">Memory of Records</span>
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
          <li>
            <a 
              href="/year" 
              class="${currentPath.startsWith('/year') ? 'active' : ''}"
              data-link
            >
              Year
            </a>
          </li>
        </ul>
      </div>
    </nav>
  `;
}

