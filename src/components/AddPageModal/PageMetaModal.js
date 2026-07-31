/**
 * 페이지 정보 모달
 * - 기본: 읽기 전용 + 수정/삭제
 * - 수정: entry_date / ocr_text / visible 편집 (OCR 인식·리셋)
 */

import { render as renderButton } from '../Button/Button.js';
import { showToast } from '../Toast/Toast.js';
import { fetchPageMeta, updatePageMeta, buildPageImageUrl } from '../../services/pages.js';
import { recognizePageImage } from '../../services/ocr.js';
import '../AddNoteFab/AddNoteFab.css';
import './AddPageModal.css';

const CLOSE_ICON =
  "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><path fill='currentColor' d='M15.889 6.697a1.001 1.001 0 0 1 1.415 1.414L13.414 12l3.89 3.89a1 1 0 0 1-1.414 1.414L12 13.414l-3.889 3.89a1 1 0 1 1-1.414-1.414L10.586 12 6.697 8.11a1 1 0 0 1 1.414-1.414L12 10.586z'/></svg>";

/**
 * @param {{
 *   folder: string,
 *   pageNumber: number,
 *   imageUrl?: string,
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

  const imageUrl =
    String(options.imageUrl || '').trim() || buildPageImageUrl(folder, pageNumber);

  const overlay = document.createElement('div');
  overlay.className = 'add-note-overlay page-meta-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'page-meta-title');

  let saving = false;
  let ocrRunning = false;
  let publicId = '';
  /** @type {'view' | 'edit'} */
  let mode = 'view';
  /** @type {{ entry_date: string, ocr_text: string, visible: boolean }} */
  let snapshot = { entry_date: '', ocr_text: '', visible: true };
  let loaded = false;

  function closeModal() {
    if (saving || ocrRunning) return;
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
    document.body.classList.remove('add-note-open');
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && !saving && !ocrRunning) {
      if (mode === 'edit') {
        enterViewMode({ restore: true });
        return;
      }
      closeModal();
    }
  }

  function setStatus(message, isError = false) {
    const el = overlay.querySelector('.page-meta-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('add-note-status--error', Boolean(isError));
  }

  function readFields() {
    return {
      entry_date: String(dateInput?.value || '').trim(),
      ocr_text: String(ocrInput?.value || ''),
      visible: Boolean(visibleInput?.checked)
    };
  }

  function applyFields(meta) {
    const dateValue = String(meta.entry_date || '').trim();
    if (dateInput) {
      dateInput.value = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : '';
    }
    if (ocrInput) ocrInput.value = meta.ocr_text || '';
    if (visibleInput) visibleInput.checked = meta.visible !== false;
  }

  function setEditEnabled(enabled) {
    if (dateInput) dateInput.disabled = !enabled;
    if (ocrInput) ocrInput.disabled = !enabled;
    if (visibleInput) visibleInput.disabled = !enabled;
    if (ocrBtn) ocrBtn.disabled = !enabled;
    if (ocrResetBtn) ocrResetBtn.disabled = !enabled;
    if (submitBtn) submitBtn.disabled = !enabled;
  }

  function syncModeUi() {
    overlay.classList.toggle('page-meta-overlay--edit', mode === 'edit');
    const title = overlay.querySelector('#page-meta-title');
    if (title) {
      title.textContent =
        mode === 'edit' ? `페이지 수정 · ${pageNumber}` : `페이지 정보 · ${pageNumber}`;
    }
    const viewActions = overlay.querySelector('.page-meta-actions--view');
    const editActions = overlay.querySelector('.page-meta-actions--edit');
    const ocrActions = overlay.querySelector('.page-meta-ocr-actions');
    const hints = overlay.querySelectorAll('.page-meta-edit-hint');
    if (viewActions) viewActions.hidden = mode !== 'view';
    if (editActions) editActions.hidden = mode !== 'edit';
    if (ocrActions) ocrActions.hidden = mode !== 'edit';
    hints.forEach((el) => {
      el.hidden = mode !== 'edit';
    });
    setEditEnabled(mode === 'edit' && loaded && !saving && !ocrRunning);
  }

  function enterViewMode({ restore = false } = {}) {
    mode = 'view';
    if (restore) applyFields(snapshot);
    syncModeUi();
    const dateValue = snapshot.entry_date;
    setStatus(dateValue ? `저장된 날짜: ${dateValue}` : '');
  }

  function enterEditMode() {
    mode = 'edit';
    applyFields(snapshot);
    syncModeUi();
    setStatus('수정 후 저장을 눌러 반영하세요');
  }

  function ocrProgressLabel(status, progress) {
    const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
    if (status === 'loading tesseract core') return `OCR 엔진 로드 중… ${pct}%`;
    if (status === 'initializing tesseract') return `OCR 초기화 중… ${pct}%`;
    if (status === 'loading language traineddata') return `언어 데이터 로드 중… ${pct}%`;
    if (status === 'initializing api') return `OCR 준비 중… ${pct}%`;
    if (status === 'recognizing text') return `텍스트 인식 중… ${pct}%`;
    return `OCR 실행 중… ${pct}%`;
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
          <span class="add-note-label">날짜</span>
          <input class="add-note-input" name="entry_date" type="date" disabled />
          <span class="page-meta-date-hint page-meta-edit-hint" hidden>OCR로 채우거나 직접 입력 · 비우면 날짜 없음</span>
        </label>
        <div class="add-note-field">
          <div class="page-meta-ocr-label-row">
            <span class="add-note-label">OCR</span>
            <div class="page-meta-ocr-actions" hidden>
              <button type="button" class="page-meta-ocr-reset-btn" disabled>리셋</button>
              <button type="button" class="page-meta-ocr-btn" disabled>이미지에서 인식</button>
            </div>
          </div>
          <textarea class="add-note-textarea" name="ocr_text" rows="5" placeholder="이 페이지의 텍스트/메모" disabled></textarea>
          <span class="page-meta-date-hint page-meta-edit-hint" hidden>손글씨는 정확도가 낮을 수 있습니다. 인식 후 수정·저장하세요.</span>
        </div>
        <label class="add-note-check">
          <input type="checkbox" name="visible" checked disabled />
          <span>사이트에 표시 (visible)</span>
        </label>
        <div class="page-meta-actions page-meta-actions--view">
          <button type="button" class="page-meta-edit-btn" data-action="edit" disabled>수정</button>
          <button type="button" class="page-meta-delete-btn" data-action="delete" disabled>삭제</button>
        </div>
        <div class="page-meta-actions page-meta-actions--edit" hidden>
          <button type="button" class="add-page-secondary" data-action="cancel-edit">취소</button>
          <button type="submit" class="add-note-submit page-meta-save-btn" disabled>저장</button>
        </div>
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
  const submitBtn = form?.querySelector('.page-meta-save-btn');
  const ocrBtn = form?.querySelector('.page-meta-ocr-btn');
  const ocrResetBtn = form?.querySelector('.page-meta-ocr-reset-btn');
  const editBtn = form?.querySelector('[data-action="edit"]');
  const deleteBtn = form?.querySelector('[data-action="delete"]');

  overlay.querySelector('.add-note-close')?.addEventListener('click', () => {
    closeModal();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  fetchPageMeta({ folder, page: pageNumber })
    .then((meta) => {
      publicId = meta.publicId || '';
      const dateValue = String(meta.entry_date || '').trim();
      snapshot = {
        entry_date: /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : '',
        ocr_text: meta.ocr_text || '',
        visible: meta.visible !== false
      };
      applyFields(snapshot);
      loaded = true;
      if (editBtn) editBtn.disabled = false;
      if (deleteBtn) deleteBtn.disabled = false;
      enterViewMode();
    })
    .catch((err) => {
      console.error('[PageMeta] load', err);
      loaded = true;
      if (editBtn) editBtn.disabled = false;
      if (deleteBtn) deleteBtn.disabled = false;
      enterViewMode();
      setStatus(err?.message || '메타를 불러오지 못했습니다', true);
    });

  editBtn?.addEventListener('click', () => {
    if (!loaded || saving) return;
    enterEditMode();
  });

  form?.querySelector('[data-action="cancel-edit"]')?.addEventListener('click', () => {
    if (saving || ocrRunning) return;
    enterViewMode({ restore: true });
  });

  ocrResetBtn?.addEventListener('click', () => {
    if (mode !== 'edit' || ocrRunning || saving) return;
    applyFields(snapshot);
    setStatus('저장된 값으로 되돌렸습니다');
  });

  ocrBtn?.addEventListener('click', async () => {
    if (mode !== 'edit' || ocrRunning || saving || !imageUrl) return;
    ocrRunning = true;
    setEditEnabled(false);
    if (ocrBtn) {
      ocrBtn.disabled = true;
      ocrBtn.textContent = '인식 중…';
    }
    setStatus('OCR 준비 중…');

    try {
      const result = await recognizePageImage(imageUrl, {
        onProgress: ({ status, progress }) => {
          setStatus(ocrProgressLabel(status, progress));
        }
      });

      if (ocrInput) ocrInput.value = result.text || '';
      if (result.entry_date && dateInput) {
        dateInput.value = result.entry_date;
      }

      if (result.text && result.entry_date) {
        setStatus(`인식 완료 · 날짜 ${result.entry_date} (저장을 눌러 반영)`);
        showToast('텍스트와 날짜를 채웠습니다');
      } else if (result.text) {
        setStatus('인식 완료 · 날짜는 찾지 못했습니다 (저장을 눌러 반영)');
        showToast('텍스트를 채웠습니다');
      } else {
        setStatus('인식된 텍스트가 없습니다', true);
        showToast('인식된 텍스트가 없습니다');
      }
    } catch (err) {
      console.error('[PageMeta] OCR', err);
      setStatus(err?.message || 'OCR에 실패했습니다', true);
      showToast(err?.message || 'OCR에 실패했습니다');
    } finally {
      ocrRunning = false;
      setEditEnabled(true);
      if (ocrBtn) ocrBtn.textContent = '이미지에서 인식';
    }
  });

  deleteBtn?.addEventListener('click', () => {
    if (!loaded || saving || ocrRunning) return;
    showToast('기능 준비중입니다');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (mode !== 'edit' || saving || ocrRunning) return;
    saving = true;
    setEditEnabled(false);
    setStatus('저장 중…');

    const fields = readFields();
    const payload = {
      publicId: publicId || undefined,
      folder: publicId ? undefined : folder,
      pageNumber: publicId ? undefined : pageNumber,
      entry_date: fields.entry_date,
      ocr_text: fields.ocr_text,
      visible: fields.visible
    };

    try {
      await updatePageMeta(payload);
      snapshot = { ...fields };
      saving = false;
      showToast(
        payload.visible
          ? '페이지 정보가 저장되었습니다'
          : '페이지를 숨김 처리했습니다'
      );
      options.onSaved?.({
        entry_date: payload.entry_date,
        ocr_text: payload.ocr_text,
        visible: payload.visible,
        pageNumber
      });
      enterViewMode();
    } catch (err) {
      console.error('[PageMeta] save', err);
      setStatus(err?.message || '저장에 실패했습니다', true);
      saving = false;
      setEditEnabled(true);
    }
  });

  syncModeUi();
}
