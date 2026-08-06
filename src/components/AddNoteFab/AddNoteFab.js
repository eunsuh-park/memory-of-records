/**
 * 우측 하단 FAB(+) → 새 노트 추가 / 노트 정보 수정 모달
 *
 * 흐름:
 * 1) 폼 작성 (이름·앞뒤표지·타입·사용 시작일 필수, is_kept/visible 기본 true)
 * 2) 뒷표지를 앞표지 크기에 맞춰 크롭 → Cloudinary 업로드 (Front/Back 폴더, 파일명=노트명)
 * 3) Notion DB에 페이지 생성 또는 기존 페이지 PATCH
 */

import { render as renderButton } from '../Button/Button.js';
import { open as openDialog } from '../Dialog/Dialog.js';
import { render as renderField, renderColorSwatches } from '../FormField/FormField.js';
import { renderOptions as renderSelectOptions } from '../Select/Select.js';
import { renderPicker as renderFilePicker } from '../FileUploadPreview/FileUploadPreview.js';
import { showToast } from '../Toast/Toast.js';
import { typeOptions } from '../../data/typeOptions.js';
import { periodOptions } from '../../data/periodOptions.js';
import {
  createNotionNote,
  cropImageDataUrlToSize,
  fetchNoteFormMeta,
  getImageSizeFromDataUrl,
  MAX_COVER_BYTES,
  readFileAsDataUrl,
  updateNotionNote,
  uploadCoverImage,
  validateCoverImageFile
} from '../../services/createNote.js';
import { renameNoteContentFolder } from '../../services/pages.js';
import { clearNotionNotebooksCache } from '../../services/notionNotebooks.js';
import { clearNotionTypeItemsCache } from '../../services/notionByType.js';
import { markNoteUnseen } from '../../utils/unseenNotes.js';
import {
  openAddPageModal,
  openAddPagesConfirmDialog
} from '../AddPageModal/AddPageModal.js';
import { requireAuth } from '../../services/auth.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import uploadingLottieUrl from '../../assets/uploading.json?url';
import './AddNoteFab.css';

const PLUS_ICON = MINGCUTE.addFill;

const FALLBACK_TYPES = typeOptions.map((t) => t.labelKr);
const FALLBACK_PERIODS = periodOptions.map((p) => p.label);
const FALLBACK_COLORS = ['파랑', '빨강', '검정', '초록', '노랑', '보라', '회색', '갈색', '분홍', '흰색'];
const FALLBACK_SIZES = ['A4', 'A5', 'A6', 'B5', 'B6', '16절', '8절', '4절'];

/* 노트 표지 색상 이름 → 스와치 색. 실제 노트 색을 흉내내는 값이라 테마 토큰이 아니다 */
const COLOR_CHIP_HEX = {
  파랑: '#4a7fcb',
  빨강: '#c94c4c',
  검정: '#1a1a1a',
  초록: '#4a9b6e',
  노랑: '#e6c84a',
  보라: '#8b6bb8',
  회색: '#8a8a8a',
  갈색: '#8b5a3c',
  분홍: '#e89bb5',
  흰색: '#f5f5f5'
};

/** 스와치가 배경에 묻히는 밝은 색 (테두리 보정) */
const LIGHT_COLOR_NAMES = ['흰색', '노랑'];

const NOTES_PLACEHOLDER =
  '이 노트는 무슨 용도로 사용하고 있나요? 어떤 애착이 있나요? 주로 언제 쓰나요? 이 노트가 당신에게 어떤 영감을 주나요?';

