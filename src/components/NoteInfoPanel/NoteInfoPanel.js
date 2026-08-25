/**
 * NoteInfoPanel
 *
 * Jukebox 중앙 카드(포커스된 노트)의 정보 표시영역.
 * 노트명 · Icon Button 5개(공유/즐겨찾기/수정/페이지 추가/삭제) · 메모.
 * 모바일·타블렛에서는 도구모음을 기본으로 보여 주고, 메모는 CSS로 숨긴다(위치는 Backlog).
 */

import { renderIconButton, render as renderButton } from '../Button/Button.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import { isFavoriteNote } from '../../utils/noteFavorites.js';
import { isBookmarksNoteId } from '../../utils/bookmarksNote.js';
import { isDemoNoteId } from '../../utils/demoNote.js';
import { escapeHtml } from '../../utils/html.js';
import { open as openDialog } from '../Dialog/Dialog.js';
import { showToast } from '../Toast/Toast.js';
import { requireAuth } from '../../services/auth.js';
import { trashNotionNote } from '../../services/createNote.js';
import './NoteInfoPanel.css';

const MEMO_MAX_CHARS = 70;

/** 포커스 기준 한쪽 최대 슬롯 수 (전체 최대 1 + 2*N) */
const NOTE_INDICATOR_MAX_SIDE = 4;

function formatMemo(value) {
  const raw = String(value || '');
  return escapeHtml(raw.length > MEMO_MAX_CHARS ? raw.slice(0, MEMO_MAX_CHARS) : raw);
}

function iconAction({ action, label, icon, noteId, pressed = null, extraClass = '' }) {
  return renderIconButton({
    ariaLabel: label,
    title: label,
    ariaPressed: pressed,
    content: icon,
    className: [`jukebox-focus-info__${action}`, extraClass].filter(Boolean).join(' '),
    dataset: { 'note-id': noteId, action }
  });
}

/**
 * 모바일 노트 인디케이터
 *
 * @param {number} index - 0-based
 * @param {number} total
 * @returns {string}
 */
export function renderNoteIndicator(index, total) {
  const count = Math.max(0, Number(total) || 0);
  if (count <= 0) return '';
  const current = Math.max(0, Math.min(count - 1, Number(index) || 0));

  const leftItems = [];
  for (let dist = Math.min(NOTE_INDICATOR_MAX_SIDE, current); dist >= 1; dist -= 1) {
    leftItems.push(
      `<span class="note-indicator__item note-indicator__item--d${dist}" aria-hidden="true"></span>`
    );
  }

  const rightItems = [];
  const rightMax = Math.min(NOTE_INDICATOR_MAX_SIDE, count - 1 - current);
  for (let dist = 1; dist <= rightMax; dist += 1) {
    rightItems.push(
      `<span class="note-indicator__item note-indicator__item--d${dist}" aria-hidden="true"></span>`
    );
  }

  const label = `${current + 1} / ${count}`;
  return `
    <div
      class="note-indicator"
      role="img"
      aria-label="${escapeHtml(label)}"
      data-index="${current}"
      data-total="${count}"
    >
      <div class="note-indicator__side note-indicator__side--left">${leftItems.join('')}</div>
      <span class="note-indicator__item note-indicator__item--focus" aria-hidden="true"></span>
      <div class="note-indicator__side note-indicator__side--right">${rightItems.join('')}</div>
    </div>
  `;
}

/**
 * @param {Object|null} note - 포커스된 노트. null이면 빈 문자열
 * @param {'period'|'type'} [_filterMode]
 * @param {{ index?: number, total?: number, compact?: boolean, canEdit?: boolean }} [opts]
 * @returns {string} HTML 문자열
 */
