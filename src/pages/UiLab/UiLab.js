/**
 * UI Component Lab
 * 네비게이션에 노출하지 않는 내부 리뷰 페이지 (/ui-lab)
 * 사이드 메뉴는 Foundation / Component 2단이고, 해시로 한 페이지씩 연다.
 */

import { showToast } from '../../components/Toast/Toast.js';
import { openUploadResultDialog } from '../../components/Dialog/uploadResultDialog.js';
import { bind as bindThemeSwitches } from '../../components/ThemeSwitch/ThemeSwitch.js';
import { bind as bindViewerSwitches } from '../../components/ViewerSwitch/ViewerSwitch.js';
import { bind as bindDropdown } from '../../components/DropdownMenu/DropdownMenu.js';
import { renderNoteImageViewer } from '../../components/NoteImageViewer/NoteImageViewer.js';
import { DEMO_NOTE_ID, demoNoteViewerOptions, isLocalDemoEnabled } from '../../utils/demoNote.js';
import '../../components/NoteInfoPanel/NoteInfoPanel.css';
import '../../components/NoteImageViewer/NoteImageViewer.css';
import '../../components/FileUploadPreview/FileUploadPreview.css';
import { LAB_DEFAULT, LAB_NAV, parseLabHash } from './labNav.js';
import { BANDS, renderFoundationPage } from './foundationPages.js';
import { renderComponentPage } from './componentPages.js';
import './UiLab.css';

function readCssVar(name) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '—';
  } catch {
    return '—';
  }
}

function currentBandId() {
  const w = window.innerWidth;
  return BANDS.find((band) => w <= band.max)?.id || 'desktop';
}

function fillTokenValues(root) {
  root.querySelectorAll('[data-token]').forEach((el) => {
    const name = el.getAttribute('data-token');
    el.textContent = readCssVar(name);
  });
}

function attachViewportReadout(root) {
  const readout = root.querySelector('[data-lab="viewport"]');
  const update = () => {
    if (!root.isConnected) {
      window.removeEventListener('resize', update);
      return;
    }
    const bandId = currentBandId();
    const band = BANDS.find((item) => item.id === bandId);
    root.setAttribute('data-active-band', bandId);
    if (readout && band) readout.textContent = `${window.innerWidth}px · ${band.label} (${band.range})`;
  };

  update();
  window.addEventListener('resize', update);
}

function bindLabChips(root) {
  if (!root) return;
  const groups = new Map();
  root.querySelectorAll('.chip[data-lab-chip]').forEach((chip) => {
    const key = chip.getAttribute('data-lab-chip') || 'default';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(chip);
  });
  groups.forEach((chips) => {
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((other) => {
          const on = other === chip;
          other.classList.toggle('is-active', on);
          other.setAttribute('aria-pressed', String(on));
        });
      });
    });
  });
}

function bindLabDropdownMenu(root) {
  if (!root) return;
  root.querySelectorAll('.dropdown').forEach((el) => bindDropdown(el));
  root.querySelectorAll('[data-lab-menu]').forEach((panel) => {
    const items = [...panel.querySelectorAll('.dropdown-menu__item')];
    items.forEach((item) => {
      item.addEventListener('click', () => {
        items.forEach((other) => {
          const on = other === item;
          other.classList.toggle('is-selected', on);
          other.setAttribute('aria-selected', String(on));
        });
      });
    });
  });
}

