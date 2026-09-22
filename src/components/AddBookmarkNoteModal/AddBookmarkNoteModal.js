/**
 * 북마크 노트 추가·수정 모달
 *
 * 이름(필수) · 표지(선택) · 메모(선택, 최대 100자)
 */

import { render as renderButton } from '../Button/Button.js';
import { open as openDialog, render as renderDialog } from '../Dialog/Dialog.js';
import { open as openConfirm } from '../Confirm/Confirm.js';
import { render as renderField, setStatus as setFormStatus } from '../FormField/FormField.js';
import { renderPicker as renderFilePicker, setPickerMeta } from '../FileUploadPreview/FileUploadPreview.js';
import { showToast } from '../Toast/Toast.js';
import { requireAuth } from '../../services/auth.js';
import { escapeHtml } from '../../utils/html.js';
import {
  createCustomBookmarkNoteId,
  defaultBookmarkCovers,
  isCustomBookmarkNoteId
} from '../../utils/bookmarksNote.js';
import {
  MAX_CUSTOM_BOOKMARK_NOTES,
  canCreateBookmarkNote,
  customBookmarkNoteCount,
  filterPagesForBookmarkNote
} from '../../utils/bookmarkNotes.js';
import {
  clearBookmarkNotesCache,
  fetchBookmarkNotes,
  saveBookmarkNotes
} from '../../services/bookmarkNotes.js';
import { getBookmarkedPages, clearBookmarkedPagesCache } from '../../services/bookmarkedPages.js';
import { updatePageMeta } from '../../services/pages.js';
import './AddBookmarkNoteModal.css';

const NAME_MAX = 40;
const MEMO_MAX = 100;

function coverPreviewHtml(kind, url) {
  if (url) return `<img src="${escapeHtml(url)}" alt="" />`;
  const label = kind === 'back' ? '뒷면 미리보기' : '앞면 미리보기';
  return `<span class="add-bookmark-preview-placeholder">${label}</span>`;
}

/**
 * @param {{
 *   mode?: 'create'|'edit',
 *   seed?: { name?: string, memo?: string },
 *   coverFrontPreviewUrl?: string,
 *   coverBackPreviewUrl?: string,
 *   submitDisabled?: boolean
 * }} [options]
 */
export function renderAddBookmarkNoteForm(options = {}) {
  const isEdit = options.mode === 'edit';
  const seed = options.seed || {};
  const defaults = defaultBookmarkCovers();
  const submitDisabled = options.submitDisabled !== false;
  const name = String(seed.name || '').slice(0, NAME_MAX);
  const memo = String(seed.memo || '').slice(0, MEMO_MAX);
  const frontUrl = options.coverFrontPreviewUrl || defaults.coverFrontUrl;
  const backUrl = options.coverBackPreviewUrl || defaults.coverBackUrl;

  const coverFieldHtml = (kind) => {
    const label = kind === 'back' ? '표지 뒷면' : '표지 앞면';
    const inputName = kind === 'back' ? 'coverBack' : 'coverFront';
    const previewUrl = kind === 'back' ? backUrl : frontUrl;
    return renderField({
      type: 'custom',
      label,
      className: 'add-bookmark-cover-field',
      hint: '선택. 비우면 기본 표지',
      hintInline: true,
      children: `
        ${renderFilePicker({
          name: inputName,
          accept: 'image/*',
          pickLabel: '파일 선택'
        })}
        <div class="add-bookmark-preview" data-preview="${kind}" aria-hidden="true">
          ${coverPreviewHtml(kind, previewUrl)}
        </div>`
    });
  };

  return `
      <form class="form add-bookmark-form" novalidate>
        ${renderField({
          label: '이름',
          name: 'name',
          required: true,
          placeholder: '예: 여행 스크랩',
          value: name,
          maxLength: NAME_MAX
        })}
        <div class="add-bookmark-covers">
          ${coverFieldHtml('front')}
          ${coverFieldHtml('back')}
        </div>
        ${renderField({
          type: 'textarea',
          label: '메모',
          name: 'memo',
          placeholder: '이 북마크 노트에 대한 짧은 메모 (선택)',
          value: memo,
          maxLength: MEMO_MAX,
          rows: 3
        })}
        <p class="form-status form-status--footer add-bookmark-status" hidden></p>
        <div class="dialog-actions dialog-actions--stack add-bookmark-footer">
          ${renderButton({
            shape: 'solid',
            type: 'submit',
            block: true,
            content: isEdit ? '북마크 노트 수정하기' : '북마크 노트 만들기',
            className: 'add-bookmark-submit',
            disabled: submitDisabled
          })}
        </div>
      </form>
  `;
}