export function render(note, _filterMode, opts = {}) {
  const { canEdit = false, compact = false } = opts;

  if (!note) return '';

  const title = escapeHtml(note.title || '제목 없음');
  const memo = formatMemo(note.description || '');
  const noteId = note.id || '';
  const isVirtual = isBookmarksNoteId(note.id) || isDemoNoteId(note.id);
  const favorited = isFavoriteNote(note);
  const showShareFav = !isVirtual;
  const showEditActions = Boolean(canEdit) && !isVirtual;

  const actions = [
    showShareFav
      ? iconAction({
          action: 'share',
          label: '공유',
          icon: MINGCUTE.share2Fill,
          noteId
        })
      : '',
    showShareFav
      ? iconAction({
          action: 'favorite',
          label: favorited ? '즐겨찾기 해제' : '즐겨찾기 추가',
          icon: favorited ? MINGCUTE.starFill : MINGCUTE.starLine,
          noteId,
          pressed: favorited,
          extraClass: favorited ? 'is-favorite' : ''
        })
      : '',
    showEditActions
      ? iconAction({
          action: 'edit',
          label: '노트 정보 수정',
          icon: MINGCUTE.edit2Fill,
          noteId,
          extraClass: 'auth-only'
        })
      : '',
    showEditActions
      ? iconAction({
          action: 'add',
          label: '페이지 추가',
          icon: MINGCUTE.fileNewFill,
          noteId,
          extraClass: 'auth-only'
        })
      : '',
    showEditActions
      ? iconAction({
          action: 'delete',
          label: '삭제',
          icon: MINGCUTE.delete2Fill,
          noteId,
          extraClass: 'auth-only'
        })
      : ''
  ]
    .filter(Boolean)
    .join('');

  const details = [
    actions ? `<div class="jukebox-focus-info__actions">${actions}</div>` : '',
    memo ? `<p class="jukebox-focus-info__memo">${memo}</p>` : ''
  ]
    .filter(Boolean)
    .join('');

  const classes = [
    'jukebox-focus-info',
    compact ? 'jukebox-focus-info--compact' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return `
    <div class="${classes}" aria-live="polite">
      <div class="jukebox-focus-info__main">
        <h2 class="jukebox-focus-info__title">${title}</h2>
      </div>
      ${details ? `<div class="jukebox-focus-info__details">${details}</div>` : ''}
    </div>
  `;
}

/**
 * 노트 삭제 확인 Dialog. 삭제 시 휴지통 DB로 이동한다.
 * @param {{
 *   note: { id?: string, title?: string },
 *   onDeleted?: () => void
 * }} options
 */
export async function openDeleteNoteDialog(options = {}) {
  if (document.querySelector('.note-delete-dialog')) return;
  if (!(await requireAuth())) return;

  const note = options.note || {};
  const noteId = String(note.id || '').trim();
  if (!noteId) return;

  const noteName = escapeHtml(note.title || '제목 없음');
  let busy = false;

  const dialog = openDialog({
    titleId: 'note-delete-title',
    className: 'note-delete-dialog',
    panelClassName: 'dialog__panel--narrow',
    showClose: false,
    canClose: () => !busy,
    bodyHtml: `
      <p class="note-delete-name">${noteName}</p>
      <p class="note-delete-text" id="note-delete-title">이 노트를 정말 삭제할까요?</p>
      <div class="dialog-actions">
        ${renderButton({
          shape: 'text',
          block: true,
          content: '취소',
          className: 'note-delete-cancel',
          dataset: { choice: 'cancel' }
        })}
        ${renderButton({
          shape: 'solid',
          content: '삭제',
          className: 'note-delete-confirm',
          dataset: { choice: 'confirm' }
        })}
      </div>`
  });

  const setBusy = (next) => {
    busy = next;
    dialog.overlay.querySelectorAll('button').forEach((btn) => {
      btn.disabled = next;
    });
  };

  dialog.overlay.addEventListener('click', async (e) => {
    const btn = e.target?.closest?.('[data-choice]');
    if (!btn || busy) return;
    const choice = btn.getAttribute('data-choice');
    if (choice !== 'confirm') {
      dialog.close();
      return;
    }

    setBusy(true);
    try {
      await trashNotionNote({ id: noteId });
      busy = false;
      dialog.close();
      showToast('노트를 휴지통으로 옮겼습니다');
      options.onDeleted?.();
    } catch (err) {
      setBusy(false);
      showToast(err?.message || '노트 삭제에 실패했습니다.');
    }
  });
}
