/**
 * PageHeader
 * 데스크톱: 로고 + Intro(좌) | FilterSubMenu(중앙) | 테마 + Login(우)
 * 모바일: 로고(중앙) | 햄버거(우) + 필터 + 우측 드로어
 *          (Notes 하위: Timeline / By type / Favorite, 테마 토글은 하단)
 */

import './PageHeader.css';
import logo from '../../assets/logo.png';
import { getStoredTheme } from '../../utils/theme.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import { render as renderThemeSwitch, bind as bindThemeSwitches } from '../../components/ThemeSwitch/ThemeSwitch.js';
import { render as renderButton } from '../../components/Button/Button.js';
import { render as renderDim } from '../../components/Dim/Dim.js';
import { openAddNoteModal } from '../../components/AddNoteFab/AddNoteFab.js';
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

function isNotesPath(path) {
  return (
    path === '/' ||
    path.startsWith('/timeline') ||
    path.startsWith('/by-type') ||
    path.startsWith('/favorites') ||
    path.startsWith('/note/')
  );
}

function isTimelinePath(path) {
  return path === '/' || path.startsWith('/timeline') || path.startsWith('/note/');
}

function isByTypePath(path) {
  return path.startsWith('/by-type');
}

function isFavoritesPath(path) {
  return path.startsWith('/favorites');
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

export function renderPageHeader() {
  const container = document.getElementById('page-header');
  if (!container) return;

  const currentPath = getActualPath(window.location.pathname);
  const theme = getStoredTheme();
  const notesActive = isNotesPath(currentPath);
  const timelineActive = isTimelinePath(currentPath);
  const byTypeActive = isByTypePath(currentPath);
  const favoritesActive = isFavoritesPath(currentPath);
  const storyActive = currentPath.startsWith('/story');
  const loginActive = currentPath.startsWith('/login');

  closeDrawer();

  container.innerHTML = `
    <header class="page-header">
      <div class="page-header__top">
        <div class="page-header__left">
          <a href="/" class="page-header__logo" data-link>
            <span class="page-header__logo-text">Memory of Records</span>
            <img src="${logo}" alt="Memory of Records" class="page-header__logo-image" />
          </a>
          <a
            href="/story"
            class="page-header__story-link ${storyActive ? 'active' : ''}"
            data-link
          >
            Intro
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
          ${renderThemeSwitch({ theme })}
          <span class="page-header__auth" data-auth-slot></span>
        </div>
      </div>
      <div class="page-header__center" id="sub-menu">
        <!-- FilterSubMenu가 여기에 렌더링됨 -->
      </div>
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
        ${renderButton({
          shape: 'circle',
          size: 's',
          role: 'icon',
          tone: 'ghost',
          ariaLabel: '메뉴 닫기',
          content: MINGCUTE.arrowToRightLine,
          className: 'nav-drawer__close',
          dataset: { 'drawer-close': '' }
        })}
        <img src="${logo}" alt="" class="nav-drawer__logo" />
      </div>
      <nav class="nav-drawer__nav">
        <div class="nav-drawer__group ${notesActive ? 'is-active' : ''}" role="group" aria-label="Notes">
          <div class="nav-drawer__group-head">
            <span class="nav-drawer__link nav-drawer__parent">Notes</span>
            ${renderButton({
              shape: 'text',
              ariaLabel: '새 노트 추가',
              content: `${MINGCUTE.arrowToRightLine}<span>+새 노트 추가</span>`,
              className: 'nav-drawer__add-note',
              dataset: { 'add-note': '' }
            })}
          </div>
          <div class="nav-drawer__sub">
            <a
              href="/timeline"
              class="nav-drawer__link ${timelineActive ? 'active' : ''}"
              data-link
              data-drawer-close
            >Timeline</a>
            <a
              href="/by-type"
              class="nav-drawer__link ${byTypeActive ? 'active' : ''}"
              data-link
              data-drawer-close
            >By type</a>
            <a
              href="/favorites"
              class="nav-drawer__link ${favoritesActive ? 'active' : ''}"
              data-link
              data-drawer-close
            >Favorite</a>
          </div>
        </div>
        <a
          href="/story"
          class="nav-drawer__link ${storyActive ? 'active' : ''}"
          data-link
          data-drawer-close
        >Intro</a>
        <div class="nav-drawer__auth" data-auth-slot-drawer></div>
      </nav>
      <div class="nav-drawer__footer">
        ${renderThemeSwitch({ theme, className: 'nav-drawer__theme' })}
      </div>
    </aside>
  `;

  bindThemeSwitches(container);

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

  container.querySelector('[data-add-note]')?.addEventListener('click', (e) => {
    e.preventDefault();
    closeDrawer();
    void openAddNoteModal({
      onCreated: () => {
        router.handleRoute();
      }
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
}
