/**
 * 새 노트 추가 / 노트 정보 수정 모달
 *
 * 폼 스텝:
 * 1) 이름·앞뒤표지·크기·색상 (이름·표지 필수)
 * 2) 종류·시기·사용 시작/종료일·보유/공개 체크 (종류·시작일 필수)
 *    시작일은 종료일보다 앞. 시작일이 오늘이면 종료일 비우고 아직 사용 중.
 * 3) 메모
 *
 * 제출 후:
 * - 생성: public_id 배정 → 표지를 notebooks/{public_id}에 업로드 → Notion에 public_id와 함께 생성
 * - 수정: Notion 페이지 PATCH (표지는 변경하지 않음)
 */

import { render as renderButton } from '../Button/Button.js';
import { open as openDialog } from '../Dialog/Dialog.js';
import {
  openUploadResultDialog,
  shortUploadError
} from '../Dialog/uploadResultDialog.js';
import { render as renderField, renderColorSwatches, setStatus as setFormStatus } from '../FormField/FormField.js';
import { renderOptions as renderSelectOptions } from '../Select/Select.js';
import { renderPicker as renderFilePicker } from '../FileUploadPreview/FileUploadPreview.js';
import { showToast } from '../Toast/Toast.js';
import { typeOptions } from '../../data/typeOptions.js';
import { periodOptions } from '../../data/periodOptions.js';
import {
  allocateNotePublicId,
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
import { markNoteUnseen } from '../../utils/unseenNotes.js';
import { clearNotesCaches } from '../../utils/notesCatalog.js';
import { escapeHtml } from '../../utils/html.js';
import {
  openAddPageModal,
  openAddPagesConfirmDialog
} from '../AddPageModal/AddPageModal.js';
import { requireAuth } from '../../services/auth.js';
import { NOTE_COLOR_PAINT, LIGHT_NOTE_COLORS, NOTE_COLOR_NAMES } from '../../utils/noteColorMap.js';
import { jukeboxPathForNote, requestJukeboxFocus } from '../../utils/jukeboxFocus.js';
import { hideUploadingOverlay, showUploadingOverlay } from './uploadOverlay.js';
import './AddNoteFab.css';

const FALLBACK_TYPES = typeOptions.map((t) => t.labelKr);
const FALLBACK_PERIODS = periodOptions.map((p) => p.label);
const FALLBACK_COLORS = NOTE_COLOR_NAMES;
const FALLBACK_SIZES = ['A4', 'A5', 'A6', 'B5', 'B6', '16절', '8절', '4절'];

/* 노트 표지 색상 이름 → 스와치 색. 실제 노트 색을 흉내내는 값이라 테마 토큰이 아니다 */
const COLOR_CHIP_HEX = NOTE_COLOR_PAINT;

/** 스와치가 배경에 묻히는 밝은 색 (테두리 보정) */
const LIGHT_COLOR_NAMES = [...LIGHT_NOTE_COLORS];

const NOTES_PLACEHOLDER = '이 노트는 무슨 용도로 사용하고 있나요?';
/** 노션 description 속성 · 정보 패널과 동일 (공백 포함) */
const NOTES_MAX_CHARS = 70;
const FORM_STEPS = 3;

/** 로컬 달력 기준 YYYY-MM-DD (UTC toISOString은 자정 전후가 어긋남) */
function localIsoDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** @param {string} iso @param {number} days */
function addDaysIso(iso, days) {
  const parts = String(iso || '').split('-').map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return '';
  const [y, m, d] = parts;
  return localIsoDate(new Date(y, m - 1, d + days));
}

function datalistHtml(id, values) {
  return `<datalist id="${escapeHtml(id)}">${values
    .map((v) => `<option value="${escapeHtml(v)}"></option>`)
    .join('')}</datalist>`;
}

function openViewCreatedNoteDialog(options = {}) {
  if (document.querySelector('.add-note-view-dialog')) {
    options.onCancel?.();
    return;
  }

  let confirmed = false;
  const dialog = openDialog({
    title: '추가한 노트를 확인하시겠습니까?',
    titleId: 'add-note-view-title',
    className: 'add-note-view-dialog',
    panelClassName: 'dialog__panel--narrow',
    showClose: false,
    bodyHtml: `
      <div class="dialog-actions">
        ${renderButton({
          shape: 'text',
          block: true,
          content: '취소',
          className: 'add-note-view-cancel',
          dataset: { choice: 'cancel' }
        })}
        ${renderButton({
          shape: 'solid',
          content: '확인',
          className: 'add-note-view-ok',
          dataset: { choice: 'confirm' }
        })}
      </div>`,
    onClose: () => {
      if (confirmed) options.onConfirm?.();
      else options.onCancel?.();
    }
  });

  dialog.overlay.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('[data-choice]');
    if (!btn) return;
    confirmed = btn.getAttribute('data-choice') === 'confirm';
    dialog.close();
  });
}

