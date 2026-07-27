/**
 * 우측 하단 FAB(+) → 새 노트 추가 모달
 *
 * 흐름:
 * 1) 폼 작성 (이름·앞뒤표지·타입·사용 시작일 필수, is_kept/visible 기본 true)
 * 2) 뒷표지를 앞표지 크기에 맞춰 크롭 → Cloudinary 업로드 (Front/Back 폴더, 파일명=노트명)
 * 3) "페이지 추가할까요?" 확인
 * 4) Notion DB에 새 페이지 생성
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
  uploadCoverImage
} from '../../services/createNote.js';
import { clearNotionNotebooksCache } from '../../services/notionNotebooks.js';
import { clearNotionTypeItemsCache } from '../../services/notionByType.js';
import { markNoteUnseen } from '../../utils/unseenNotes.js';
import './AddNoteFab.css';

const CLOSE_ICON =
  "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><path fill='currentColor' d='M15.889 6.697a1.001 1.001 0 0 1 1.415 1.414L13.414 12l3.89 3.89a1 1 0 0 1-1.414 1.414L12 13.414l-3.889 3.89a1 1 0 1 1-1.414-1.414L10.586 12 6.697 8.11a1 1 0 0 1 1.414-1.414L12 10.586z'/></svg>";

const PLUS_ICON =
  "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' aria-hidden='true'><path stroke='currentColor' stroke-width='2.2' stroke-linecap='round' d='M12 5v14M5 12h14'/></svg>";

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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function optionHtml(values, placeholder) {
  const opts = [`<option value="">${escapeHtml(placeholder)}</option>`];
  for (const v of values) {
    opts.push(`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`);
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
  /* 알 수 없는 이름 → 안정적 해시 색 */
  let hash = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  const hue = hash % 360;
  return `hsl(${hue} 42% 52%)`;
}

