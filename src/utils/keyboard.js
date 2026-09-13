/**
 * 앱 단축키 판별.
 * 실제 키 바인딩은 PageHeader(새 노트)·Jukebox(카드 이동)에 둔다.
 */

const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [contenteditable=""]';

/** 입력 중이면 단축키를 가로채지 않는다 */
export function isTypingTarget(target) {
  const el = target instanceof Element ? target : target?.parentElement;
  if (!el) return false;
  return Boolean(el.closest(EDITABLE_SELECTOR));
}

/** 모달·드로어·드롭다운이 열려 있으면 주크박스 화살표를 막는다 */
export function isAppOverlayOpen(root = document) {
  const body = root.body || root;
  if (body.classList?.contains('pdf-modal-open')) return true;
  if (body.classList?.contains('nav-drawer-open')) return true;
  if (root.querySelector?.('.dialog')) return true;
  if (root.querySelector?.('.dropdown.is-open')) return true;
  return false;
}

/** Ctrl/Cmd + Shift + N — 새 노트. Chrome/Edge는 시크릿 창에 가로채일 수 있다 */
export function isNewNoteShortcut(event) {
  if (!event || event.repeat || event.altKey || event.isComposing) return false;
  if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return false;
  const key = String(event.key || '').toLowerCase();
  return key === 'n' || event.code === 'KeyN';
}

/** 수식어 없는 ←/→. 한 번 누를 때 한 장만 옮긴다 */
export function isJukeboxStepKey(event) {
  if (!event || event.repeat || event.isComposing) return false;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
  return event.key === 'ArrowLeft' || event.key === 'ArrowRight';
}
