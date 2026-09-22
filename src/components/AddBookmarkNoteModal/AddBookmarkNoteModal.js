/**
 * 북마크 노트 추가·수정 모달
 *
 * 1) 이름(필수) · 표지(선택, 기본 Bookmark Note 표지)
 * 2) 모을 노트 복수 선택(필수)
 */

import { render as renderButton } from '../Button/Button.js';
import { open as openDialog, render as renderDialog } from '../Dialog/Dialog.js';
import { open as openConfirm } from '../Confirm/Confirm.js';
import { render as renderField, setStatus as setFormStatus } from '../FormField/FormField.js';
import { renderPicker as renderFilePicker, setPickerMeta } from '../FileUploadPreview/FileUploadPreview.js';
import { showToast } from '../Toast/Toast.js';
import { requireAuth } from '../../services/auth.js';
import { loadAllNotes } from '../../utils/notesCatalog.js';
import { escapeHtml } from '../../utils/html.js';
import {
  ADD_BOOKMARK_NOTE_ID,
  createCustomBookmarkNoteId,
  defaultBookmarkCovers,
  isCustomBookmarkNoteId
} from '../../utils/bookmarksNote.js';
import { isDemoNoteId } from '../../utils/demoNote.js';
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

const FORM_STEPS = 2;
const NAME_MAX = 40;

function coverPreviewHtml(kind, url) {
  if (url) return `<img src="${escapeHtml(url)}" alt="" />`;
  const label = kind === 'back' ? '뒷면 미리보기' : '앞면 미리보기';
  return `<span class="add-bookmark-preview-placeholder">${label}</span>`;
}

function sourceNoteOptions(notes, selectedIds) {
  const selected = new Set((selectedIds || []).map((id) => String(id)));
  return (notes || [])
    .filter((note) => note?.id && !isCustomBookmarkNoteId(note.id) && !isDemoNoteId(note.id))
    .filter((note) => note.id !== ADD_BOOKMARK_NOTE_ID)
    .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ko'))
    .map((note) => {
      const id = String(note.id);
      const title = escapeHtml(note.title || '제목 없음');
      const checked = selected.has(id) ? 'checked' : '';
      return `
        <li class="add-bookmark-source-item" data-title="${title.toLowerCase()}">
          <label class="form-check">
            <input type="checkbox" name="sourceNote" value="${escapeHtml(id)}" ${checked} />
            <span>${title}</span>
          </label>
        </li>`;
    })
    .join('');
}

/**
 * @param {{
 *   mode?: 'create'|'edit',
 *   step?: 1|2,
 *   seed?: { name?: string, sourceNoteIds?: string[] },
 *   coverFrontPreviewUrl?: string,
 *   coverBackPreviewUrl?: string,
 *   sourceNotes?: Array,
 *   idPrefix?: string,
 *   nextDisabled?: boolean
 * }} [options]
 */