function showUploadingOverlay(message = '표지를 업로드하는 중…') {
  hideUploadingOverlay();
  const overlay = document.createElement('div');
  overlay.className = 'add-note-upload-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.innerHTML = `
    <dotlottie-wc
      class="add-note-upload-lottie"
      src="${uploadingLottieUrl}"
      style="width: 300px; height: 300px"
      autoplay
      loop
    ></dotlottie-wc>
    <p class="add-note-upload-text">${escapeHtml(message)}</p>
  `;
  document.body.appendChild(overlay);
  document.body.classList.add('add-note-uploading');
  return overlay;
}

function hideUploadingOverlay() {
  document.querySelectorAll('.add-note-upload-overlay').forEach((el) => el.remove());
  document.body.classList.remove('add-note-uploading');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function datalistHtml(id, values) {
  return `<datalist id="${escapeHtml(id)}">${values
    .map((v) => `<option value="${escapeHtml(v)}"></option>`)
    .join('')}</datalist>`;
}

function coverPreviewHtml(kind, existingUrl) {
  if (existingUrl) {
    return `<img src="${escapeHtml(existingUrl)}" alt="" />`;
  }
  const label = kind === 'back' ? '뒷면 미리보기' : '앞면 미리보기';
  return `<span class="add-note-preview-placeholder">${label}</span>`;
}

/**
 * @param {object} note
 */
function noteToFormSeed(note) {
  const periodEnd = note?.periodEnd || '';
  return {
    id: note?.id || '',
    name: note?.title || '',
    notebookType: note?.type || '',
    periodName: note?.periodName || '',
    color: note?.color || '',
    size: note?.size || '',
    periodStart: note?.periodStart || '',
    periodEnd,
    stillInUse: !periodEnd,
    notes: note?.description || '',
    isKept: note?.isKept !== false,
    visible: note?.visible !== false,
    coverFrontUrl: note?.coverFrontUrl || '',
    coverBackUrl: note?.coverBackUrl || ''
  };
}

/**
 * @param {{ onCreated?: (result?: { id?: string }) => void }} [options]
 */
export function mountAddNoteFab(options = {}) {
  if (document.querySelector('.add-note-fab')) return;

  document.body.insertAdjacentHTML(
    'beforeend',
    renderButton({
      shape: 'circle',
      size: 'l',
      role: 'fab',
      ariaLabel: '새 노트 추가',
      content: PLUS_ICON,
      className: 'add-note-fab'
    })
  );

  document.querySelector('.add-note-fab')?.addEventListener('click', () => {
    void openAddNoteModal({ onCreated: options.onCreated });
  });
}

/**
 * @param {{
 *   onCreated?: (result?: { id?: string }) => void,
 *   onUpdated?: (result?: { id?: string }) => void,
 *   mode?: 'create' | 'edit',
 *   note?: object
 * }} [options]
 */
export async function openAddNoteModal(options = {}) {
  if (document.querySelector('.add-note-dialog')) return;
  if (!(await requireAuth())) return;

  const isEdit = options.mode === 'edit' && Boolean(options.note?.id);
  const seed = isEdit ? noteToFormSeed(options.note) : null;

  const typeOptionsList = FALLBACK_TYPES;
  const periodOptionsList = FALLBACK_PERIODS;
  const colorOptions = FALLBACK_COLORS;
  const sizeOptions = FALLBACK_SIZES;

  const initialType = seed?.notebookType || '';
  const initialPeriod = seed?.periodName || '';
  const initialColor = seed?.color || '';
  const initialSize = seed?.size || '';
  const initialFrontUrl = seed?.coverFrontUrl || '';
  const initialBackUrl = seed?.coverBackUrl || '';

  const coverFieldHtml = (kind, required) => {
    const label = kind === 'back' ? '표지 뒷면' : '표지 앞면';
    const existingUrl = kind === 'back' ? initialBackUrl : initialFrontUrl;
    const inputName = kind === 'back' ? 'coverBack' : 'coverFront';
    const picker = isEdit
      ? `<span class="upload-pick__status">수정 시 표지는 변경되지 않습니다</span>`
      : renderFilePicker({
          name: inputName,
          accept: 'image/*',
          pickLabel: '파일 선택'
        });
    return renderField({
      type: 'custom',
      label,
      required: required && !isEdit,
      className: 'add-note-cover-field',
      hint: isEdit ? '' : `${Math.floor(MAX_COVER_BYTES / (1024 * 1024))}MB 이하 이미지`,
      children: `
        ${picker}
        <div class="add-note-preview" data-preview="${kind}" aria-hidden="true">
          ${coverPreviewHtml(kind, isEdit ? existingUrl : '')}
        </div>`
    });
  };

  const formHtml = `
      <form class="form add-note-form" novalidate>
        ${renderField({
          label: '이름',
          name: 'name',
          required: true,
          placeholder: '예: 2026_업무노트',
          value: seed?.name || ''
        })}

        <div class="add-note-covers${isEdit ? ' add-note-covers--readonly' : ''}"${
          isEdit ? ' aria-label="표지 (수정 불가)"' : ''
        }>
          ${coverFieldHtml('front', true)}
          ${coverFieldHtml('back', true)}
        </div>

        <div class="form-row form-row--2">
          ${renderField({
            type: 'select',
            label: '노트 종류',
            name: 'notebookType',
            required: true,
            placeholder: '선택',
            options: typeOptionsList,
            value: initialType
          })}
          ${renderField({
            type: 'select',
            label: '시기',
            name: 'periodName',
            placeholder: '선택 (선택사항)',
            options: periodOptionsList,
            value: initialPeriod
          })}
        </div>

        ${renderField({
          type: 'colorRadioGroup',
          label: '색상',
          name: 'color',
          value: initialColor,
          colors: colorOptions,
          colorMap: COLOR_CHIP_HEX,
          lightNames: LIGHT_COLOR_NAMES
        })}

        ${renderField({
          label: '크기',
          name: 'size',
          placeholder: '예: A5 또는 직접 입력',
          value: initialSize,
          list: 'add-note-size-list',
          extra: datalistHtml('add-note-size-list', sizeOptions)
        })}

        <div class="form-row form-row--2">
          ${renderField({
            type: 'date',
            label: '사용 시작일',
            name: 'periodStart',
            required: true,
            value: seed?.periodStart || ''
          })}
          ${renderField({
            type: 'custom',
            label: '사용 종료일',
            children: `
              <input class="field__input" type="date" name="periodEnd" value="${escapeHtml(
                seed?.periodEnd || ''
              )}" autocomplete="off" />
              <label class="form-check form-check--inline">
                <input type="checkbox" name="stillInUse" ${seed?.stillInUse ? 'checked' : ''} />
                <span>아직 사용 중</span>
              </label>`
          })}
        </div>

        ${renderField({
          type: 'textarea',
          label: '메모',
          name: 'notes',
          rows: 4,
          placeholder: NOTES_PLACEHOLDER,
          value: seed?.notes || ''
        })}

        <label class="form-check">
          <input type="checkbox" name="isKept" ${!seed || seed.isKept ? 'checked' : ''} />
          <span>아직 가지고 있어요. 아직 폐기하지 않고 가지고 있어요.</span>
        </label>

        <label class="form-check">
          <input type="checkbox" name="visible" ${!seed || seed.visible ? 'checked' : ''} />
          <span>사이트에 공개 (체크 해제 시 노트가 목록에서 숨겨집니다)</span>
        </label>

        <p class="form-status add-note-status" hidden></p>

        ${renderButton({
          shape: 'solid',
          type: 'submit',
          content: isEdit ? '노트 수정하기' : '+ 노트 만들기',
          className: 'add-note-submit'
        })}
      </form>
  `;

  const dialog = openDialog({
    title: isEdit ? '노트 정보 수정' : '새 노트 추가',
    titleId: 'add-note-title',
    className: 'add-note-dialog',
    bodyHtml: formHtml
  });
  const overlay = dialog.overlay;

  const form = overlay.querySelector('.add-note-form');
  const statusEl = overlay.querySelector('.add-note-status');
  const submitBtn = overlay.querySelector('.add-note-submit');
  const typeSelect = form?.querySelector('select[name="notebookType"]');
  const periodSelect = form?.querySelector('select[name="periodName"]');
  const colorChips = form?.querySelector('.field__swatches');
  const sizeInput = form?.querySelector('input[name="size"]');
  const sizeList = form?.querySelector('#add-note-size-list');
  const periodEndInput = form?.querySelector('input[name="periodEnd"]');
  const stillInUseInput = form?.querySelector('input[name="stillInUse"]');

  const syncStillInUse = () => {
    if (!periodEndInput || !stillInUseInput) return;
    if (stillInUseInput.checked) {
      periodEndInput.value = '';
      periodEndInput.disabled = true;
    } else {
      periodEndInput.disabled = false;
    }
  };
  stillInUseInput?.addEventListener('change', syncStillInUse);
  syncStillInUse();

  /* Notion DB select 옵션으로 드롭다운·칩 갱신 */
  fetchNoteFormMeta()
    .then((meta) => {
      if (meta?.options?.notebook_type?.length && typeSelect) {
        const prev = typeSelect.value || initialType;
        typeSelect.innerHTML = renderSelectOptions(meta.options.notebook_type, {
          placeholder: '선택',
          selected: prev
        });
      }
      if (meta?.options?.period_name?.length && periodSelect) {
        const prev = periodSelect.value || initialPeriod;
        periodSelect.innerHTML = renderSelectOptions(meta.options.period_name, {
          placeholder: '선택 (선택사항)',
          selected: prev
        });
      }
      if (meta?.options?.color?.length && colorChips) {
        const prev = form.querySelector('input[name="color"]:checked')?.value || initialColor;
        colorChips.innerHTML = renderColorSwatches(meta.options.color, {
          selected: prev,
          name: 'color',
          colorMap: COLOR_CHIP_HEX,
          lightNames: LIGHT_COLOR_NAMES
        });
      }
      if (meta?.options?.size?.length && sizeList) {
        sizeList.innerHTML = meta.options.size
          .map((v) => `<option value="${escapeHtml(v)}"></option>`)
          .join('');
        if (sizeInput && !sizeInput.value) {
          sizeInput.placeholder = '목록에서 고르거나 직접 입력';
        }
      }
    })
    .catch((err) => {
      console.warn('[AddNote] form meta fallback:', err);
    });

  const setStatus = (message, isError = false) => {
    if (!statusEl) return;
    if (!message) {
      statusEl.hidden = true;
      statusEl.textContent = '';
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.classList.toggle('form-status--error', isError);
  };

  const closeModal = dialog.close;

  /* 파일 선택 → 미리보기 (생성 모드만) */
  if (!isEdit) {
    overlay.querySelectorAll('input[type="file"]').forEach((input) => {
      input.addEventListener('change', () => {
        const field = input.closest('.add-note-cover-field');
        const nameEl = field?.querySelector('.upload-pick__status');
        const preview = field?.querySelector('.add-note-preview');
        const kind = preview?.dataset.preview === 'back' ? 'back' : 'front';
        const file = input.files?.[0];
        if (!file) {
          if (nameEl) nameEl.textContent = '선택된 파일 없음';
          if (preview) preview.innerHTML = coverPreviewHtml(kind, '');
          return;
        }
        const validated = validateCoverImageFile(file);
        if (!validated.ok) {
          input.value = '';
          if (nameEl) nameEl.textContent = '선택된 파일 없음';
          if (preview) preview.innerHTML = coverPreviewHtml(kind, '');
          setStatus(validated.message, true);
          showToast(validated.message);
          return;
        }
        if (nameEl) nameEl.textContent = file.name;
        const url = URL.createObjectURL(file);
        if (preview) {
          preview.innerHTML = `<img src="${url}" alt="" />`;
        }
      });
    });
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form || !submitBtn) return;

    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const notebookType = String(fd.get('notebookType') || '').trim();
    const periodName = String(fd.get('periodName') || '').trim();
    const color = String(fd.get('color') || '').trim();
    const size = String(fd.get('size') || '').trim();
    const periodStart = String(fd.get('periodStart') || '').trim();
    const stillInUse = Boolean(fd.get('stillInUse'));
    const periodEnd = stillInUse ? '' : String(fd.get('periodEnd') || '').trim();
    const notes = String(fd.get('notes') || '').trim();
    const isKept = Boolean(fd.get('isKept'));
    const visible = Boolean(fd.get('visible'));
    const frontFile = form.querySelector('input[name="coverFront"]')?.files?.[0] || null;
    const backFile = form.querySelector('input[name="coverBack"]')?.files?.[0] || null;

    if (!name || !notebookType) {
      setStatus('이름과 노트 종류는 필수입니다.', true);
      return;
    }
    if (!periodStart) {
      setStatus('사용 시작일은 필수입니다.', true);
      return;
    }
    if (!isEdit && (!frontFile || !backFile)) {
      setStatus('이름, 앞·뒤 표지, 노트 종류는 필수입니다.', true);
      return;
    }

    submitBtn.disabled = true;

    const metaPayload = {
      id: seed?.id || '',
      name,
      notebookType,
      periodName: periodName || undefined,
      color: color || undefined,
      size: size || undefined,
      periodStart,
      periodEnd: periodEnd || undefined,
      notes: notes || undefined,
      isKept,
      visible
    };
    closeModal();

    /* 수정: 표지/이미지는 건드리지 않고 메타데이터만 PATCH (+ 이름 변경 시 Content 폴더 동기화) */
    if (isEdit) {
      showUploadingOverlay('노트를 수정하는 중…');
      try {
        const oldName = String(seed?.name || '').trim();
        const nameChanged = Boolean(oldName) && oldName !== name;
        let renamedFolderUrl = '';

        if (nameChanged) {
          showUploadingOverlay('노트명·표지·페이지 폴더를 동기화하는 중…');
          const renamed = await renameNoteContentFolder({
            noteId: metaPayload.id,
            oldNoteName: oldName,
            newNoteName: name,
            pdfFolderUrl: options.note?.pdfFolderUrl || '',
            pageCount: options.note?.pageCount,
            coverFrontUrl: options.note?.coverFrontUrl || seed?.coverFrontUrl || '',
            coverBackUrl: options.note?.coverBackUrl || seed?.coverBackUrl || ''
          });
          renamedFolderUrl = renamed?.pdfFolderUrl || '';
        }

        const result = await updateNotionNote(metaPayload);
        if (result?.id) markNoteUnseen(result.id);
        else if (metaPayload.id) markNoteUnseen(metaPayload.id);
        clearNotionNotebooksCache();
        clearNotionTypeItemsCache();
        hideUploadingOverlay();
        showToast(
          nameChanged
            ? '노트명과 표지·페이지 파일명이 함께 수정되었습니다'
            : '노트가 수정되었습니다'
        );
        options.onUpdated?.({
          ...result,
          pdfFolderUrl: renamedFolderUrl || options.note?.pdfFolderUrl
        });
      } catch (err) {
        console.error('[EditNote]', err);
        hideUploadingOverlay();
        showToast(err?.message || '노트 수정에 실패했습니다.');
      }
      return;
    }

    showUploadingOverlay('표지를 업로드하는 중…');

    try {
      const [frontDataUrl, backDataUrlRaw] = await Promise.all([
        readFileAsDataUrl(frontFile),
        readFileAsDataUrl(backFile)
      ]);

      const frontSize = await getImageSizeFromDataUrl(frontDataUrl);
      const backDataUrl = await cropImageDataUrlToSize(
        backDataUrlRaw,
        frontSize.width,
        frontSize.height
      );

      const [frontUpload, backUpload] = await Promise.all([
        uploadCoverImage({
          file: frontDataUrl,
          filename: metaPayload.name,
          kind: 'front',
          noteName: metaPayload.name
        }),
        uploadCoverImage({
          file: backDataUrl,
          filename: metaPayload.name,
          kind: 'back',
          noteName: metaPayload.name
        })
      ]);

      const created = await createNotionNote({
        name: metaPayload.name,
        coverFrontUrl: frontUpload.url,
        coverBackUrl: backUpload.url,
        notebookType: metaPayload.notebookType,
        periodName: metaPayload.periodName,
        color: metaPayload.color,
        size: metaPayload.size,
        periodStart: metaPayload.periodStart,
        periodEnd: metaPayload.periodEnd,
        notes: metaPayload.notes,
        isKept: metaPayload.isKept,
        visible: metaPayload.visible
      });

      if (created?.id) markNoteUnseen(created.id);

      clearNotionNotebooksCache();
      clearNotionTypeItemsCache();
      hideUploadingOverlay();
      showToast('노트가 추가되었습니다');
      options.onCreated?.(created);

      const createdNote = {
        id: created?.id || '',
        title: metaPayload.name,
        name: metaPayload.name,
        pdfFolderUrl: '',
        pageCount: 0
      };
      if (createdNote.id) {
        openAddPagesConfirmDialog({
          note: createdNote,
          onConfirm: () => {
            openAddPageModal({
              note: createdNote,
              onDone: () => options.onCreated?.(created)
            });
          }
        });
      }
    } catch (err) {
      console.error('[AddNote]', err);
      hideUploadingOverlay();
      showToast(err?.message || '노트 추가에 실패했습니다.');
    }
  });

  form?.querySelector('input[name="name"]')?.focus();
}
