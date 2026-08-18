/**
 * NoteInfoPanel
 *
 * Jukebox 중앙 카드(포커스된 노트)의 정보 표시영역.
 * 노트명 · Icon Button 5개(공유/즐겨찾기/수정/페이지 추가/삭제) · 메모.
 */

import { renderIconButton } from '../Button/Button.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import { isNoteFavorite } from '../../utils/noteFavorites.js';
import './NoteInfoPanel.css';

const MEMO_MAX_CHARS = 70;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMemo(value) {
  const raw = String(value || '');
  return escapeHtml(raw.length > MEMO_MAX_CHARS ? raw.slice(0, MEMO_MAX_CHARS) : raw);
}

function iconAction({ action, label, icon, noteId, pressed = null }) {
  return renderIconButton({
    ariaLabel: label,
    title: label,
    ariaPressed: pressed,
    content: icon,
    className: `jukebox-focus-info__${action}`,
    dataset: { 'note-id': noteId, action }
  });
}

/**
 * @param {Object|null} note - 포커스된 노트. null이면 빈 상태
 * @param {'period'|'type'} [_filterMode]
 * @param {{ index?: number, total?: number, actionsOpen?: boolean }} [_opts]
 * @returns {string} HTML 문자열
 */
export function render(note, _filterMode, _opts = {}) {
  if (!note) {
    return `<div class="jukebox-focus-info" aria-live="polite">
      <p class="jukebox-focus-info__empty">노트를 선택하세요</p>
    </div>`;
  }

  const title = escapeHtml(note.title || '제목 없음');
  const memo = formatMemo(note.description || '');
  const noteId = escapeHtml(note.id || '');
  const favorited = isNoteFavorite(note.id);

  return `
    <div class="jukebox-focus-info" aria-live="polite">
      <div class="jukebox-focus-info__main">
        <h2 class="jukebox-focus-info__title">${title}</h2>
        <div class="jukebox-focus-info__actions">
          ${iconAction({
            action: 'share',
            label: '공유',
            icon: MINGCUTE.share2Line,
            noteId
          })}
          ${iconAction({
            action: 'favorite',
            label: '즐겨찾기',
            icon: favorited ? MINGCUTE.starFill : MINGCUTE.starLine,
            noteId,
            pressed: favorited
          })}
          ${iconAction({
            action: 'edit',
            label: '노트 정보 수정',
            icon: MINGCUTE.edit2Fill,
            noteId
          })}
          ${iconAction({
            action: 'add-page',
            label: '페이지 추가',
            icon: MINGCUTE.fileNewFill,
            noteId
          })}
          ${iconAction({
            action: 'delete',
            label: '삭제',
            icon: MINGCUTE.delete2Line,
            noteId
          })}
        </div>
      </div>
      ${memo ? `<p class="jukebox-focus-info__memo">${memo}</p>` : ''}
    </div>
  `;
}
