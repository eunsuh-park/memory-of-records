/**
 * ThemeSwitch
 *
 * 라이트/다크 모드 pill 토글. Button 세 갈래(circle·solid·text)와 목적이 달라
 * FilterChip처럼 별도 컴포넌트로 둔다. 아이콘은 MingCute 세트만 쓴다.
 *
 * 트랙·썸·아이콘 색은 스위치 자신의 data-theme에 atomic 토큰을 연결한다.
 * 페이지 semantic(--color-bg 등)을 쓰면 반대 테마 프리뷰가 불가능하고
 * 헤더 배경과도 구분이 안 되므로, Design.md의 Story 책 지면과 같은 의도적 예외다.
 */

import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import { toggleTheme } from '../../utils/theme.js';
import './ThemeSwitch.css';

function themeToggleLabel(theme) {
  return theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환';
}

/**
 * @param {HTMLElement} el
 * @param {'dark'|'light'} theme
 */
export function applyState(el, theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  el.setAttribute('data-theme', next);
  el.setAttribute('aria-label', themeToggleLabel(next));
  el.setAttribute('title', themeToggleLabel(next));
  el.setAttribute('aria-checked', next === 'dark' ? 'true' : 'false');
}

/**
 * @param {Object} options
 * @param {'dark'|'light'} [options.theme='dark']
 * @param {string} [options.className]
 * @returns {string} HTML 문자열
 */
export function render({ theme = 'dark', className = '' } = {}) {
  const next = theme === 'light' ? 'light' : 'dark';
  const classes = ['theme-switch', className].filter(Boolean).join(' ');
  const label = themeToggleLabel(next);

  return `
    <button
      type="button"
      class="${classes}"
      role="switch"
      data-theme="${next}"
      aria-checked="${next === 'dark' ? 'true' : 'false'}"
      aria-label="${label}"
      title="${label}"
      data-theme-toggle
    >
      <span class="theme-switch__thumb" aria-hidden="true"></span>
      <span class="theme-switch__icon theme-switch__icon--sun">${MINGCUTE.sunFill}</span>
      <span class="theme-switch__icon theme-switch__icon--moon">${MINGCUTE.moonFill}</span>
    </button>
  `;
}

/**
 * @param {ParentNode} root
 * @param {{ persist?: boolean }} [options] persist=false면 앱 테마는 바꾸지 않고 이 스위치만 뒤집는다
 */
export function bind(root, { persist = true } = {}) {
  if (!root) return;
  root.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const current = btn.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = persist ? toggleTheme() : current === 'light' ? 'dark' : 'light';
      const targets = persist ? root.querySelectorAll('[data-theme-toggle]') : [btn];
      targets.forEach((el) => applyState(el, next));
    });
  });
}
