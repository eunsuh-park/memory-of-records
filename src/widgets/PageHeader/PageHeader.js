/**
 * PageHeader
 * 데스크톱: 로고(좌) | FilterSubMenu(중앙) | 테마 + Story(우)
 * 모바일: 로고(중앙) | 햄버거(우) + 접이식 필터 + 우측 드로어(Notes/Story/테마)
 */

import './PageHeader.css';
import logo from '../../assets/logo.png';
import { getStoredTheme, toggleTheme } from '../../utils/theme.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import {
  setFilterSubMenuCollapsed,
  isFilterSubMenuCollapsed
} from '../../components/FilterSubMenu/FilterSubMenu.js';
import { render as renderDim } from '../../components/Dim/Dim.js';
import { render as renderButton } from '../../components/Button/Button.js';
import { getSession, logout, clearSessionCache } from '../../services/auth.js';
import { showToast } from '../../components/Toast/Toast.js';
import { router } from '../../router.js';

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

function themeToggleLabel(theme) {
  return theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환';
}

function isNotesPath(path) {
  return (
    path.startsWith('/timeline') ||
    path.startsWith('/by-type') ||
    path.startsWith('/favorites') ||
    path.startsWith('/note/')
  );
}

function isLandingPath(path) {
  return path === '/';
}

function syncNavToggle(header) {
  if (!header) return;
  const collapsed = isFilterSubMenuCollapsed();
  header.classList.toggle('page-header--nav-collapsed', collapsed);
  const btn = header.querySelector('[data-nav-toggle]');
  if (btn) {
    btn.setAttribute('aria-expanded', String(!collapsed));
    btn.setAttribute('aria-label', collapsed ? '필터 메뉴 열기' : '필터 메뉴 닫기');
    btn.setAttribute('title', collapsed ? '필터 메뉴 열기' : '필터 메뉴 닫기');
  }
}

function setDrawerOpen(open) {
  document.body.classList.toggle('nav-drawer-open', open);
  const btn = document.querySelector('[data-drawer-open]');
  btn?.setAttribute('aria-expanded', String(open));
  const drawer = document.querySelector('#page-nav-drawer');
  const backdrop = document.querySelector('.nav-drawer-backdrop');
  if (drawer) drawer.setAttribute('aria-hidden', String(!open));
  backdrop?.classList.toggle('is-visible', open);
}

function closeDrawer() {
  setDrawerOpen(false);
}

function openDrawer() {
  setDrawerOpen(true);
}

function renderThemeSwitch(theme, className = 'theme-switch') {
  return `
    <button
      type="button"
      class="${className}"
      data-theme="${theme}"
      aria-label="${themeToggleLabel(theme)}"
      title="${themeToggleLabel(theme)}"
      data-theme-toggle
    >
      <span class="theme-switch__thumb" aria-hidden="true"></span>
      <span class="theme-switch__icon theme-switch__icon--sun">${MINGCUTE.sunFill}</span>
      <span class="theme-switch__icon theme-switch__icon--moon">${MINGCUTE.moonFill}</span>
    </button>
  `;
}

function bindThemeToggles(root) {
  root.querySelectorAll('[data-theme-toggle]').forEach((themeBtn) => {
    themeBtn.addEventListener('click', () => {
      const next = toggleTheme();
      root.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
        btn.setAttribute('data-theme', next);
        btn.setAttribute('aria-label', themeToggleLabel(next));
        btn.setAttribute('title', themeToggleLabel(next));
      });
    });
  });
}

