/**
 * Toast 컴포넌트
 * 짧은 메시지를 토스트 형태로 표시합니다.
 */

import './Toast.css';

/**
 * @param {string} message - 표시할 메시지
 * @param {Object} [options]
 * @param {number} [options.duration=2500] - 표시 시간(ms)
 */
export function showToast(message, options = {}) {
  const { duration = 2500 } = options;

  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.appendChild(el);

  requestAnimationFrame(() => el.classList.add('toast--visible'));

  setTimeout(() => {
    el.classList.remove('toast--visible');
    setTimeout(() => el.remove(), 300);
  }, duration);
}
