/**
 * 우측 하단 FAB(+) → 새 노트 추가 / 노트 정보 수정 모달
 *
 * 흐름:
 * 1) 폼 작성 (이름·앞뒤표지·타입·사용 시작일 필수, is_kept/visible 기본 true)
 * 2) 뒷표지를 앞표지 크기에 맞춰 크롭 → Cloudinary 업로드 (Front/Back 폴더, 파일명=노트명)
 * 3) Notion DB에 페이지 생성 또는 기존 페이지 PATCH
 */

import { render as renderButton } from '../Button/Button.js';
import { showToast } from '../Toast/Toast.js';
import { typeOptions } from '../../services/typeOptions.js';
import { periodOptions } from '../../services/periodOptions.js';
import {
  createNotionNote,
  cropImageDataUrlToSize,
  fetchNoteFormMeta,
  getImageSizeFromDataUrl,
  readFileAsDataUrl,
  updateNotionNote,
  uploadCoverImage
} from '../../services/createNote.js';
import { renameNoteContentFolder } from '../../services/pages.js';
import { clearNotionNotebooksCache } from '../../services/notionNotebooks.js';
import { clearNotionTypeItemsCache } from '../../services/notionByType.js';
import { markNoteUnseen } from '../../utils/unseenNotes.js';
import {
  openAddPageModal,
  openAddPagesConfirmDialog
} from '../AddPageModal/AddPageModal.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import uploadingLottieUrl from '../../uploading.json?url';
import './AddNoteFab.css';

const CLOSE_ICON =
  "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><path fill='currentColor' d='M15.889 6.697a1.001 1.001 0 0 1 1.415 1.414L13.414 12l3.89 3.89a1 1 0 0 1-1.414 1.414L12 13.414l-3.889 3.89a1 1 0 1 1-1.414-1.414L10.586 12 6.697 8.11a1 1 0 0 1 1.414-1.414L12 10.586z'/></svg>";

const PLUS_ICON = MINGCUTE.addFill;

const FALLBACK_TYPES = typeOptions.map((t) => t.labelKr);
const FALLBACK_PERIODS = periodOptions.map((p) => p.label);
const FALLBACK_COLORS = ['파랑', '빨강', '검정', '초록', '노랑', '보라', '회색', '갈색', '분홍', '흰색'];
const FALLBACK_SIZES = ['A4', 'A5', 'A6', 'B5', 'B6', '16절', '8절', '4절'];

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

function optionHtml(values, placeholder, selected = '') {
  const list = [...values];
  if (selected && !list.includes(selected)) list.push(selected);
  const opts = [`<option value="">${escapeHtml(placeholder)}</option>`];
  for (const v of list) {
    const sel = v === selected ? ' selected' : '';
    opts.push(`<option value="${escapeHtml(v)}"${sel}>${escapeHtml(v)}</option>`);
  }
  return opts.join('');
}

function datalistHtml(id, values) {
  return `<datalist id="${escapeHtml(id)}">${values
    .map((v) => `<option value="${escapeHtml(v)}"></option>`)
    .join('')}</datalist>`;
}

