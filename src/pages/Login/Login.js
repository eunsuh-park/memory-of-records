/**
 * ??? ??? (/login)
 * ?? ??? ???? ? HttpOnly ?? ??
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
        <h1 class="login-title">???</h1>
        <p class="login-lede">??·???? ????? ????? ??? ????? ?????. ????? ??? ?? ?????.</p>
        <form class="form login-form" novalidate>
          ${renderField({
            type: 'password',
            label: '????',
            name: 'password',
            required: true,
            autocomplete: 'current-password'
          })}
          <p class="form-status login-status" role="status"></p>
          ${renderButton({
            shape: 'solid',
            type: 'submit',
            content: '???',
            className: 'login-submit'
          })}
        </form>
        <a class="login-back" href="/" data-link>??? ????</a>
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
        statusEl.textContent = '????? ??? ???';
        statusEl.classList.add('form-status--error');
      }
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (statusEl) {
      statusEl.textContent = '?? ??';
      statusEl.classList.remove('form-status--error');
    }

    try {
      await login(password);
      showToast('????????');
      router.navigate(next);
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = err?.message || '???? ??????';
        statusEl.classList.add('form-status--error');
      }
      showToast(err?.message || '???? ??????');
      if (submitBtn) submitBtn.disabled = false;
      passwordInput?.focus();
      passwordInput?.select();
    }
  });
}
