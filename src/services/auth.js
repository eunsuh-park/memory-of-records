/**
 * 인증 클라이언트 — /api/auth 세션 쿠키
 */

import { showToast } from '../components/Toast/Toast.js';
import { dismissTransientOverlays } from '../utils/dismissOverlays.js';

/** @type {{ authenticated: boolean, exp?: number|null } | null} */
let cachedSession = null;
let cacheAt = 0;
const CACHE_MS = 15_000;

/** @type {Set<(authenticated: boolean) => void>} */
const authListeners = new Set();
/** @type {boolean|null} */
let lastEmittedAuth = null;

function hrefFor(path) {
  const base = import.meta.env.BASE_URL || '/';
  return base === '/' ? path : `${base.slice(0, -1)}${path}`;
}

function navigateTo(path) {
  const fullPath = hrefFor(path);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === fullPath) {
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }
  window.history.pushState({}, '', fullPath);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * requireAuth 실패로 /login으로 보내기 전에, document.body에 떠 있는 모달/뷰어를
 * 닫아 로그인 폼이 그 뒤에 가려지지 않게 한다.
 * 모든 모달의 닫기 버튼은 공통 Button(role: 'close')이라 .btn--close 클래스를 공유하므로
 * 이 클래스를 훅으로 재사용한다(각 모달의 canClose 가드는 그대로 존중됨).
 */
function closeOpenOverlays() {
  document.querySelectorAll('.btn--close').forEach((btn) => {
    if (btn instanceof HTMLElement) btn.click();
  });
}

function syncAuthUi(authenticated) {
  const next = Boolean(authenticated);
  document.body.classList.toggle('is-authenticated', next);
  if (lastEmittedAuth === next) return;
  lastEmittedAuth = next;
  authListeners.forEach((fn) => {
    try {
      fn(next);
    } catch (err) {
      console.warn('auth listener', err);
    }
  });
}

/**
 * 캐시된 로그인 여부. 세션을 아직 확인하지 않았으면 false.
 */
export function isAuthenticated() {
  return Boolean(cachedSession?.authenticated);
}

/**
 * @param {(authenticated: boolean) => void} fn
 * @returns {() => void} unsubscribe
 */
export function onAuthChange(fn) {
  authListeners.add(fn);
  return () => authListeners.delete(fn);
}

/**
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<{ ok: boolean, authenticated: boolean, exp?: number|null, message?: string }>}
 */
export async function getSession(options = {}) {
  const force = Boolean(options.force);
  if (!force && cachedSession && Date.now() - cacheAt < CACHE_MS) {
    syncAuthUi(cachedSession.authenticated);
    return { ok: true, ...cachedSession };
  }

  try {
    const response = await fetch('/api/auth?op=me', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    const authenticated = Boolean(data?.authenticated);
    cachedSession = { authenticated, exp: data?.exp ?? null };
    cacheAt = Date.now();
    syncAuthUi(authenticated);
    return {
      ok: response.ok,
      authenticated,
      exp: data?.exp ?? null,
      message: data?.message
    };
  } catch (err) {
    cachedSession = { authenticated: false, exp: null };
    cacheAt = Date.now();
    syncAuthUi(false);
    return {
      ok: false,
      authenticated: false,
      message: err?.message || '세션을 확인하지 못했습니다'
    };
  }
}

export function clearSessionCache() {
  cachedSession = null;
  cacheAt = 0;
}

/**
 * @param {string} password
 */
export async function login(password) {
  const response = await fetch('/api/auth', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'login', password })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    clearSessionCache();
    throw new Error(data?.message || data?.error || '로그인에 실패했습니다');
  }
  cachedSession = { authenticated: true, exp: data?.exp ?? null };
  cacheAt = Date.now();
  syncAuthUi(true);
  return data;
}

export async function logout() {
  const response = await fetch('/api/auth', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'logout' })
  });
  clearSessionCache();
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || '로그아웃에 실패했습니다');
  }
  syncAuthUi(false);
  return data;
}

/**
 * 편집 액션용 가드. 미로그인 시 /login?next= 로 이동.
 * @param {{ next?: string, silent?: boolean }} [options]
 * @returns {Promise<boolean>}
 */
export async function requireAuth(options = {}) {
  const session = await getSession({ force: true });
  if (session.authenticated) return true;

  const next =
    options.next ||
    `${window.location.pathname}${window.location.search}` ||
    '/';
  if (!options.silent) {
    showToast('편집하려면 로그인해 주세요');
  }
  dismissTransientOverlays();
  closeOpenOverlays();
  const qs = new URLSearchParams({ next });
  navigateTo(`/login?${qs.toString()}`);
  return false;
}

/** 로그인 후 돌아갈 안전한 내부 경로 */
export function safeNextPath(raw) {
  const value = String(raw || '').trim() || '/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  if (value.startsWith('/login')) return '/';
  return value;
}

export { hrefFor };