export function renderAddBookmarkNoteForm(options = {}) {
  const isEdit = options.mode === 'edit';
  const currentStep = Math.min(FORM_STEPS, Math.max(1, Number(options.step) || 1));
  const seed = options.seed || {};
  const defaults = defaultBookmarkCovers();
  const idPrefix = options.idPrefix || 'add-bookmark';
  const nextDisabled = options.nextDisabled !== false;
  const name = String(seed.name || '').slice(0, NAME_MAX);
  const frontUrl = options.coverFrontPreviewUrl || defaults.coverFrontUrl;
  const backUrl = options.coverBackPreviewUrl || defaults.coverBackUrl;

  const progressHtml = [
    [1, '이름'],
    [2, '모을 노트']
  ]
    .map(([n, label]) => {
      const current = n === currentStep;
      const done = n < currentStep;
      const cls = [current ? 'is-current' : '', done ? 'is-done' : ''].filter(Boolean).join(' ');
      return `
          <li data-progress="${n}"${cls ? ` class="${cls}"` : ''}${
            current ? ' aria-current="step"' : ''
          }>
            <span class="add-bookmark-progress__index">${n}</span>${label}
          </li>`;
    })
    .join('');

  const stepAttrs = (n) => {
    const active = n === currentStep;
    return `class="add-bookmark-step${active ? ' is-active' : ''}" data-step="${n}"${
      active ? '' : ' inert aria-hidden="true"'
    }`;
  };

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
        <ol class="add-bookmark-progress" aria-label="북마크 노트 작성 단계">
          ${progressHtml}
        </ol>

        <div class="add-bookmark-steps">
        <div ${stepAttrs(1)}>
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
        </div>

        <div ${stepAttrs(2)}>
          ${renderField({
            type: 'custom',
            label: '모을 노트',
            required: true,
            hint: '이 북마크 노트에 담을 원본 노트를 고르세요',
            children: `
              <input class="field__input add-bookmark-source-search" type="search" placeholder="노트 이름 검색" autocomplete="off" />
              <ul class="add-bookmark-source-list" data-source-list>
                ${sourceNoteOptions(options.sourceNotes || [], seed.sourceNoteIds || [])}
              </ul>`
          })}
        </div>
        </div>

        <p class="form-status form-status--footer add-bookmark-status" hidden></p>

        <div class="add-bookmark-nav is-step-${currentStep}">
          ${renderButton({
            shape: 'text',
            block: true,
            content: '이전',
            className: 'add-bookmark-back',
            dataset: { action: 'back' }
          })}
          ${renderButton({
            shape: 'solid',
            type: 'button',
            content: '다음',
            className: 'add-bookmark-next',
            dataset: { action: 'next' },
            disabled: nextDisabled
          })}
          ${renderButton({
            shape: 'solid',
            type: 'submit',
            content: isEdit ? '북마크 노트 수정하기' : '북마크 노트 만들기',
            className: 'add-bookmark-submit'
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

function selectedSourceNotes(form, catalog) {
  const ids = [...(form?.querySelectorAll('input[name="sourceNote"]:checked') || [])].map(
    (input) => input.value
  );
  const byId = new Map((catalog || []).map((note) => [note.id, note]));
  return ids.map((id) => {
    const note = byId.get(id);
    return { id, title: note?.title || note?.name || id };
  });
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

  const catalog = (await loadAllNotes().catch(() => [])).filter(
    (note) => note?.id && !isCustomBookmarkNoteId(note.id) && !isDemoNoteId(note.id)
  );
  const defaults = defaultBookmarkCovers();
  const seed = isEdit
    ? {
        name: options.note.title,
        sourceNoteIds: options.note.sourceNoteIds || (options.note.sourceNotes || []).map((n) => n.id)
      }
    : { name: '', sourceNoteIds: [] };

  const dialog = openDialog({
    title: isEdit ? '북마크 노트 수정' : '새 북마크 노트 추가',
    titleId: 'add-bookmark-title',
    className: 'add-bookmark-dialog',
    bodyHtml: renderAddBookmarkNoteForm({
      mode: isEdit ? 'edit' : 'create',
      seed,
      sourceNotes: catalog,
      coverFrontPreviewUrl: options.note?.coverFrontUrl || defaults.coverFrontUrl,
      coverBackPreviewUrl: options.note?.coverBackUrl || defaults.coverBackUrl
    })
  });

  const overlay = dialog.overlay;
  const form = overlay.querySelector('.add-bookmark-form');
  const statusEl = overlay.querySelector('.add-bookmark-status');
  const nextBtn = overlay.querySelector('.add-bookmark-next');
  const backBtn = overlay.querySelector('.add-bookmark-back');
  const navEl = overlay.querySelector('.add-bookmark-nav');
  const searchInput = overlay.querySelector('.add-bookmark-source-search');
  let currentStep = 1;
  let frontDataUrl = '';
  let backDataUrl = '';

  const setStatus = (message, isError = false) => setFormStatus(statusEl, message, isError);

  const isStepReady = (step) => {
    if (!form) return false;
    if (step === 1) return Boolean(String(form.querySelector('input[name="name"]')?.value || '').trim());
    return selectedSourceNotes(form, catalog).length > 0;
  };

  const setStep = (step, { clearStatus = true } = {}) => {
    currentStep = Math.min(FORM_STEPS, Math.max(1, step));
    form?.querySelectorAll('.add-bookmark-step').forEach((el) => {
      const n = Number(el.dataset.step);
      const active = n === currentStep;
      el.classList.toggle('is-active', active);
      el.toggleAttribute('inert', !active);
      el.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    form?.querySelectorAll('[data-progress]').forEach((el) => {
      const n = Number(el.dataset.progress);
      el.classList.toggle('is-current', n === currentStep);
      el.classList.toggle('is-done', n < currentStep);
      if (n === currentStep) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
    navEl?.classList.remove('is-step-1', 'is-step-2');
    navEl?.classList.add(`is-step-${currentStep}`);
    if (clearStatus) setStatus('', false);
    if (nextBtn) nextBtn.disabled = !isStepReady(currentStep);
    const focus =
      currentStep === 1
        ? form?.querySelector('input[name="name"]')
        : form?.querySelector('.add-bookmark-source-search');
    focus?.focus();
  };

  const syncNext = () => {
    if (nextBtn) nextBtn.disabled = !isStepReady(currentStep);
  };

  form?.addEventListener('input', syncNext);
  form?.addEventListener('change', syncNext);
  searchInput?.addEventListener('input', () => {
    const q = String(searchInput.value || '').trim().toLowerCase();
    overlay.querySelectorAll('.add-bookmark-source-item').forEach((item) => {
      const title = item.getAttribute('data-title') || '';
      item.hidden = Boolean(q) && !title.includes(q);
    });
  });

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

  backBtn?.addEventListener('click', () => setStep(currentStep - 1));
  nextBtn?.addEventListener('click', () => {
    if (!isStepReady(currentStep)) {
      setStatus(currentStep === 1 ? '이름은 필수입니다.' : '모을 노트를 한 권 이상 고르세요.', true);
      return;
    }
    setStep(currentStep + 1);
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentStep < FORM_STEPS) {
      nextBtn?.click();
      return;
    }
    const name = String(form.querySelector('input[name="name"]')?.value || '').trim().slice(0, NAME_MAX);
    const sourceNotes = selectedSourceNotes(form, catalog);
    if (!name) {
      setStep(1, { clearStatus: false });
      setStatus('이름은 필수입니다.', true);
      return;
    }
    if (!sourceNotes.length) {
      setStatus('모을 노트를 한 권 이상 고르세요.', true);
      return;
    }

    const nextNote = {
      id: isEdit ? options.note.id : createCustomBookmarkNoteId(),
      title: name,
      sourceNoteIds: sourceNotes.map((note) => note.id),
      sourceNotes,
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
