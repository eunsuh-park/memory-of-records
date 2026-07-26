/**
 * 우측 하단 FAB(+) → 새 노트 추가 모달
 *
 * 흐름:
 * 1) 폼 작성 (이름·앞뒤표지·타입 필수, is_kept 기본 checked)
 * 2) 표지 2장 Cloudinary 업로드 → URL
 * 3) "페이지 추가할까요?" 확인
 * 4) Notion DB에 새 페이지 생성
 */

import { render as renderButton } from '../Button/Button.js';
import { showToast } from '../Toast/Toast.js';
import { typeOptions } from '../../services/typeOptions.js';
import {
  createNotionNote,
  fetchNoteFormMeta,
  readFileAsDataUrl,
  uploadCoverImage
} from '../../services/createNote.js';
import { clearNotionNotebooksCache } from '../../services/notionNotebooks.js';
import { clearNotionTypeItemsCache } from '../../services/notionByType.js';
import './AddNoteFab.css';

const CLOSE_ICON =
  "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><path fill='currentColor' d='M15.889 6.697a1.001 1.001 0 0 1 1.415 1.414L13.414 12l3.89 3.89a1 1 0 0 1-1.414 1.414L12 13.414l-3.889 3.89a1 1 0 1 1-1.414-1.414L10.586 12 6.697 8.11a1 1 0 0 1 1.414-1.414L12 10.586z'/></svg>";

const PLUS_ICON =
  "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 24 24' fill='none' aria-hidden='true'><path stroke='currentColor' stroke-width='2.2' stroke-linecap='round' d='M12 5v14M5 12h14'/></svg>";

const FALLBACK_TYPES = typeOptions.map((t) => t.labelKr);
const FALLBACK_COLORS = ['파랑', '빨강', '검정', '초록', '노랑', '보라', '회색', '갈색', '분홍', '흰색'];
const FALLBACK_SIZES = ['A4', 'A5', 'A6', 'B5', 'B6', '16절', '8절', '4절'];

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

/**
 * @param {{ onCreated?: () => void }} [options]
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
 * @param {{ onCreated?: () => void }} [options]
 */
export function openAddNoteModal(options = {}) {
  if (document.querySelector('.add-note-overlay')) return;

  const typeOptionsList = FALLBACK_TYPES;
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
              <span class="add-note-preview-placeholder">cover_front_url</span>
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
              <span class="add-note-preview-placeholder">cover_back_url</span>
            </div>
          </div>
        </div>

        <div class="add-note-row add-note-row--3">
          <label class="add-note-field">
            <span class="add-note-label">notebook_type <em class="add-note-req">*</em></span>
            <select class="add-note-select" name="notebookType" required>
              ${optionHtml(typeOptionsList, '선택')}
            </select>
          </label>
          <label class="add-note-field">
            <span class="add-note-label">color</span>
            <select class="add-note-select" name="color">
              ${optionHtml(colorOptions, '선택 (선택사항)')}
            </select>
          </label>
          <label class="add-note-field">
            <span class="add-note-label">size</span>
            <select class="add-note-select" name="size">
              ${optionHtml(sizeOptions, '선택 (선택사항)')}
            </select>
          </label>
        </div>

        <div class="add-note-row add-note-row--2">
          <label class="add-note-field">
            <span class="add-note-label">period_start</span>
            <input class="add-note-input" name="periodStart" type="date" />
          </label>
          <label class="add-note-field">
            <span class="add-note-label">period_end</span>
            <input class="add-note-input" name="periodEnd" type="date" />
          </label>
        </div>

        <label class="add-note-field">
          <span class="add-note-label">notes (메모)</span>
          <textarea class="add-note-textarea" name="notes" rows="4" placeholder="자유 메모"></textarea>
        </label>

        <label class="add-note-check">
          <input type="checkbox" name="isKept" checked />
          <span>is_kept (보관함에 유지)</span>
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
  const colorSelect = form?.querySelector('select[name="color"]');
  const sizeSelect = form?.querySelector('select[name="size"]');

  /* Notion DB select 옵션으로 드롭다운 갱신 */
  fetchNoteFormMeta()
    .then((meta) => {
      if (meta?.options?.notebook_type?.length && typeSelect) {
        const prev = typeSelect.value;
        typeSelect.innerHTML = optionHtml(meta.options.notebook_type, '선택');
        if (prev) typeSelect.value = prev;
      }
      if (meta?.options?.color?.length && colorSelect) {
        const prev = colorSelect.value;
        colorSelect.innerHTML = optionHtml(meta.options.color, '선택 (선택사항)');
        if (prev) colorSelect.value = prev;
      }
      if (meta?.options?.size?.length && sizeSelect) {
        const prev = sizeSelect.value;
        sizeSelect.innerHTML = optionHtml(meta.options.size, '선택 (선택사항)');
        if (prev) sizeSelect.value = prev;
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
            (field?.dataset.kind === 'back' ? 'cover_back_url' : 'cover_front_url') +
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
    const color = String(fd.get('color') || '').trim();
    const size = String(fd.get('size') || '').trim();
    const periodStart = String(fd.get('periodStart') || '').trim();
    const periodEnd = String(fd.get('periodEnd') || '').trim();
    const notes = String(fd.get('notes') || '').trim();
    const isKept = Boolean(fd.get('isKept'));
    const frontFile = form.querySelector('input[name="coverFront"]')?.files?.[0];
    const backFile = form.querySelector('input[name="coverBack"]')?.files?.[0];

    if (!name || !notebookType || !frontFile || !backFile) {
      setStatus('이름, 앞·뒤 표지, notebook_type은 필수입니다.', true);
      return;
    }

    submitBtn.disabled = true;
    setStatus('표지 이미지를 업로드하는 중…');

    try {
      const [frontDataUrl, backDataUrl] = await Promise.all([
        readFileAsDataUrl(frontFile),
        readFileAsDataUrl(backFile)
      ]);

      const [frontUpload, backUpload] = await Promise.all([
        uploadCoverImage({
          file: frontDataUrl,
          filename: frontFile.name,
          kind: 'front'
        }),
        uploadCoverImage({
          file: backDataUrl,
          filename: backFile.name,
          kind: 'back'
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
      await createNotionNote({
        name,
        coverFrontUrl: frontUpload.url,
        coverBackUrl: backUpload.url,
        notebookType,
        color: color || undefined,
        size: size || undefined,
        periodStart: periodStart || undefined,
        periodEnd: periodEnd || undefined,
        notes: notes || undefined,
        isKept
      });

      clearNotionNotebooksCache();
      clearNotionTypeItemsCache();
      showToast('노트가 추가되었습니다');
      closeModal();
      options.onCreated?.();
    } catch (err) {
      console.error('[AddNote]', err);
      setStatus(err?.message || '노트 추가에 실패했습니다.', true);
      submitBtn.disabled = false;
    }
  });

  form?.querySelector('input[name="name"]')?.focus();
}
