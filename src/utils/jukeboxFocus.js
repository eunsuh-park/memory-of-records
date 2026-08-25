/**
 * 새 노트 생성 후 주크박스에서 해당 카드로 맞추기 위한 포커스 요청.
 * AddNoteFab → (페이지 추가 여부 무관) 확인 시 sessionStorage에 id를 남기고,
 * Jukebox가 갤러리를 채울 때 소비한다.
 */

import { periodOptions } from '../data/periodOptions.js';
import { typeOptions } from '../data/typeOptions.js';

const FOCUS_KEY = 'mor-jukebox-focus-note';

/**
 * @param {string} noteId
 */
export function requestJukeboxFocus(noteId) {
  const id = String(noteId || '').trim();
  if (!id) return;
  try {
    sessionStorage.setItem(FOCUS_KEY, id);
  } catch {
    /* quota / private mode */
  }
}

/** @returns {string} */
export function consumeJukeboxFocus() {
  try {
    const id = String(sessionStorage.getItem(FOCUS_KEY) || '').trim();
    if (id) sessionStorage.removeItem(FOCUS_KEY);
    return id;
  } catch {
    return '';
  }
}

/**
 * @param {string} value
 * @param {Array<{ value?: string, label?: string, labelKr?: string }>} options
 * @param {string[]} keys
 * @returns {string|null}
 */
function matchOption(value, options, keys) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  const match = options.find((opt) =>
    keys.some((key) => String(opt[key] || '').toLowerCase() === normalized)
  );
  return match?.value || null;
}

/**
 * 방금 만든 노트가 보이는 주크박스 경로.
 * 지금 By type이면 타입 필터, 그 외에는 시기(Timeline)를 우선한다.
 *
 * @param {{ periodName?: string, period?: string, type?: string, notebookType?: string }} [note]
 * @returns {string}
 */
export function jukeboxPathForNote(note = {}) {
  const periodKey = matchOption(note.periodName || note.period, periodOptions, [
    'value',
    'label'
  ]);
  const typeKey = matchOption(note.type || note.notebookType, typeOptions, [
    'value',
    'label',
    'labelKr'
  ]);
  const path = typeof window !== 'undefined' ? window.location.pathname : '';

  if (path.includes('/by-type') && typeKey) return `/by-type/${typeKey}`;
  if (path.includes('/timeline') && periodKey) return `/timeline/${periodKey}`;
  if (periodKey) return `/timeline/${periodKey}`;
  if (typeKey) return `/by-type/${typeKey}`;
  return '/timeline';
}
