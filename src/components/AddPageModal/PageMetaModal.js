/**
 * 특정 페이지 메타(entry_date, ocr_text, visible) 편집 모달
 * OCR: Tesseract.js로 페이지 이미지에서 텍스트·날짜 후보 채움 (저장은 별도)
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

  function closeModal() {
    if (saving || ocrRunning) return;
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
    document.body.classList.remove('add-note-open');
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && !saving && !ocrRunning) closeModal();
  }

  function setStatus(message, isError = false) {
    const el = overlay.querySelector('.page-meta-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('add-note-status--error', Boolean(isError));
  }

  function setFieldsEnabled(enabled) {
    if (dateInput) dateInput.disabled = !enabled;
    if (ocrInput) ocrInput.disabled = !enabled;
    if (visibleInput) visibleInput.disabled = !enabled;
    if (submitBtn) submitBtn.disabled = !enabled;
    if (ocrBtn) ocrBtn.disabled = !enabled;
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
          <span class="page-meta-date-hint">OCR로 채우거나 직접 입력 · 비우면 날짜 없음</span>
        </label>
        <div class="add-note-field">
          <div class="page-meta-ocr-label-row">
            <span class="add-note-label">OCR</span>
            <button type="button" class="page-meta-ocr-btn" disabled>이미지에서 인식</button>
          </div>
          <textarea class="add-note-textarea" name="ocr_text" rows="5" placeholder="이 페이지의 텍스트/메모" disabled></textarea>
          <span class="page-meta-date-hint">손글씨는 정확도가 낮을 수 있습니다. 인식 후 수정·저장하세요.</span>
        </div>
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
  const ocrBtn = form?.querySelector('.page-meta-ocr-btn');

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
      if (dateInput) {
        dateInput.value = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : '';
      }
      if (ocrInput) ocrInput.value = meta.ocr_text || '';
      if (visibleInput) visibleInput.checked = meta.visible !== false;
      setFieldsEnabled(true);
      setStatus(dateValue ? `저장된 날짜: ${dateValue}` : '');
    })
    .catch((err) => {
      console.error('[PageMeta] load', err);
      setFieldsEnabled(true);
      setStatus(err?.message || '메타를 불러오지 못했습니다 (새 값으로 저장 가능)', true);
    });

  ocrBtn?.addEventListener('click', async () => {
    if (ocrRunning || saving || !imageUrl) return;
    ocrRunning = true;
    setFieldsEnabled(false);
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
      setFieldsEnabled(true);
      if (ocrBtn) ocrBtn.textContent = '이미지에서 인식';
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving || ocrRunning) return;
    saving = true;
    if (submitBtn) submitBtn.disabled = true;
    if (ocrBtn) ocrBtn.disabled = true;
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
      saving = false;
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      document.body.classList.remove('add-note-open');
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
    } catch (err) {
      console.error('[PageMeta] save', err);
      setStatus(err?.message || '저장에 실패했습니다', true);
      saving = false;
      if (submitBtn) submitBtn.disabled = false;
      if (ocrBtn) ocrBtn.disabled = false;
    }
  });
}