function watchThemeChange(root) {
  const observer = new MutationObserver(() => {
    if (!root.isConnected) {
      observer.disconnect();
      return;
    }
    fillTokenValues(root);
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

function itemHas(item, id) {
  return Boolean(item.children?.some((child) => child.id === id || itemHas(child, id)));
}

function renderNavItems(items, groupId, activeId) {
  return items
    .map((item) => {
      const on = activeId === item.id;
      const ancestor = !on && itemHas(item, activeId);
      const cls = ['ui-lab__nav-link', on ? 'is-active' : '', ancestor ? 'is-ancestor' : '']
        .filter(Boolean)
        .join(' ');
      const children = item.children?.length
        ? `<ul class="ui-lab__nav-sub">${renderNavItems(item.children, groupId, activeId)}</ul>`
        : '';
      return `
        <li>
          <a class="${cls}" href="#${groupId}/${item.id}"${on ? ' aria-current="page"' : ''}>${item.label}</a>
          ${children}
        </li>`;
    })
    .join('');
}

function renderNav(active) {
  return LAB_NAV.map(
    (group) => `
      <div class="ui-lab__nav-group">
        <p class="ui-lab__nav-label">${group.label}</p>
        <ul class="ui-lab__nav-list">${renderNavItems(group.items, group.id, active.group === group.id ? active.id : '')}</ul>
      </div>`
  ).join('');
}

function renderPage(active) {
  if (active.group === 'foundation') return renderFoundationPage(active.id);
  if (active.group === 'component') return renderComponentPage(active.id);
  return '';
}

function cleanupLab(mainContent) {
  if (typeof mainContent._labCleanup === 'function') {
    try {
      mainContent._labCleanup();
    } catch (error) {
      console.warn('UI Lab cleanup failed', error);
    }
    mainContent._labCleanup = null;
  }
}

function paintUiLab() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const active = parseLabHash(window.location.hash);
  const canonical = `#${active.group}/${active.id}`;
  if (window.location.hash !== canonical) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}${canonical}`);
  }

  cleanupLab(mainContent);

  mainContent.innerHTML = `
    <div class="ui-lab">
      <aside class="ui-lab__nav" aria-label="UI Lab">
        <p class="ui-lab__nav-kicker">Internal</p>
        <p class="ui-lab__nav-title">UI Lab</p>
        ${renderNav(active)}
        <p class="ui-lab__nav-meta"><code data-lab="viewport">…</code></p>
      </aside>
      <div class="ui-lab__main">
        ${renderPage(active)}
      </div>
    </div>
  `;

  const root = mainContent.querySelector('.ui-lab');
  if (!root) return;

  fillTokenValues(root);
  watchThemeChange(root);
  attachViewportReadout(root);
  bindThemeSwitches(root.querySelector('#theme-switch'), { persist: false });
  bindViewerSwitches(root.querySelector('#viewer-switch'), { persist: false });
  bindLabChips(root.querySelector('#filter-chip'));
  bindLabChips(root.querySelector('#menu'));
  bindLabDropdownMenu(root.querySelector('#dropdown'));
  bindLabDropdownMenu(root.querySelector('#menu'));

  root.querySelector('[data-lab="toast"]')?.addEventListener('click', () => {
    showToast('UI Component Lab · Toast 데모');
  });

  root.querySelector('[data-lab="upload-ok"]')?.addEventListener('click', () => {
    openUploadResultDialog({ title: '업로드 완료', message: '5페이지가 추가되었습니다.' });
  });
  root.querySelector('[data-lab="upload-partial"]')?.addEventListener('click', () => {
    openUploadResultDialog({
      title: '일부만 저장됨',
      message: '5장 중 3장만 올렸습니다.',
      detail: '4장째부터 실패했습니다.'
    });
  });
  root.querySelector('[data-lab="upload-fail"]')?.addEventListener('click', () => {
    openUploadResultDialog({
      title: '페이지 업로드 실패',
      message: '표지는 저장됐지만 본문 페이지는 올리지 못했습니다.',
      detail: '이미지 저장에 실패했습니다.'
    });
  });

  root.querySelectorAll('.ui-lab__demo-stage--dialog .add-note-form').forEach((form) => {
    form.addEventListener('submit', (event) => event.preventDefault());
  });

  const chromeDemo = root.querySelector('[data-lab="viewer-chrome"]');
  if (chromeDemo) {
    const totalEl = chromeDemo.querySelector('.niv-total-pages');
    if (totalEl) totalEl.textContent = '12';
  }

  const liveViewer = root.querySelector('[data-lab="demo-note-viewer"]');
  if (liveViewer && isLocalDemoEnabled()) {
    const cleanup = renderNoteImageViewer(liveViewer, DEMO_NOTE_ID, {
      mode: 'modal',
      ...demoNoteViewerOptions()
    });
    mainContent._labCleanup = () => cleanup?.();
  }

  root.querySelector('.ui-lab__main')?.scrollTo(0, 0);
}

function onLabHashChange() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (!path.endsWith('/ui-lab')) return;
  paintUiLab();
}

/**
 * @returns {void}
 */
export function renderUiLab() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  if (!window.location.hash) {
    history.replaceState(null, '', `#${LAB_DEFAULT.group}/${LAB_DEFAULT.id}`);
  }

  paintUiLab();
  window.removeEventListener('hashchange', onLabHashChange);
  window.addEventListener('hashchange', onLabHashChange);

  const prev = mainContent._routeCleanup;
  mainContent._routeCleanup = () => {
    window.removeEventListener('hashchange', onLabHashChange);
    cleanupLab(mainContent);
    if (typeof prev === 'function') prev();
  };
}
