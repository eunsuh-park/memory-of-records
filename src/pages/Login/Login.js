/**
 * 로그인 페이지 (/login)
 * 공유 관리자 비밀번호 → HttpOnly 세션 쿠키
 */

import { login, getSession, safeNextPath } from '../../services/auth.js';
import { showToast } from '../../components/Toast/Toast.js';
import { render as renderButton } from '../../components/Button/Button.js';
import { render as renderField } from '../../components/FormField/FormField.js';
import { router } from '../../router.js';
import './Login.css';

function readNextFromUrl() {
  try {
    const qs = new URLSearchParams(window.location.search);
    return safeNextPath(qs.get('next'));
  } catch {
    return '/';
  }
}

export async function renderLogin() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const next = readNextFromUrl();
  const session = await getSession({ force: true });
  if (session.authenticated) {
    router.navigate(next);
    return;
  }

  mainContent.innerHTML = `
    <div class="login-page">
      <div class="login-panel">
        <h1 class="login-title">로그인</h1>
        <p class="login-lede">추가 및 수정은 로그인이 필요합니다.</p>
        <form class="form login-form" novalidate>
          ${renderField({
            type: 'password',
            label: '비밀번호',
            name: 'password',
            required: true,
            autocomplete: 'current-password'
          })}
          <p class="form-status login-status" role="status"></p>
          ${renderButton({
            shape: 'solid',
            type: 'submit',
            content: '로그인',
            className: 'login-submit'
          })}
        </form>
        <a class="login-back" href="/" data-link>홈으로 돌아가기</a>
      </div>
    </div>
  `;

  const form = mainContent.querySelector('.login-form');
  const statusEl = mainContent.querySelector('.login-status');
  const submitBtn = mainContent.querySelector('.login-submit');
  const passwordInput = mainContent.querySelector('input[name="password"]');

  passwordInput?.focus();

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = String(passwordInput?.value || '');
    if (!password) {
      if (statusEl) {
        statusEl.textContent = '비밀번호를 입력해 주세요';
        statusEl.classList.add('form-status--error');
      }
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (statusEl) {
      statusEl.textContent = '확인 중…';
      statusEl.classList.remove('form-status--error');
    }

    try {
      await login(password);
      showToast('로그인되었습니다');
      router.navigate(next);
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = err?.message || '로그인에 실패했습니다';
        statusEl.classList.add('form-status--error');
      }
      showToast(err?.message || '로그인에 실패했습니다');
      if (submitBtn) submitBtn.disabled = false;
      passwordInput?.focus();
      passwordInput?.select();
    }
  });
}
