/**
 * 페이지 북마크 시 목적지 북마크 노트 선택
 */

import { render as renderButton } from '../Button/Button.js';
import { open as openDialog, render as renderDialog } from '../Dialog/Dialog.js';
import { escapeHtml } from '../../utils/html.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import {
  countPagesByBookmarkNote,
  listBookmarkDestinations,
  MAX_PAGES_PER_BOOKMARK_NOTE
} from '../../utils/bookmarkNotes.js';
import { fetchBookmarkNotes } from '../../services/bookmarkNotes.js';
import { getBookmarkedPages } from '../../services/bookmarkedPages.js';
import './BookmarkNotePicker.css';

function destinationListHtml(destinations) {
  return (destinations || [])
    .map((note) => {
      const countLabel = `${note.pageCount || 0}/${MAX_PAGES_PER_BOOKMARK_NOTE}`;
      const title = escapeHtml(note.title || '북마크 노트');
      const suffix = note.isDefault ? ' · 기본' : '';
      return `
        <li>
          ${renderButton({
            shape: 'solid',
            block: true,
            disabled: Boolean(note.full),
            className: 'bookmark-picker__choice',
            ariaLabel: note.full
              ? `${note.title} — 가득 참 ${countLabel}`
              : `${note.title}에 저장 ${countLabel}`,
            dataset: { 'note-id': note.id },
            content: `${MINGCUTE.bookmarkFill}<span class="bookmark-picker__label">${title}${suffix}</span><span class="bookmark-picker__count">${countLabel}</span>`
          })}
        </li>`;
    })
    .join('');
}

/**
 * @param {{
 *   destinations?: Array<{ id: string, title: string, pageCount: number, remaining: number, full: boolean, isDefault?: boolean }>,
 *   titleId?: string,
 *   className?: string
 * }} [options]
 */
export function renderBookmarkNotePicker(options = {}) {
  const destinations = Array.isArray(options.destinations) ? options.destinations : [];
  return renderDialog({
    title: '북마크 노트 선택',
    titleId: options.titleId || 'bookmark-picker-title',
    className: ['bookmark-picker-dialog', options.className].filter(Boolean).join(' '),
    bodyHtml: renderBookmarkNotePickerBody(destinations)
  });
}

export function renderBookmarkNotePickerBody(destinations = []) {
  return `
      <p class="bookmark-picker__hint">이 페이지를 넣을 북마크 노트를 고르세요.</p>
      <ul class="bookmark-picker__list">${destinationListHtml(destinations)}</ul>
      ${renderButton({
        shape: 'text',
        block: true,
        content: '취소',
        className: 'bookmark-picker__cancel',
        dataset: { action: 'cancel' }
      })}
  `;
}

/**
 * @param {{ destinations: Array }} options
 * @returns {Promise<{ id: string, title: string }|null>}
 */
export function openBookmarkNotePicker(options = {}) {
  const destinations = Array.isArray(options.destinations) ? options.destinations : [];
  if (document.querySelector('.bookmark-picker-dialog')) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      dialog.close();
      resolve(value);
    };

    const dialog = openDialog({
      title: '북마크 노트 선택',
      titleId: 'bookmark-picker-title',
      className: 'bookmark-picker-dialog',
      bodyHtml: renderBookmarkNotePickerBody(destinations),
      onClose: () => finish(null)
    });

    dialog.overlay.addEventListener('click', (e) => {
      if (e.target?.closest?.('.bookmark-picker__cancel')) {
        e.preventDefault();
        finish(null);
        return;
      }
      const choice = e.target?.closest?.('.bookmark-picker__choice');
      if (!choice || choice.disabled) return;
      const id = choice.getAttribute('data-note-id');
      const dest = destinations.find((item) => item.id === id);
      if (!dest || dest.full) return;
      finish({ id: dest.id, title: dest.title });
    });
  });
}

/**
 * 북마크 추가 시 목적지. 사용자 노트가 없으면 기본권에 바로 넣는다.
 * @returns {Promise<{ id: string, title: string }|null>}
 */
export async function pickBookmarkDestination() {
  const [collections, pages] = await Promise.all([
    fetchBookmarkNotes(),
    getBookmarkedPages({ force: true }).catch(() => [])
  ]);
  const destinations = listBookmarkDestinations({
    collections,
    counts: countPagesByBookmarkNote(pages)
  });
  const available = destinations.filter((item) => !item.full);
  if (!available.length) {
    const err = new Error('북마크 노트가 모두 가득 찼습니다. 한 권당 50장까지입니다.');
    err.code = 'bookmark-full';
    throw err;
  }
  if (destinations.length === 1) return available[0];
  return openBookmarkNotePicker({ destinations });
}