export function renderAddBookmarkNoteModal(options = {}) {
  const isEdit = options.mode === 'edit';
  return renderDialog({
    title: isEdit ? '북마크 노트 수정' : '새 북마크 노트 추가',
    titleId: options.titleId || 'add-bookmark-title',
    className: ['add-bookmark-dialog', options.className].filter(Boolean).join(' '),
    bodyHtml: renderAddBookmarkNoteForm(options)
  });
}

function readMemo(form) {
  return String(form?.querySelector('textarea[name="memo"]')?.value || '')
    .trim()
    .slice(0, MEMO_MAX);
}

function isFormReady(form) {
  return Boolean(String(form?.querySelector('input[name="name"]')?.value || '').trim());
}

/**
 * @param {{
 *   mode?: 'create'|'edit',
 *   note?: object,
 *   onCreated?: (note: object) => void,
 *   onUpdated?: (note: object) => void
 * }} [options]
 */
export async function openAddBookmarkNoteModal(options = {}) {
  if (document.querySelector('.add-bookmark-dialog')) return;
  if (!(await requireAuth())) return;

  const isEdit = options.mode === 'edit' && isCustomBookmarkNoteId(options.note?.id);
  const existing = await fetchBookmarkNotes({ force: true }).catch(() => []);
  if (!isEdit && !canCreateBookmarkNote(customBookmarkNoteCount(existing))) {
    showToast(`북마크 노트는 최대 ${MAX_CUSTOM_BOOKMARK_NOTES}권까지 만들 수 있습니다`);
    return;
  }

  const defaults = defaultBookmarkCovers();
  const seed = isEdit
    ? {
        name: options.note.title,
        memo: options.note.description || ''
      }
    : { name: '', memo: '' };

  const dialog = openDialog({
    title: isEdit ? '북마크 노트 수정' : '새 북마크 노트 추가',
    titleId: 'add-bookmark-title',
    className: 'add-bookmark-dialog',
    bodyHtml: renderAddBookmarkNoteForm({
      mode: isEdit ? 'edit' : 'create',
      seed,
      coverFrontPreviewUrl: options.note?.coverFrontUrl || defaults.coverFrontUrl,
      coverBackPreviewUrl: options.note?.coverBackUrl || defaults.coverBackUrl
    })
  });

  const overlay = dialog.overlay;
  const form = overlay.querySelector('.add-bookmark-form');
  const statusEl = overlay.querySelector('.add-bookmark-status');
  const submitBtn = overlay.querySelector('.add-bookmark-submit');
  let frontDataUrl = '';
  let backDataUrl = '';

  const setStatus = (message, isError = false) => setFormStatus(statusEl, message, isError);

  const syncSubmit = () => {
    if (submitBtn) submitBtn.disabled = !isFormReady(form);
  };

  form?.addEventListener('input', syncSubmit);
  form?.addEventListener('change', syncSubmit);

  overlay.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener('change', () => {
      const field = input.closest('.add-bookmark-cover-field');
      const preview = field?.querySelector('.add-bookmark-preview');
      const kind = preview?.dataset.preview === 'back' ? 'back' : 'front';
      const file = input.files?.[0];
      if (!file) {
        setPickerMeta(field, { fileName: '' });
        if (preview) {
          preview.innerHTML = coverPreviewHtml(
            kind,
            kind === 'back' ? defaults.coverBackUrl : defaults.coverFrontUrl
          );
        }
        if (kind === 'back') backDataUrl = '';
        else frontDataUrl = '';
        return;
      }
      if (!String(file.type || '').startsWith('image/')) {
        input.value = '';
        showToast('이미지 파일만 선택할 수 있습니다');
        return;
      }
      setPickerMeta(field, { fileName: file.name });
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || '');
        if (kind === 'back') backDataUrl = url;
        else frontDataUrl = url;
        if (preview) preview.innerHTML = coverPreviewHtml(kind, url);
      };
      reader.readAsDataURL(file);
    });
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = String(form.querySelector('input[name="name"]')?.value || '').trim().slice(0, NAME_MAX);
    const memo = readMemo(form);
    if (!name) {
      setStatus('이름은 필수입니다.', true);
      form.querySelector('input[name="name"]')?.focus();
      return;
    }

    const nextNote = {
      id: isEdit ? options.note.id : createCustomBookmarkNoteId(),
      title: name,
      description: memo,
      sourceNoteIds: isEdit ? options.note.sourceNoteIds || [] : [],
      sourceNotes: isEdit ? options.note.sourceNotes || [] : [],
      coverFrontUrl: frontDataUrl || options.note?.coverFrontUrl || '',
      coverBackUrl: backDataUrl || options.note?.coverBackUrl || '',
      createdAt: isEdit ? options.note.createdAt || new Date().toISOString() : new Date().toISOString()
    };

    const nextList = isEdit
      ? existing.map((note) => (note.id === nextNote.id ? nextNote : note))
      : [...existing, nextNote];

    dialog.close();
    try {
      await saveBookmarkNotes(nextList);
      clearBookmarkNotesCache();
      showToast(isEdit ? '북마크 노트를 수정했습니다' : '북마크 노트를 만들었습니다');
      if (isEdit) options.onUpdated?.(nextNote);
      else options.onCreated?.(nextNote);
    } catch (err) {
      showToast(err?.message || '북마크 노트 저장에 실패했습니다.');
    }
  });

  syncSubmit();
  form?.querySelector('input[name="name"]')?.focus();
}

