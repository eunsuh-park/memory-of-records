/**
 * NoteInfoPanel
 *
 * Jukebox 중앙 카드(포커스된 노트)의 정보 표시영역.
 * 데스크톱은 제목·메타·메모 + 액션 버튼, 모바일은 제목 + 페이저(또는 수정 버튼)로 갈라진다.
 * 기존 `.jukebox-focus-info__desktop` / `__mobile` 분기와 클래스명을 그대로 유지한다.
 */

import { formatNoteSizeLabel } from '../../utils/noteSize.js';
import { isFavoriteNote } from '../../utils/noteFavorites.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import { render as renderButton } from '../Button/Button.js';
import './NoteInfoPanel.css';

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
  const pager =
    total > 0 ? `${escapeHtml(String(index + 1))} / ${escapeHtml(String(total))}` : '';

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
  const favorites = isFavoriteNote(note);
  const favoriteBtnDesktop = renderFavoriteButton(noteId, favorites, 'desktop');
  const favoriteBtnMobile = renderFavoriteButton(noteId, favorites, 'mobile');
  const metaParts = [category, pages, size].filter(Boolean);

  return `
    <div class="jukebox-focus-info" aria-live="polite" data-actions-open="${actionsOpen ? 'true' : 'false'}">
      <div class="jukebox-focus-info__desktop">
        <div class="jukebox-focus-info__header">
          <h2 class="jukebox-focus-info__title">${title}</h2>
          <div class="jukebox-focus-info__actions">
            ${favoriteBtnDesktop}
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
          actionsOpen
            ? `<button
          type="button"
          class="jukebox-focus-info__pager jukebox-focus-info__pager--edit"
          data-note-id="${noteId}"
          aria-label="수정"
        >${MINGCUTE.edit2Fill}<span>수정</span></button>`
            : pager
              ? `<span class="jukebox-focus-info__pager">${pager}</span>`
              : ''
        }
      </div>
    </div>
  `;
}