export function renderPageHeader() {
  const container = document.getElementById('page-header');
  if (!container) return;

  const currentPath = getActualPath(window.location.pathname);
  const theme = getStoredTheme();
  const landingActive = isLandingPath(currentPath);
  const notesActive = isNotesPath(currentPath);
  const favoritesActive = currentPath.startsWith('/favorites');
  const storyActive = currentPath.startsWith('/story');
  const loginActive = currentPath.startsWith('/login');

  closeDrawer();

  const landingNavDesktop = landingActive
    ? `
          <nav class="page-header__marketing" aria-label="제품 안내">
            <a href="#features" class="page-header__marketing-link" data-landing-anchor="features">기능</a>
            <a href="#demo" class="page-header__marketing-link" data-landing-anchor="demo">데모</a>
          </nav>`
    : '';

  const landingCtaDesktop = landingActive
    ? renderButton({
        shape: 'solid',
        className: 'page-header__waitlist-btn',
        content: `${MINGCUTE.mailSendLine}<span>얼리 액세스</span>`,
        ariaLabel: '얼리 액세스',
        dataset: { 'landing-anchor': 'waitlist' }
      })
    : `
          <a
            href="/story"
            class="page-header__story-link ${storyActive ? 'active' : ''}"
            data-link
          >
            Story
          </a>`;

  const drawerNav = landingActive
    ? `
        <a href="#features" class="nav-drawer__link" data-landing-anchor="features" data-drawer-close>기능</a>
        <a href="#demo" class="nav-drawer__link" data-landing-anchor="demo" data-drawer-close>데모</a>
        ${renderButton({
          shape: 'text',
          className: 'nav-drawer__link nav-drawer__link--btn',
          content: `${MINGCUTE.mailSendLine}<span>얼리 액세스</span>`,
          ariaLabel: '얼리 액세스',
          dataset: { 'landing-anchor': 'waitlist', 'drawer-close': '' }
        })}
        <a href="/story" class="nav-drawer__link ${storyActive ? 'active' : ''}" data-link data-drawer-close>Story</a>`
    : `
        <a
          href="/timeline"
          class="nav-drawer__link ${notesActive && !favoritesActive ? 'active' : ''}"
          data-link
          data-drawer-close
        >Notes</a>
        <a
          href="/favorites"
          class="nav-drawer__link ${favoritesActive ? 'active' : ''}"
          data-link
          data-drawer-close
        >Favorites</a>
        <a
          href="/story"
          class="nav-drawer__link ${storyActive ? 'active' : ''}"
          data-link
          data-drawer-close
        >Story</a>`;

  container.innerHTML = `
    <header class="page-header${landingActive ? ' page-header--landing' : ''}">
      <div class="page-header__top">
        <div class="page-header__left">
          <a href="/" class="page-header__logo" data-link>
            <span class="page-header__logo-text">Memory of Records</span>
            <img src="${logo}" alt="Memory of Records" class="page-header__logo-image" />
          </a>
        </div>
        <div class="page-header__right page-header__right--mobile">
          <button
            type="button"
            class="page-header__menu-btn"
            aria-label="메뉴 열기"
            aria-expanded="false"
            aria-controls="page-nav-drawer"
            data-drawer-open
          >${MINGCUTE.menuLine}</button>
        </div>
        <div class="page-header__right page-header__right--desktop">
          ${landingNavDesktop}
          ${renderThemeSwitch(theme)}
          <span class="page-header__auth" data-auth-slot></span>
          ${landingCtaDesktop}
        </div>
      </div>
      <div class="page-header__center" id="sub-menu">
        <!-- FilterSubMenu가 여기에 렌더링됨 -->
      </div>
      <button
        type="button"
        class="page-header__nav-toggle"
        aria-expanded="true"
        aria-controls="sub-menu-panel"
        aria-label="필터 메뉴 닫기"
        title="필터 메뉴 닫기"
        data-nav-toggle
      >${MINGCUTE.downLine}</button>
    </header>

    ${renderDim({
      tone: 'blur',
      zIndex: 1100,
      visible: false,
      className: 'dim--fixed nav-drawer-backdrop',
      dataset: { 'drawer-close': '' }
    })}
    <aside
      class="nav-drawer"
      id="page-nav-drawer"
      aria-hidden="true"
      aria-label="사이트 메뉴"
    >
      <div class="nav-drawer__top">
        <button
          type="button"
          class="nav-drawer__close"
          aria-label="메뉴 닫기"
          data-drawer-close
        >${MINGCUTE.arrowToRightLine}</button>
        ${renderThemeSwitch(theme, 'theme-switch nav-drawer__theme')}
      </div>
      <nav class="nav-drawer__nav">
        ${drawerNav}
        <div class="nav-drawer__auth" data-auth-slot-drawer></div>
      </nav>
    </aside>
  `;

  bindThemeToggles(container);

  async function fillAuthSlots() {
    const session = await getSession();
    const desktop = container.querySelector('[data-auth-slot]');
    const drawer = container.querySelector('[data-auth-slot-drawer]');
    if (session.authenticated) {
      if (desktop) {
        desktop.innerHTML = `
          <button type="button" class="page-header__auth-btn" data-auth-logout>
            Logout
          </button>`;
      }
      if (drawer) {
        drawer.innerHTML = `
          <button type="button" class="nav-drawer__link nav-drawer__link--btn" data-auth-logout data-drawer-close>
            Logout
          </button>`;
      }
    } else {
      if (desktop) {
        desktop.innerHTML = `
          <a
            href="/login"
            class="page-header__auth-link ${loginActive ? 'active' : ''}"
            data-link
          >Login</a>`;
      }
      if (drawer) {
        drawer.innerHTML = `
          <a
            href="/login"
            class="nav-drawer__link ${loginActive ? 'active' : ''}"
            data-link
            data-drawer-close
          >Login</a>`;
      }
    }

    container.querySelectorAll('[data-auth-logout]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await logout();
          clearSessionCache();
          showToast('로그아웃되었습니다');
          closeDrawer();
          if (getActualPath(window.location.pathname).startsWith('/login')) {
            router.navigate('/');
          } else {
            fillAuthSlots();
          }
        } catch (err) {
          showToast(err?.message || '로그아웃에 실패했습니다');
        }
      });
    });
  }

  void fillAuthSlots();

  const header = container.querySelector('.page-header');
  const navToggle = container.querySelector('[data-nav-toggle]');
  navToggle?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFilterSubMenuCollapsed(!isFilterSubMenuCollapsed());
    syncNavToggle(header);
  });

  container.querySelector('[data-drawer-open]')?.addEventListener('click', (e) => {
    e.preventDefault();
    openDrawer();
  });

  container.querySelectorAll('[data-drawer-close]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (el.tagName !== 'A') e.preventDefault();
      closeDrawer();
    });
  });

  if (!window.__pageHeaderEscBound) {
    window.__pageHeaderEscBound = true;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('nav-drawer-open')) {
        closeDrawer();
      }
    });
  }

  syncNavToggle(header);

  /* FilterSubMenu 리렌더 후에도 헤더 토글 상태 동기화 */
  window.__syncPageHeaderNavToggle = () => syncNavToggle(header);

  container.querySelectorAll('[data-landing-anchor]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const id = el.getAttribute('data-landing-anchor');
      if (!id) return;
      e.preventDefault();
      closeDrawer();
      if (!isLandingPath(getActualPath(window.location.pathname))) {
        router.navigate('/');
        requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return;
      }
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