function colorChipsHtml(colors, selected = '') {
  return colors
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
 * @param {{ onCreated?: (result?: { id?: string }) => void }} [options]
 */
export function openAddNoteModal(options = {}) {
  if (document.querySelector('.add-note-overlay')) return;

  const typeOptionsList = FALLBACK_TYPES;
  const periodOptionsList = FALLBACK_PERIODS;
  const colorOptions = FALLBACK_COLORS;
  const sizeOptions = FALLBACK_SIZES;

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
        <h2 id="add-note-title" class="add-note-title">새 노트 추가</h2>
      </header>
      <form class="add-note-form" novalidate>
        <label class="add-note-field">
          <span class="add-note-label">이름 <em class="add-note-req">*</em></span>
          <input class="add-note-input" name="name" type="text" required placeholder="예: 2026_업무노트" autocomplete="off" />
        </label>

        <div class="add-note-covers">
          <div class="add-note-cover-field" data-kind="front">
            <span class="add-note-label">표지 앞면 <em class="add-note-req">*</em></span>
            <label class="add-note-file-btn">
              <span>파일 선택</span>
              <input type="file" name="coverFront" accept="image/*" required hidden />
            </label>
            <span class="add-note-file-name">선택된 파일 없음</span>
            <div class="add-note-preview" data-preview="front" aria-hidden="true">
              <span class="add-note-preview-placeholder">앞면 미리보기</span>
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
              <span class="add-note-preview-placeholder">뒷면 미리보기</span>
            </div>
          </div>
        </div>

        <div class="add-note-row add-note-row--2">
          <label class="add-note-field">
            <span class="add-note-label">노트 종류 <em class="add-note-req">*</em></span>
            <select class="add-note-select" name="notebookType" required>
              ${optionHtml(typeOptionsList, '선택')}
            </select>
          </label>
          <label class="add-note-field">
            <span class="add-note-label">시기</span>
            <select class="add-note-select" name="periodName">
              ${optionHtml(periodOptionsList, '선택 (선택사항)')}
            </select>
          </label>
        </div>

        <fieldset class="add-note-field add-note-color-field">
          <legend class="add-note-label">색상</legend>
          <div class="add-note-color-chips" role="radiogroup" aria-label="색상">
            ${colorChipsHtml(colorOptions)}
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
          />
          ${datalistHtml('add-note-size-list', sizeOptions)}
        </label>

        <div class="add-note-row add-note-row--2">
          <label class="add-note-field">
            <span class="add-note-label">사용 시작일 <em class="add-note-req">*</em></span>
            <input class="add-note-input" name="periodStart" type="date" required />
          </label>
          <div class="add-note-field">
            <span class="add-note-label">사용 종료일</span>
            <input class="add-note-input" name="periodEnd" type="date" />
            <label class="add-note-check add-note-check--inline">
              <input type="checkbox" name="stillInUse" />
              <span>아직 사용 중</span>
            </label>
          </div>
        </div>

        <label class="add-note-field">
          <span class="add-note-label">메모</span>
          <textarea class="add-note-textarea" name="notes" rows="4" placeholder="${escapeHtml(NOTES_PLACEHOLDER)}"></textarea>
        </label>

        <label class="add-note-check">
          <input type="checkbox" name="isKept" checked />
          <span>아직 가지고 있어요. 아직 폐기하지 않고 가지고 있어요.</span>
        </label>

        <p class="add-note-status" hidden></p>

        <button type="submit" class="add-note-submit">+ 노트 만들기</button>
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
        const prev = typeSelect.value;
        typeSelect.innerHTML = optionHtml(meta.options.notebook_type, '선택');
        if (prev) typeSelect.value = prev;
      }
      if (meta?.options?.period_name?.length && periodSelect) {
        const prev = periodSelect.value;
        periodSelect.innerHTML = optionHtml(meta.options.period_name, '선택 (선택사항)');
        if (prev) periodSelect.value = prev;
      }
      if (meta?.options?.color?.length && colorChips) {
        const prev = form.querySelector('input[name="color"]:checked')?.value || '';
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

  /* 파일 선택 → 미리보기 */
  overlay.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener('change', () => {
      const field = input.closest('.add-note-cover-field');
      const nameEl = field?.querySelector('.add-note-file-name');
      const preview = field?.querySelector('.add-note-preview');
      const file = input.files?.[0];
      if (!file) {
        if (nameEl) nameEl.textContent = '선택된 파일 없음';
        if (preview) {
          preview.innerHTML =
            '<span class="add-note-preview-placeholder">' +
            (field?.dataset.kind === 'back' ? '뒷면 미리보기' : '앞면 미리보기') +
            '</span>';
        }
        return;
      }
      if (nameEl) nameEl.textContent = file.name;
      const url = URL.createObjectURL(file);
      if (preview) {
        preview.innerHTML = `<img src="${url}" alt="" />`;
      }
    });
  });

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
    const frontFile = form.querySelector('input[name="coverFront"]')?.files?.[0];
    const backFile = form.querySelector('input[name="coverBack"]')?.files?.[0];

    if (!name || !notebookType || !frontFile || !backFile) {
      setStatus('이름, 앞·뒤 표지, 노트 종류는 필수입니다.', true);
      return;
    }
    if (!periodStart) {
      setStatus('사용 시작일은 필수입니다.', true);
      return;
    }

    submitBtn.disabled = true;
    setStatus('표지 이미지를 준비하는 중…');

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

      setStatus('표지 이미지를 업로드하는 중…');

      const [frontUpload, backUpload] = await Promise.all([
        uploadCoverImage({
          file: frontDataUrl,
          filename: name,
          kind: 'front',
          noteName: name
        }),
        uploadCoverImage({
          file: backDataUrl,
          filename: name,
          kind: 'back',
          noteName: name
        })
      ]);

      setStatus('업로드 완료. 확인을 기다리는 중…');

      const confirmed = window.confirm('페이지 추가할까요?');
      if (!confirmed) {
        setStatus('취소되었습니다. 표지 이미지는 업로드된 상태입니다.', true);
        submitBtn.disabled = false;
        return;
      }

      setStatus('Notion 페이지를 생성하는 중…');
      const created = await createNotionNote({
        name,
        coverFrontUrl: frontUpload.url,
        coverBackUrl: backUpload.url,
        notebookType,
        periodName: periodName || undefined,
        color: color || undefined,
        size: size || undefined,
        periodStart,
        periodEnd: periodEnd || undefined,
        notes: notes || undefined,
        isKept,
        visible: true
      });

      if (created?.id) markNoteUnseen(created.id);

      clearNotionNotebooksCache();
      clearNotionTypeItemsCache();
      showToast('노트가 추가되었습니다');
      closeModal();
      options.onCreated?.(created);
    } catch (err) {
      console.error('[AddNote]', err);
      setStatus(err?.message || '노트 추가에 실패했습니다.', true);
      submitBtn.disabled = false;
    }
  });

  form?.querySelector('input[name="name"]')?.focus();
}