function colorHexFor(name) {
  if (COLOR_CHIP_HEX[name]) return COLOR_CHIP_HEX[name];
  let hash = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue} 42% 52%)`;
}

function colorChipsHtml(colors, selected = '') {
  const list = [...colors];
  if (selected && !list.includes(selected)) list.push(selected);
  return list
    .map((name) => {
      const hex = colorHexFor(name);
      const checked = name === selected ? 'checked' : '';
      const isLight = name === '흰색' || name === '노랑';
      return `
        <label class="add-note-color-chip${isLight ? ' add-note-color-chip--light' : ''}" title="${escapeHtml(name)}">
          <input type="radio" name="color" value="${escapeHtml(name)}" ${checked} />
          <span class="add-note-color-swatch" style="--chip-color:${escapeHtml(hex)}"></span>
          <span class="add-note-color-name">${escapeHtml(name)}</span>
        </label>`;
    })
    .join('');
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
    coverFrontUrl: note?.coverFrontUrl || '',
    coverBackUrl: note?.coverBackUrl || ''
  };
}

/**
 * @param {{ onCreated?: (result?: { id?: string }) => void }} [options]
 */
export function mountAddNoteFab(options = {}) {
  if (document.querySelector('.add-note-fab')) return;

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'add-note-fab';
  fab.setAttribute('aria-label', '새 노트 추가');
  fab.innerHTML = PLUS_ICON;
  fab.addEventListener('click', () => openAddNoteModal({ onCreated: options.onCreated }));
  document.body.appendChild(fab);
}

/**
 * @param {{
 *   onCreated?: (result?: { id?: string }) => void,
 *   onUpdated?: (result?: { id?: string }) => void,
 *   mode?: 'create' | 'edit',
 *   note?: object
 * }} [options]
 */
export function openAddNoteModal(options = {}) {
  if (document.querySelector('.add-note-overlay')) return;

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

  const overlay = document.createElement('div');
  overlay.className = 'add-note-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'add-note-title');

  overlay.innerHTML = `
    ${renderButton({
      variant: 'icon',
      ariaLabel: '닫기',
      content: CLOSE_ICON,
      className: 'add-note-close'
    })}
    <div class="add-note-panel">
      <header class="add-note-header">
        <h2 id="add-note-title" class="add-note-title">${isEdit ? '노트 정보 수정' : '새 노트 추가'}</h2>
      </header>
      <form class="add-note-form" novalidate>
        <label class="add-note-field">
          <span class="add-note-label">이름 <em class="add-note-req">*</em></span>
          <input class="add-note-input" name="name" type="text" required placeholder="예: 2026_업무노트" autocomplete="off" value="${escapeHtml(seed?.name || '')}" />
        </label>

        ${
          isEdit
            ? `<div class="add-note-covers add-note-covers--readonly" aria-label="표지 (수정 불가)">
          <div class="add-note-cover-field" data-kind="front">
            <span class="add-note-label">표지 앞면</span>
            <span class="add-note-file-name">수정 시 표지는 변경되지 않습니다</span>
            <div class="add-note-preview" data-preview="front" aria-hidden="true">
              ${coverPreviewHtml('front', initialFrontUrl)}
            </div>
          </div>
          <div class="add-note-cover-field" data-kind="back">
            <span class="add-note-label">표지 뒷면</span>
            <span class="add-note-file-name">수정 시 표지는 변경되지 않습니다</span>
            <div class="add-note-preview" data-preview="back" aria-hidden="true">
              ${coverPreviewHtml('back', initialBackUrl)}
            </div>
          </div>
        </div>`
            : `<div class="add-note-covers">
          <div class="add-note-cover-field" data-kind="front">
            <span class="add-note-label">표지 앞면 <em class="add-note-req">*</em></span>
            <label class="add-note-file-btn">
              <span>파일 선택</span>
              <input type="file" name="coverFront" accept="image/*" required hidden />
            </label>
            <span class="add-note-file-name">선택된 파일 없음</span>
            <div class="add-note-preview" data-preview="front" aria-hidden="true">
              ${coverPreviewHtml('front', '')}
            </div>
          </div>
          <div class="add-note-cover-field" data-kind="back">
            <span class="add-note-label">표지 뒷면 <em class="add-note-req">*</em></span>
            <label class="add-note-file-btn">
              <span>파일 선택</span>
              <input type="file" name="coverBack" accept="image/*" required hidden />
            </label>
            <span class="add-note-file-name">선택된 파일 없음</span>
            <div class="add-note-preview" data-preview="back" aria-hidden="true">
              ${coverPreviewHtml('back', '')}
            </div>
          </div>
        </div>`
        }

        <div class="add-note-row add-note-row--2">
          <label class="add-note-field">
            <span class="add-note-label">노트 종류 <em class="add-note-req">*</em></span>
            <select class="add-note-select" name="notebookType" required>
              ${optionHtml(typeOptionsList, '선택', initialType)}
            </select>
          </label>
          <label class="add-note-field">
            <span class="add-note-label">시기</span>
            <select class="add-note-select" name="periodName">
              ${optionHtml(periodOptionsList, '선택 (선택사항)', initialPeriod)}
            </select>
          </label>
        </div>

        <fieldset class="add-note-field add-note-color-field">
          <legend class="add-note-label">색상</legend>
          <div class="add-note-color-chips" role="radiogroup" aria-label="색상">
            ${colorChipsHtml(colorOptions, initialColor)}
          </div>
        </fieldset>

        <label class="add-note-field">
          <span class="add-note-label">크기</span>
          <input
            class="add-note-input"
            name="size"
            type="text"
            list="add-note-size-list"
            placeholder="예: A5 또는 직접 입력"
            autocomplete="off"
            value="${escapeHtml(initialSize)}"
          />
          ${datalistHtml('add-note-size-list', sizeOptions)}
        </label>

        <div class="add-note-row add-note-row--2">
          <label class="add-note-field">
            <span class="add-note-label">사용 시작일 <em class="add-note-req">*</em></span>
            <input class="add-note-input" name="periodStart" type="date" required value="${escapeHtml(seed?.periodStart || '')}" />
          </label>
          <div class="add-note-field">
            <span class="add-note-label">사용 종료일</span>
            <input class="add-note-input" name="periodEnd" type="date" value="${escapeHtml(seed?.periodEnd || '')}" />
            <label class="add-note-check add-note-check--inline">
              <input type="checkbox" name="stillInUse" ${seed?.stillInUse ? 'checked' : ''} />
              <span>아직 사용 중</span>
            </label>
          </div>
        </div>

        <label class="add-note-field">
          <span class="add-note-label">메모</span>
          <textarea class="add-note-textarea" name="notes" rows="4" placeholder="${escapeHtml(NOTES_PLACEHOLDER)}">${escapeHtml(seed?.notes || '')}</textarea>
        </label>

        <label class="add-note-check">
          <input type="checkbox" name="isKept" ${!seed || seed.isKept ? 'checked' : ''} />
          <span>아직 가지고 있어요. 아직 폐기하지 않고 가지고 있어요.</span>
        </label>

        <p class="add-note-status" hidden></p>

        <button type="submit" class="add-note-submit">${isEdit ? '노트 수정하기' : '+ 노트 만들기'}</button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.classList.add('add-note-open');

  const form = overlay.querySelector('.add-note-form');
  const statusEl = overlay.querySelector('.add-note-status');
  const submitBtn = overlay.querySelector('.add-note-submit');
  const typeSelect = form?.querySelector('select[name="notebookType"]');
  const periodSelect = form?.querySelector('select[name="periodName"]');
  const colorChips = form?.querySelector('.add-note-color-chips');
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
        typeSelect.innerHTML = optionHtml(meta.options.notebook_type, '선택', prev);
      }
      if (meta?.options?.period_name?.length && periodSelect) {
        const prev = periodSelect.value || initialPeriod;
        periodSelect.innerHTML = optionHtml(meta.options.period_name, '선택 (선택사항)', prev);
      }
      if (meta?.options?.color?.length && colorChips) {
        const prev = form.querySelector('input[name="color"]:checked')?.value || initialColor;
        colorChips.innerHTML = colorChipsHtml(meta.options.color, prev);
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
    statusEl.classList.toggle('add-note-status--error', isError);
  };

  const closeModal = () => {
    overlay.remove();
    document.body.classList.remove('add-note-open');
    document.removeEventListener('keydown', handleEscape);
  };

  const handleEscape = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleEscape);

  overlay.querySelector('.add-note-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  /* 파일 선택 → 미리보기 (생성 모드만) */
  if (!isEdit) {
    overlay.querySelectorAll('input[type="file"]').forEach((input) => {
      input.addEventListener('change', () => {
        const field = input.closest('.add-note-cover-field');
        const nameEl = field?.querySelector('.add-note-file-name');
        const preview = field?.querySelector('.add-note-preview');
        const file = input.files?.[0];
        if (!file) {
          const kind = field?.dataset.kind === 'back' ? 'back' : 'front';
          if (nameEl) nameEl.textContent = '선택된 파일 없음';
          if (preview) preview.innerHTML = coverPreviewHtml(kind, '');
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
      visible: true
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
        visible: true
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