/**
 * @param {{ note: object, onDeleted?: () => void }} options
 */
export async function openDeleteBookmarkNoteDialog(options = {}) {
  const note = options.note || {};
  if (!isCustomBookmarkNoteId(note.id)) return;
  if (document.querySelector('.bookmark-delete-dialog')) return;
  if (!(await requireAuth())) return;

  openConfirm({
    title: '북마크 노트를 삭제할까요?',
    titleId: 'bookmark-delete-title',
    className: 'bookmark-delete-dialog',
    message: `「${note.title || '북마크 노트'}」와 그 안에 담긴 페이지 북마크가 해제됩니다.`,
    cancelLabel: '취소',
    confirmLabel: '삭제',
    cancelChoice: 'cancel',
    onConfirm: async () => {
      try {
        const [existing, pages] = await Promise.all([
          fetchBookmarkNotes({ force: true }),
          getBookmarkedPages({ force: true }).catch(() => [])
        ]);
        const owned = filterPagesForBookmarkNote(pages, note.id);
        await Promise.all(
          owned.map((page) =>
            updatePageMeta({
              publicId: page.publicId,
              folder: page.folderUrl || page.noteFolder,
              pageNumber: page.pageNumber,
              is_bookmarked: false,
              bookmark_note_id: ''
            }).catch((err) => {
              console.warn('[bookmarkNotes] unbookmark failed', err);
            })
          )
        );
        await saveBookmarkNotes(existing.filter((item) => item.id !== note.id));
        clearBookmarkNotesCache();
        clearBookmarkedPagesCache();
        showToast('북마크 노트를 삭제했습니다');
        options.onDeleted?.();
      } catch (err) {
        showToast(err?.message || '북마크 노트 삭제에 실패했습니다.');
      }
    }
  });
}
