/**
 * Dark / Light 테마 토글
 * - localStorage 키: mor-theme
 * - document.documentElement[data-theme] = 'dark' | 'light'
 */

const STORAGE_KEY = 'mor-theme';
const THEMES = new Set(['dark', 'light']);

export function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (THEMES.has(stored)) return stored;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function applyTheme(theme) {
  const next = THEMES.has(theme) ? theme : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || getStoredTheme();
  return applyTheme(current === 'light' ? 'dark' : 'light');
}

/** 앱 부트 시 한 번 호출 */
export function initTheme() {
  return applyTheme(getStoredTheme());
}
