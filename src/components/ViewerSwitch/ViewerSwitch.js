/**
 * ViewerSwitch
 *
 * Timeline / By Type 갤러리 레이아웃 pill 토글. ThemeSwitch와 같은 64×32 스위치
 * 마크업·트랙을 쓰고, 역할만 다르다(칩·Button에 넣지 않는다).
 * 왼쪽 column = 주크박스(Cover Flow), 오른쪽 grid = 펼쳐 보기.
 *
 * 트랙·썸 색은 페이지 테마를 따른다. ThemeSwitch처럼 스위치 자체 data-theme로
 * 반대 테마를 미리 보여 주지 않는다.
 */

import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import { getStoredGalleryLayout, toggleGalleryLayout } from '../../utils/galleryLayout.js';
import '../ThemeSwitch/ThemeSwitch.css';
import './ViewerSwitch.css';

function layoutToggleLabel(layout) {
  return layout === 'grid' ? '주크박스 보기로 전환' : '펼쳐 보기로 전환';
}

/**
 * @param {HTMLElement} el
 * @param {'jukebox'|'grid'} layout
 */
export function applyState(el, layout) {
  const next = layout === 'grid' ? 'grid' : 'jukebox';
  el.setAttribute('data-layout', next);
  el.setAttribute('aria-label', layoutToggleLabel(next));
  el.setAttribute('title', layoutToggleLabel(next));
  el.setAttribute('aria-checked', next === 'grid' ? 'true' : 'false');
}

/**
 * @param {Object} options
 * @param {'jukebox'|'grid'} [options.layout]
 * @param {string} [options.className]
 * @returns {string} HTML 문자열
 */
export function render({ layout, className = '' } = {}) {
  const next = layout === 'grid' || layout === 'jukebox' ? layout : getStoredGalleryLayout();
  const classes = ['theme-switch', 'viewer-switch', className].filter(Boolean).join(' ');
  const label = layoutToggleLabel(next);

  return `
    <button
      type="button"
      class="${classes}"
      role="switch"
      data-layout="${next}"
      aria-checked="${next === 'grid' ? 'true' : 'false'}"
      aria-label="${label}"
      title="${label}"
      data-gallery-layout-toggle
    >
      <span class="theme-switch__thumb" aria-hidden="true"></span>
      <span class="theme-switch__icon theme-switch__icon--column">${MINGCUTE.columnFill}</span>
      <span class="theme-switch__icon theme-switch__icon--grid">${MINGCUTE.layoutGridFill}</span>
    </button>
  `;
}

/**
 * @param {ParentNode} root
 * @param {{ persist?: boolean }} [options] persist=false면 저장하지 않고 이 스위치만 뒤집는다
 */
export function bind(root, { persist = true } = {}) {
  if (!root) return;
  root.querySelectorAll('[data-gallery-layout-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const current = btn.getAttribute('data-layout') === 'grid' ? 'grid' : 'jukebox';
      const next = persist ? toggleGalleryLayout() : current === 'grid' ? 'jukebox' : 'grid';
      const targets = persist ? root.querySelectorAll('[data-gallery-layout-toggle]') : [btn];
      targets.forEach((el) => applyState(el, next));
    });
  });
}
