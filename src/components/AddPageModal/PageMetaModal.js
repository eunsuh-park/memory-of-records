/**
 * 특정 페이지 메타(entry_date, ocr_text, visible) 편집 모달
 */

import { render as renderButton } from '../Button/Button.js';
import { showToast } from '../Toast/Toast.js';
import { fetchPageMeta, updatePageMeta } from '../../services/pages.js';
import '../AddNoteFab/AddNoteFab.css';
import './AddPageModal.css';

const CLOSE_ICON =
  "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><path fill='currentColor' d='M15.889 6.697a1.001 1.001 0 0 1 1.415 1.414L13.414 12l3.89 3.89a1 1 0 0 1-1.414 1.414L12 13.414l-3.889 3.89a1 1 0 1 1-1.414-1.414L10.586 12 6.697 8.11a1 1 0 0 1 1.414-1.414L12 10.586z'/></svg>";

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {{
 *   folder: string,
 *   pageNumber: number,
 *   onSaved?: (meta: { entry_date: string, ocr_text: string, visible: boolean, pageNumber: number }) => void
 * }} options
 */
export function openPageMetaModal(options = {}) {
  if (document.querySelector('.page-meta-overlay')) return;

  const folder = String(options.folder || '').trim();
  const pageNumber = Math.max(1, Math.floor(Number(options.pageNumber) || 1));
  if (!folder) {
    showToast('페이지 폴더 정보가 없습니다');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'add-note-overlay page-meta-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'page-meta-title');

  let saving = false;
  let publicId = '';

  function closeModal() {
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
    document.body.classList.remove('add-note-open');
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && !saving) closeModal();
  }

  function setStatus(message, isError = false) {
    const el = overlay.querySelector('.page-meta-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('add-note-status--error', Boolean(isError));
  }

  overlay.innerHTML = `
    ${renderButton({
      variant: 'icon',
      ariaLabel: '닫기',
      content: CLOSE_ICON,
      className: 'add-note-close'
    })}
    <div class="add-note-panel page-meta-panel">
      <header class="add-note-header">
        <h2 id="page-meta-title" class="add-note-title">페이지 정보 · ${pageNumber}</h2>
      </header>
      <form class="add-note-form page-meta-form" novalidate>
        <p class="add-note-status page-meta-status" role="status">불러오는 중…</p>
        <label class="add-note-field">
          <span class="add-note-label">날짜 (entry_date)</span>
          <input class="add-note-input" name="entry_date" type="date" disabled />
        </label>
        <label class="add-note-field">
          <span class="add-note-label">OCR (ocr_text)</span>
          <textarea class="add-note-textarea" name="ocr_text" rows="5" placeholder="이 페이지의 텍스트/메모" disabled></textarea>
        </label>
        <label class="add-note-check">
          <input type="checkbox" name="visible" checked disabled />
          <span>사이트에 표시 (visible)</span>
        </label>
        <button type="submit" class="add-note-submit" disabled>저장</button>
      </form>
    </div>
  `;

  document.body.classList.add('add-note-open');
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKeydown);

  const form = overlay.querySelector('.page-meta-form');
  const dateInput = form?.querySelector('input[name="entry_date"]');
  const ocrInput = form?.querySelector('textarea[name="ocr_text"]');
  const visibleInput = form?.querySelector('input[name="visible"]');
  const submitBtn = form?.querySelector('button[type="submit"]');

  overlay.querySelector('.add-note-close')?.addEventListener('click', () => {
    if (!saving) closeModal();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && !saving) closeModal();
  });

  fetchPageMeta({ folder, page: pageNumber })
    .then((meta) => {
      publicId = meta.publicId || '';
      if (dateInput) {
        dateInput.value = meta.entry_date || '';
        dateInput.disabled = false;
      }
      if (ocrInput) {
        ocrInput.value = meta.ocr_text || '';
        ocrInput.disabled = false;
      }
      if (visibleInput) {
        visibleInput.checked = meta.visible !== false;
        visibleInput.disabled = false;
      }
      if (submitBtn) submitBtn.disabled = false;
      setStatus('');
    })
    .catch((err) => {
      console.error('[PageMeta] load', err);
      setStatus(err?.message || '메타를 불러오지 못했습니다', true);
    });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving) return;
    saving = true;
    if (submitBtn) submitBtn.disabled = true;
    setStatus('저장 중…');

    const payload = {
      publicId: publicId || undefined,
      folder: publicId ? undefined : folder,
      pageNumber: publicId ? undefined : pageNumber,
      entry_date: String(dateInput?.value || '').trim(),
      ocr_text: String(ocrInput?.value || ''),
      visible: Boolean(visibleInput?.checked)
    };

    try {
      await updatePageMeta(payload);
      closeModal();
      showToast('페이지 정보가 저장되었습니다');
      options.onSaved?.({
        entry_date: payload.entry_date,
        ocr_text: payload.ocr_text,
        visible: payload.visible,
        pageNumber
      });
    } catch (err) {
      console.error('[PageMeta] save', err);
      setStatus(err?.message || '저장에 실패했습니다', true);
      saving = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
