/**
 * NoteInfoPanel
 *
 * Jukebox 중앙 카드(포커스된 노트)의 정보 표시영역.
 * 데스크톱은 제목·메타·메모 + 액션 버튼, 모바일은 제목 + 노트 인디케이터(또는 수정 버튼)로 갈라진다.
 * 기존 `.jukebox-focus-info__desktop` / `__mobile` 분기와 클래스명을 그대로 유지한다.
 */

import { formatNoteSizeLabel } from '../../utils/noteSize.js';
import { isFavoriteNote } from '../../utils/noteFavorites.js';
import { isBookmarksNoteId } from '../../utils/bookmarksNote.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import { render as renderButton } from '../Button/Button.js';
import { open as openDialog } from '../Dialog/Dialog.js';
import { showToast } from '../Toast/Toast.js';
import { requireAuth } from '../../services/auth.js';
import { trashNotionNote } from '../../services/createNote.js';
import './NoteInfoPanel.css';

/** 포커스 기준 한쪽 최대 슬롯 수 (전체 최대 1 + 2*N) */
const NOTE_INDICATOR_MAX_SIDE = 4;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function categoryLabel(note, filterMode) {
  if (filterMode === 'type') return note.type || note.notebookType || '';
  return note.notebookType || note.type || '';
}

/**
 * 모바일 노트 인디케이터
 * - focused(거리 0): 가운데 넓은 흰, 불투명
 * - 인접(거리 1): 짧은 캡슐
 * - 그 밖(거리 2+): 원형 점, 멀수록 투명
 * - focused는 항상 컨테이너 정중앙 (좌·우 flex:1 사이드)
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
 * @param {string} noteId
 * @param {boolean} favorites
 * @param {'desktop'|'mobile'} variant
 */
function renderFavoriteButton(noteId, favorites, variant = 'desktop') {
  const pressed = Boolean(favorites);
  /* 모바일 off만 star-line, 그 외(데스크톱·on)는 star-fill */
  const icon = variant === 'mobile' && !pressed ? MINGCUTE.starLine : MINGCUTE.starFill;
  return renderButton({
    shape: 'circle',
    size: 's',
    role: 'toolbar',
    tone: 'ghost',
    ariaLabel: pressed ? '즐겨찾기 해제' : '즐겨찾기 추가',
    title: pressed ? '즐겨찾기 해제' : '즐겨찾기 추가',
    ariaPressed: pressed,
    content: icon,
    className: `jukebox-focus-info__favorite jukebox-focus-info__favorite--${variant}${pressed ? ' is-favorite' : ''}`,
    dataset: {
      'note-id': noteId,
      action: 'favorite',
      variant
    }
  });
}

/**
 * @param {Object|null} note - 포커스된 노트. null이면 빈 상태
 * @param {'period'|'type'} filterMode
 * @param {{ index?: number, total?: number, actionsOpen?: boolean }} [opts]
 * @returns {string} HTML 문자열
 */
export function render(note, filterMode, opts = {}) {
  const { index = 0, total = 0, actionsOpen = false } = opts;
  const noteIndicator = renderNoteIndicator(index, total);

  if (!note) {
    return `<div class="jukebox-focus-info" aria-live="polite" data-actions-open="false">
      <div class="jukebox-focus-info__desktop">
        <div class="jukebox-focus-info__header jukebox-focus-info__header--empty">
          <p class="jukebox-focus-info__empty">노트를 선택하세요</p>
          <div class="jukebox-focus-info__actions">
            <button
              type="button"
              class="jukebox-focus-info__create"
              aria-label="노트 추가"
              title="노트 추가"
            >${MINGCUTE.addFill}</button>
          </div>
        </div>
      </div>
      <div class="jukebox-focus-info__mobile">
        <p class="jukebox-focus-info__empty">노트를 선택하세요</p>
      </div>
    </div>`;
  }

  const title = escapeHtml(note.title || '제목 없음');
  const category = escapeHtml(categoryLabel(note, filterMode));
  const pages = note.pageCount != null ? `${escapeHtml(String(note.pageCount))}장` : '';
  const size = escapeHtml(formatNoteSizeLabel(note.size) || note.size || '');
  const memo = escapeHtml(note.description || '');
  const noteId = escapeHtml(note.id || '');
  const isBookmarks = isBookmarksNoteId(note.id);
  const favorites = isFavoriteNote(note);
  const favoriteBtnDesktop = isBookmarks
    ? ''
    : renderFavoriteButton(noteId, favorites, 'desktop');
  const favoriteBtnMobile = isBookmarks
    ? ''
    : renderFavoriteButton(noteId, favorites, 'mobile');
  const metaParts = [category, pages, size].filter(Boolean);
  const editActions = isBookmarks
    ? ''
    : `
            <button
              type="button"
              class="jukebox-focus-info__edit"
              data-note-id="${noteId}"
              aria-label="노트 정보 수정"
              title="노트 정보 수정"
            >${MINGCUTE.edit2Fill}</button>
            <button
              type="button"
              class="jukebox-focus-info__add"
              data-note-id="${noteId}"
              aria-label="페이지 추가"
              title="페이지 추가"
            >${MINGCUTE.fileNewFill}</button>
            ${renderButton({
              shape: 'circle',
              size: 's',
              role: 'toolbar',
              ariaLabel: '노트 삭제',
              title: '노트 삭제',
              content: MINGCUTE.delete2Fill,
              className: 'jukebox-focus-info__delete',
              dataset: {
                'note-id': noteId,
                action: 'delete'
              }
            })}`;

  return `
    <div class="jukebox-focus-info" aria-live="polite" data-actions-open="${actionsOpen ? 'true' : 'false'}">
      <div class="jukebox-focus-info__desktop">
        <div class="jukebox-focus-info__header">
          <h2 class="jukebox-focus-info__title">${title}</h2>
          <div class="jukebox-focus-info__actions">
            ${favoriteBtnDesktop}
            ${editActions}
            <button
              type="button"
              class="jukebox-focus-info__create"
              aria-label="노트 추가"
              title="노트 추가"
            >${MINGCUTE.addFill}</button>
          </div>
        </div>
        ${metaParts.length ? `<p class="jukebox-focus-info__meta">${metaParts.join(' · ')}</p>` : ''}
        ${memo ? `<p class="jukebox-focus-info__memo">${memo}</p>` : ''}
      </div>
      <div class="jukebox-focus-info__mobile">
        <div class="jukebox-focus-info__mobile-row">
          <p class="jukebox-focus-info__note-title">${title}</p>
          ${favoriteBtnMobile}
        </div>
        ${
          actionsOpen && !isBookmarks
            ? `<button
          type="button"
          class="jukebox-focus-info__pager jukebox-focus-info__pager--edit"
          data-note-id="${noteId}"
          aria-label="수정"
        >${MINGCUTE.edit2Fill}<span>수정</span></button>`
            : noteIndicator
        }
      </div>
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
    panelClassName: 'note-delete-panel',
    showClose: false,
    canClose: () => !busy,
    bodyHtml: `
      <p class="note-delete-name">${noteName}</p>
      <p class="note-delete-text" id="note-delete-title">이 노트를 정말 삭제할까요?</p>
      <div class="note-delete-actions">
        ${renderButton({
          shape: 'text',
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
