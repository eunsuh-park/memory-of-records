/**
 * Navigation 컴포넌트
 * 모든 페이지에 표시되는 네비게이션 헤더입니다.
 */

import '../components/TopNavigation.css';
import logo from '../logo.png';

export function renderNavigation() {
  const container = document.getElementById('navigation');
  if (!container) return;

  const currentPath = window.location.pathname;

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

