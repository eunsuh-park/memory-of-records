/**
 * PageHeader
 * 로고(좌) | FilterSubMenu(중앙) | 테마 토글 + Story 링크(우)
 */

import './PageHeader.css';
import logo from '../../assets/logo.png';
import { getStoredTheme, toggleTheme } from '../../utils/theme.js';

const BASE_URL = import.meta.env.BASE_URL || '/';

const THEME_ICON_SUN =
  "<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' aria-hidden='true'><circle cx='12' cy='12' r='4' stroke='currentColor' stroke-width='1.8'/><path stroke='currentColor' stroke-width='1.8' stroke-linecap='round' d='M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56'/></svg>";
const THEME_ICON_MOON =
  "<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' aria-hidden='true'><path stroke='currentColor' stroke-width='1.8' stroke-linejoin='round' d='M20.5 14.3A7.5 7.5 0 0 1 9.7 3.5 8.2 8.2 0 1 0 20.5 14.3Z'/></svg>";

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

function themeToggleIcon(theme) {
  return theme === 'light' ? THEME_ICON_MOON : THEME_ICON_SUN;
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
          class="page-header__theme-toggle"
          aria-label="${themeToggleLabel(theme)}"
          title="${themeToggleLabel(theme)}"
          data-theme-toggle
        >${themeToggleIcon(theme)}</button>
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
    themeBtn.setAttribute('aria-label', themeToggleLabel(next));
    themeBtn.setAttribute('title', themeToggleLabel(next));
    themeBtn.innerHTML = themeToggleIcon(next);
  });
}
