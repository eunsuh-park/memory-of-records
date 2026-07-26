/**
 * PageHeader
 * 로고(좌) | FilterSubMenu(중앙) | 테마 토글 + Story 링크(우)
 */

import './PageHeader.css';
import logo from '../../assets/logo.png';
import { getStoredTheme, toggleTheme } from '../../utils/theme.js';

const BASE_URL = import.meta.env.BASE_URL || '/';

const THEME_ICON_SUN =
  "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' aria-hidden='true'><circle cx='12' cy='12' r='3.6' fill='currentColor'/><path stroke='currentColor' stroke-width='1.8' stroke-linecap='round' d='M12 2.5v2.2M12 19.3V21.5M4.6 4.6l1.55 1.55M17.85 17.85l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.55-1.55M17.85 6.15l1.55-1.55'/></svg>";
const THEME_ICON_MOON =
  "<svg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 24 24' fill='none' aria-hidden='true'><path fill='currentColor' d='M20.2 14.6A7.6 7.6 0 0 1 9.4 3.8 8.4 8.4 0 1 0 20.2 14.6Z'/></svg>";

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

function themeToggleLabel(theme) {
  return theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환';
}

export function renderPageHeader() {
  const container = document.getElementById('page-header');
  if (!container) return;

  const currentPath = getActualPath(window.location.pathname);
  const theme = getStoredTheme();

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
        <button
          type="button"
          class="theme-switch"
          data-theme="${theme}"
          aria-label="${themeToggleLabel(theme)}"
          title="${themeToggleLabel(theme)}"
          data-theme-toggle
        >
          <span class="theme-switch__thumb" aria-hidden="true"></span>
          <span class="theme-switch__icon theme-switch__icon--sun">${THEME_ICON_SUN}</span>
          <span class="theme-switch__icon theme-switch__icon--moon">${THEME_ICON_MOON}</span>
        </button>
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

  const themeBtn = container.querySelector('[data-theme-toggle]');
  themeBtn?.addEventListener('click', () => {
    const next = toggleTheme();
    themeBtn.setAttribute('data-theme', next);
    themeBtn.setAttribute('aria-label', themeToggleLabel(next));
    themeBtn.setAttribute('title', themeToggleLabel(next));
  });
}