async function goToCreatedNoteInJukebox(created, meta) {
  const id = created?.id || '';
  if (!id) return;
  requestJukeboxFocus(id);
  const dest = jukeboxPathForNote({
    periodName: meta?.periodName,
    type: meta?.notebookType,
    notebookType: meta?.notebookType
  });
  const { router } = await import('../../router.js');
  const current = router.getActualPath(window.location.pathname);
  if (current === dest) router.handleRoute();
  else router.navigate(dest);
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
    notes: String(note?.description || '').slice(0, NOTES_MAX_CHARS),
    isKept: note?.isKept !== false,
    visible: note?.visible !== false,
    coverFrontUrl: note?.coverFrontUrl || '',
    coverBackUrl: note?.coverBackUrl || ''
  };
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
        <ol class="add-note-progress" aria-label="노트 작성 단계">
          <li data-progress="1" class="is-current" aria-current="step">
            <span class="add-note-progress__index">1</span>표지
          </li>
          <li data-progress="2">
            <span class="add-note-progress__index">2</span>사용
          </li>
          <li data-progress="3">
            <span class="add-note-progress__index">3</span>메모
          </li>
        </ol>

        <div class="add-note-steps">
        <div class="add-note-step is-active" data-step="1">
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

          ${renderField({
            label: '크기',
            name: 'size',
            placeholder: '예: A5 또는 직접 입력',
            value: initialSize,
            list: 'add-note-size-list',
            extra: datalistHtml('add-note-size-list', sizeOptions)
          })}

          ${renderField({
            type: 'colorRadioGroup',
            label: '색상',
            name: 'color',
            value: initialColor,
            colors: colorOptions,
            colorMap: COLOR_CHIP_HEX,
            lightNames: LIGHT_COLOR_NAMES
          })}
        </div>

        <div class="add-note-step" data-step="2" inert aria-hidden="true">
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

          <label class="form-check">
            <input type="checkbox" name="isKept" ${!seed || seed.isKept ? 'checked' : ''} />
            <span>아직 가지고 있어요. 아직 폐기하지 않고 가지고 있어요.</span>
          </label>

          <label class="form-check">
            <input type="checkbox" name="visible" ${!seed || seed.visible ? 'checked' : ''} />
            <span>사이트에 공개 (체크 해제 시 노트가 목록에서 숨겨집니다)</span>
          </label>
        </div>

        <div class="add-note-step" data-step="3" inert aria-hidden="true">
          ${renderField({
            type: 'textarea',
            label: '메모',
            name: 'notes',
            rows: 4,
            maxLength: NOTES_MAX_CHARS,
            placeholder: NOTES_PLACEHOLDER,
            value: (seed?.notes || '').slice(0, NOTES_MAX_CHARS),
            extra: `<span class="add-note-notes-count" data-notes-count>0/${NOTES_MAX_CHARS}</span>`
          })}
        </div>
        </div>

        <p class="form-status add-note-status" hidden></p>

        <div class="add-note-nav is-step-1">
          ${renderButton({
            shape: 'text',
            block: true,
            content: '이전',
            className: 'add-note-back',
            dataset: { action: 'back' }
          })}
          ${renderButton({
            shape: 'solid',
            type: 'button',
            content: '다음',
            className: 'add-note-next',
            dataset: { action: 'next' },
            disabled: true
          })}
          ${renderButton({
            shape: 'solid',
            type: 'submit',
            content: isEdit ? '노트 수정하기' : '새 노트 올리기',
            className: 'add-note-submit'
          })}
        </div>
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
  const nextBtn = overlay.querySelector('.add-note-next');
  const backBtn = overlay.querySelector('.add-note-back');
  const navEl = overlay.querySelector('.add-note-nav');
  const typeSelect = form?.querySelector('select[name="notebookType"]');
  const periodSelect = form?.querySelector('select[name="periodName"]');
  const colorChips = form?.querySelector('.field__swatches');
  const sizeInput = form?.querySelector('input[name="size"]');
  const sizeList = form?.querySelector('#add-note-size-list');
  const periodStartInput = form?.querySelector('input[name="periodStart"]');
  const periodEndInput = form?.querySelector('input[name="periodEnd"]');
  const stillInUseInput = form?.querySelector('input[name="stillInUse"]');

  let currentStep = 1;

  const setStatus = (message, isError = false) => {
    setFormStatus(statusEl, message, isError);
  };

  const focusStepField = (step) => {
    const target =
      step === 1
        ? form?.querySelector('input[name="name"]')
        : step === 2
          ? form?.querySelector('select[name="notebookType"]')
          : form?.querySelector('textarea[name="notes"]');
    target?.focus();
  };

  const setStep = (step, { clearStatus = true } = {}) => {
    currentStep = Math.min(FORM_STEPS, Math.max(1, step));
    form?.querySelectorAll('.add-note-step').forEach((el) => {
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
    navEl?.classList.remove('is-step-1', 'is-step-2', 'is-step-3');
    navEl?.classList.add(`is-step-${currentStep}`);
    if (clearStatus) setStatus('', false);
    syncNextEnabled();
    focusStepField(currentStep);
  };

  const isStepReady = (step) => {
    if (!form) return false;
    if (step === 1) {
      const name = String(form.querySelector('input[name="name"]')?.value || '').trim();
      if (!name) return false;
      if (!isEdit) {
        const frontFile = form.querySelector('input[name="coverFront"]')?.files?.[0] || null;
        const backFile = form.querySelector('input[name="coverBack"]')?.files?.[0] || null;
        if (!frontFile || !backFile) return false;
      }
      return true;
    }
    if (step === 2) {
      const notebookType = String(form.querySelector('select[name="notebookType"]')?.value || '').trim();
      const periodStart = String(form.querySelector('input[name="periodStart"]')?.value || '').trim();
      if (!notebookType || !periodStart) return false;
      const stillInUse = Boolean(stillInUseInput?.checked);
      const periodEnd = stillInUse ? '' : String(periodEndInput?.value || '').trim();
      if (periodEnd && periodEnd <= periodStart) return false;
      return true;
    }
    return true;
  };

  const syncNextEnabled = () => {
    if (nextBtn) nextBtn.disabled = !isStepReady(currentStep);
  };

  const validateStep = (step) => {
    if (!form) return false;
    const fd = new FormData(form);
    if (step === 1) {
      const name = String(fd.get('name') || '').trim();
      const frontFile = form.querySelector('input[name="coverFront"]')?.files?.[0] || null;
      const backFile = form.querySelector('input[name="coverBack"]')?.files?.[0] || null;
      if (!name) {
        setStatus('이름은 필수입니다.', true);
        return false;
      }
      if (!isEdit && (!frontFile || !backFile)) {
        setStatus('앞·뒤 표지를 모두 선택해 주세요.', true);
        return false;
      }
      return true;
    }
    if (step === 2) {
      const notebookType = String(fd.get('notebookType') || '').trim();
      const periodStart = String(fd.get('periodStart') || '').trim();
      const stillInUse = Boolean(fd.get('stillInUse'));
      const periodEnd = stillInUse ? '' : String(fd.get('periodEnd') || '').trim();
      if (!notebookType) {
        setStatus('노트 종류는 필수입니다.', true);
        return false;
      }
      if (!periodStart) {
        setStatus('사용 시작일은 필수입니다.', true);
        return false;
      }
      if (periodEnd && periodEnd <= periodStart) {
        setStatus('종료일은 시작일보다 뒤여야 합니다.', true);
        return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (!isStepReady(currentStep) || !validateStep(currentStep)) return;
    setStep(currentStep + 1);
  };

  const markStillInUseIfStartedToday = () => {
    if (!periodStartInput || !stillInUseInput || !periodEndInput) return;
    if (periodStartInput.value === localIsoDate()) {
      stillInUseInput.checked = true;
      periodEndInput.value = '';
    }
  };

  const syncUsageDates = () => {
    if (!periodStartInput || !periodEndInput || !stillInUseInput) return;
    const start = periodStartInput.value || '';
    const end = periodEndInput.value || '';
    const stillInUse = stillInUseInput.checked;

    if (stillInUse) {
      periodEndInput.value = '';
      periodEndInput.disabled = true;
      periodEndInput.removeAttribute('min');
      periodStartInput.removeAttribute('max');
      return;
    }

    periodEndInput.disabled = false;
    if (start) {
      const minEnd = addDaysIso(start, 1);
      if (minEnd) periodEndInput.min = minEnd;
      else periodEndInput.removeAttribute('min');
      if (end && minEnd && end < minEnd) periodEndInput.value = '';
    } else {
      periodEndInput.removeAttribute('min');
    }

    const nextEnd = periodEndInput.value || '';
    if (nextEnd) {
      const maxStart = addDaysIso(nextEnd, -1);
      if (maxStart) periodStartInput.max = maxStart;
      else periodStartInput.removeAttribute('max');
      if (start && maxStart && start > maxStart) periodStartInput.value = maxStart;
    } else {
      periodStartInput.removeAttribute('max');
    }
  };

  const onUsageDateChange = () => {
    markStillInUseIfStartedToday();
    syncUsageDates();
    syncNextEnabled();
  };

  periodStartInput?.addEventListener('change', onUsageDateChange);
  periodEndInput?.addEventListener('change', () => {
    syncUsageDates();
    syncNextEnabled();
  });
  stillInUseInput?.addEventListener('change', () => {
    syncUsageDates();
    syncNextEnabled();
  });
  markStillInUseIfStartedToday();
  syncUsageDates();

  const notesInput = form?.querySelector('textarea[name="notes"]');
  const notesCount = form?.querySelector('[data-notes-count]');
  const syncNotesCount = () => {
    if (!notesInput) return;
    if (notesInput.value.length > NOTES_MAX_CHARS) {
      notesInput.value = notesInput.value.slice(0, NOTES_MAX_CHARS);
    }
    if (notesCount) {
      notesCount.textContent = `${notesInput.value.length}/${NOTES_MAX_CHARS}`;
    }
  };
  notesInput?.addEventListener('input', syncNotesCount);
  syncNotesCount();

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
      syncNextEnabled();
    })
    .catch((err) => {
      console.warn('[AddNote] form meta fallback:', err);
    });

  form?.addEventListener('input', syncNextEnabled);
  form?.addEventListener('change', syncNextEnabled);
  syncNextEnabled();

  backBtn?.addEventListener('click', () => {
    setStep(currentStep - 1);
  });
  nextBtn?.addEventListener('click', () => {
    goNext();
  });

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

    if (currentStep < FORM_STEPS) {
      goNext();
      return;
    }

    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const notebookType = String(fd.get('notebookType') || '').trim();
    const periodName = String(fd.get('periodName') || '').trim();
    const color = String(fd.get('color') || '').trim();
    const size = String(fd.get('size') || '').trim();
    const periodStart = String(fd.get('periodStart') || '').trim();
    const stillInUse = Boolean(fd.get('stillInUse'));
    const periodEnd = stillInUse ? '' : String(fd.get('periodEnd') || '').trim();
    const notes = String(fd.get('notes') || '').trim().slice(0, NOTES_MAX_CHARS);
    const isKept = Boolean(fd.get('isKept'));
    const visible = Boolean(fd.get('visible'));
    const frontFile = form.querySelector('input[name="coverFront"]')?.files?.[0] || null;
    const backFile = form.querySelector('input[name="coverBack"]')?.files?.[0] || null;

    for (let step = 1; step <= 2; step += 1) {
      if (!validateStep(step)) {
        setStep(step, { clearStatus: false });
        return;
      }
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
      notes,
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
        clearNotesCaches();
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

    showUploadingOverlay('노트 ID를 배정하는 중…');

    let coversUploaded = false;
    let publicIdAssigned = false;
    try {
      const allocated = await allocateNotePublicId({
        name: metaPayload.name,
        notebookType: metaPayload.notebookType,
        periodStart: metaPayload.periodStart,
        periodEnd: metaPayload.periodEnd,
        notes: metaPayload.notes
      });
      const publicId = String(allocated?.publicId || '').trim();
      if (!publicId) throw new Error('public_id를 배정하지 못했습니다');
      publicIdAssigned = true;

      showUploadingOverlay('표지를 업로드하는 중…');
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
          noteName: metaPayload.name,
          publicId
        }),
        uploadCoverImage({
          file: backDataUrl,
          filename: metaPayload.name,
          kind: 'back',
          noteName: metaPayload.name,
          publicId
        })
      ]);
      coversUploaded = true;

      showUploadingOverlay('노트를 만드는 중…');
      const created = {
        ...(await createNotionNote({
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
          visible: metaPayload.visible,
          publicId
        })),
        publicId
      };

      if (created?.id) markNoteUnseen(created.id);

      clearNotesCaches();
      hideUploadingOverlay();
      options.onCreated?.(created);

      const createdNote = {
        id: created?.id || '',
        publicId: created?.publicId || publicId,
        title: metaPayload.name,
        name: metaPayload.name,
        pdfFolderUrl: '',
        pageCount: 0
      };
      if (createdNote.id) {
        const askToViewCreatedNote = () => {
          openViewCreatedNoteDialog({
            onConfirm: () => {
              void goToCreatedNoteInJukebox(created, metaPayload);
            }
          });
        };
        openAddPagesConfirmDialog({
          note: createdNote,
          onConfirm: () => {
            void openAddPageModal({
              note: createdNote,
              fromNewNote: true,
              onDone: (result) => {
                /* 페이지 업로드 결과(pdfFolderUrl·pageCount)를 넘기고 목록을 다시 불러온다 */
                options.onCreated?.({
                  ...created,
                  ...(result || {}),
                  id: created?.id || result?.id,
                  publicId: created?.publicId || publicId,
                  pdfFolderUrl: result?.pdfFolderUrl || '',
                  pageCount: result?.pageCount || 0
                });
              },
              onSettled: askToViewCreatedNote
            });
          },
          onCancel: askToViewCreatedNote
        });
      }
    } catch (err) {
      console.error('[AddNote]', err);
      hideUploadingOverlay();
      openUploadResultDialog({
        title: '노트 추가 실패',
        message: coversUploaded
          ? '표지 파일은 올렸지만 노트 정보를 만들지 못했습니다.'
          : publicIdAssigned
            ? '표지 업로드에 실패했습니다.'
            : '노트 ID(public_id) 배정에 실패했습니다.',
        detail: shortUploadError(err)
      });
    }
  });

  form?.querySelector('input[name="name"]')?.focus();
}
