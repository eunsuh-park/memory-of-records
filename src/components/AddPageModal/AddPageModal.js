/**
 * 페이지 추가 모달
 * - PDF → JPEG 변환 후 Cloudinary Content 폴더 업로드
 * - 이미지 1~10장 (순서 변경·삭제)
 */

import { render as renderButton } from '../Button/Button.js';
import { showToast } from '../Toast/Toast.js';
import {
  convertImageDataUrlToJpeg,
  convertPdfFileToJpegDataUrls,
  MAX_IMAGE_COUNT,
  readFileAsDataUrl,
  shiftPagesAfter,
  updateNotionNotePages,
  uploadPageImage,
  validateImageFiles
} from '../../services/pages.js';
import { clearNotionNotebooksCache } from '../../services/notionNotebooks.js';
import { clearNotionTypeItemsCache } from '../../services/notionByType.js';
import { markNoteUnseen } from '../../utils/unseenNotes.js';
import uploadingLottieUrl from '../../uploading.json?url';
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

function showUploadingOverlay(message = '페이지를 업로드하는 중…') {
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

/**
 * @param {{
 *   note: { id?: string, title?: string, name?: string, pdfFolderUrl?: string, pageCount?: number },
 *   insertAfterPage?: number,
 *   onDone?: (result?: object) => void
 * }} [options]
 */
export function openAddPageModal(options = {}) {
  if (document.querySelector('.add-page-overlay')) return;

  const note = options.note || {};
  const noteId = String(note.id || '').trim();
  const noteName = String(note.title || note.name || '').trim();
  const existingFolder = String(note.pdfFolderUrl || '').trim();
  const existingCount = Math.max(0, Math.floor(Number(note.pageCount) || 0));
  /* null이면 맨 뒤에 추가. 값이 있으면 해당 페이지 다음에 삽입 */
  const insertAfterRaw = options.insertAfterPage;
  const insertAfterPage =
    insertAfterRaw == null || insertAfterRaw === ''
      ? null
      : Math.max(0, Math.min(existingCount, Math.floor(Number(insertAfterRaw) || 0)));
  const startPage = insertAfterPage != null ? insertAfterPage + 1 : existingCount + 1;
  const needsShift = insertAfterPage != null && insertAfterPage < existingCount;

  if (!noteId || !noteName) {
    showToast('노트 정보가 없어 페이지를 추가할 수 없습니다.');
    return;
  }

  /** @type {'pick'|'pdf'|'images'} */
  let step = 'pick';
  /** @type {{ id: string, dataUrl: string, label: string }[]} */
  let pages = [];
  let busy = false;

  const overlay = document.createElement('div');
  overlay.className = 'add-note-overlay add-page-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'add-page-title');

  function closeModal() {
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
    document.body.classList.remove('add-note-open');
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && !busy) closeModal();
  }

  function setStatus(message, isError = false) {
    const el = overlay.querySelector('.add-page-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('add-note-status--error', Boolean(isError));
  }

  function renderPreviewList() {
    const list = overlay.querySelector('.add-page-preview-list');
    if (!list) return;
    if (!pages.length) {
      list.innerHTML = `<p class="add-page-empty">선택된 페이지가 없습니다. 이미지를 선택하면 미리보기가 표시됩니다.</p>`;
      return;
    }
    list.innerHTML = pages
      .map(
        (p, index) => `
      <li class="add-page-preview-item" data-id="${escapeHtml(p.id)}">
        <div class="add-page-preview-num">page-${String(startPage + index).padStart(6, '0')}</div>
        <img src="${escapeHtml(p.dataUrl)}" alt="" />
        <div class="add-page-preview-meta">
          <span class="add-page-preview-label">${escapeHtml(p.label || `${index + 1}`)}</span>
          <div class="add-page-preview-actions">
            <button type="button" class="add-page-mini-btn" data-action="up" data-id="${escapeHtml(p.id)}" ${index === 0 ? 'disabled' : ''} aria-label="위로">↑</button>
            <button type="button" class="add-page-mini-btn" data-action="down" data-id="${escapeHtml(p.id)}" ${index === pages.length - 1 ? 'disabled' : ''} aria-label="아래로">↓</button>
            <button type="button" class="add-page-mini-btn add-page-mini-btn--danger" data-action="remove" data-id="${escapeHtml(p.id)}" aria-label="삭제">×</button>
          </div>
        </div>
      </li>`
      )
      .join('');
  }

  function renderBody() {
    const body = overlay.querySelector('.add-page-body');
    if (!body) return;

    if (step === 'pick') {
      body.innerHTML = `
        <p class="add-page-note-name">노트: <strong>${escapeHtml(noteName)}</strong></p>
        <p class="add-page-hint">PDF 또는 이미지를 선택하세요.${
          insertAfterPage != null && needsShift
            ? ` (현재 ${existingCount}장 · ${insertAfterPage}페이지 다음에 삽입)`
            : existingCount
              ? ` (현재 ${existingCount}장 · 이어서 추가)`
              : ''
        }</p>
        <div class="add-page-source-grid">
          <button type="button" class="add-page-source-btn" data-source="pdf">
            <span class="add-page-source-title">PDF</span>
            <span class="add-page-source-desc">자동으로 JPEG로 변환해 업로드</span>
          </button>
          <button type="button" class="add-page-source-btn" data-source="images">
            <span class="add-page-source-title">이미지</span>
            <span class="add-page-source-desc">PNG, JPEG, JPG, GIF · 1~${MAX_IMAGE_COUNT}장</span>
          </button>
        </div>
        <p class="add-note-status add-page-status" role="status"></p>
      `;
      return;
    }

    if (step === 'pdf') {
      body.innerHTML = `
        <p class="add-page-note-name">노트: <strong>${escapeHtml(noteName)}</strong></p>
        <label class="add-note-field">
          <span class="add-note-label">PDF 파일 <em class="add-note-req">*</em></span>
          <label class="add-note-file-btn">
            <span>PDF 선택</span>
            <input type="file" name="pdfFile" accept="application/pdf,.pdf" hidden />
          </label>
          <span class="add-note-file-name" data-pdf-name>선택된 파일 없음</span>
        </label>
        <ul class="add-page-preview-list"></ul>
        <p class="add-note-status add-page-status" role="status"></p>
        <div class="add-page-footer">
          <button type="button" class="add-page-secondary" data-action="back">뒤로</button>
        <button type="button" class="add-note-submit add-page-submit" data-action="upload" disabled>이 순서로 업로드</button>
      </div>
      `;
      renderPreviewList();
      return;
    }

    body.innerHTML = `
      <p class="add-page-note-name">노트: <strong>${escapeHtml(noteName)}</strong></p>
      <p class="add-page-hint">이미지를 고른 뒤 미리보기에서 순서·삭제를 조정하고, 필요할 때 더 추가한 다음 업로드하세요.${
        existingCount
          ? ` (현재 ${existingCount}장 · ${existingCount + 1}번부터 이어붙임)`
          : ' (1번부터 순서대로 업로드)'
      }</p>
      <label class="add-note-field">
        <span class="add-note-label">이미지 파일 <em class="add-note-req">*</em> (최대 ${MAX_IMAGE_COUNT}장)</span>
        <label class="add-note-file-btn">
          <span data-image-pick-label>이미지 선택</span>
          <input type="file" name="imageFiles" accept="image/png,image/jpeg,image/jpg,image/gif,.png,.jpg,.jpeg,.gif" multiple hidden />
        </label>
        <span class="add-note-file-name" data-image-name>아직 선택된 이미지 없음</span>
      </label>
      <ul class="add-page-preview-list"></ul>
      <p class="add-note-status add-page-status" role="status"></p>
      <div class="add-page-footer">
        <button type="button" class="add-page-secondary" data-action="back">뒤로</button>
        <button type="button" class="add-note-submit add-page-submit" data-action="upload" disabled>이 순서로 업로드</button>
      </div>
    `;
    renderPreviewList();
  }

  function updateUploadEnabled() {
    const btn = overlay.querySelector('[data-action="upload"]');
    if (btn) btn.disabled = pages.length === 0 || busy;
  }

  function movePage(id, direction) {
    const index = pages.findIndex((p) => p.id === id);
    if (index < 0) return;
    const next = index + direction;
    if (next < 0 || next >= pages.length) return;
    const tmp = pages[index];
    pages[index] = pages[next];
    pages[next] = tmp;
    renderPreviewList();
  }

  function syncImagePickerLabel() {
    const label = overlay.querySelector('[data-image-pick-label]');
    const nameEl = overlay.querySelector('[data-image-name]');
    if (label) label.textContent = pages.length ? '이미지 더 추가' : '이미지 선택';
    if (nameEl) {
      nameEl.textContent = pages.length
        ? `${pages.length}장 선택됨 (최대 ${MAX_IMAGE_COUNT})`
        : '아직 선택된 이미지 없음';
    }
  }

  function removePage(id) {
    pages = pages.filter((p) => p.id !== id);
    renderPreviewList();
    syncImagePickerLabel();
    updateUploadEnabled();
    setStatus(pages.length ? `${pages.length}장 선택됨` : '');
  }

  async function handlePdfSelected(file) {
    if (!file) return;
    const nameEl = overlay.querySelector('[data-pdf-name]');
    if (nameEl) nameEl.textContent = file.name || 'PDF';
    setStatus('PDF를 이미지로 변환하는 중…');
    busy = true;
    updateUploadEnabled();
    try {
      const dataUrls = await convertPdfFileToJpegDataUrls(file, {
        onProgress: (done, total) => setStatus(`PDF 변환 중… ${done}/${total}`)
      });
      pages = dataUrls.map((dataUrl, i) => ({
        id: `pdf-${Date.now()}-${i}`,
        dataUrl,
        label: `p.${i + 1}`
      }));
      renderPreviewList();
      setStatus(`${pages.length}페이지 변환 완료 · 순서 조정 후 업로드하세요`);
    } catch (err) {
      console.error('[AddPage] PDF convert', err);
      pages = [];
      renderPreviewList();
      setStatus(err?.message || 'PDF 변환에 실패했습니다', true);
    } finally {
      busy = false;
      updateUploadEnabled();
    }
  }

  async function handleImagesSelected(fileList) {
    const remaining = MAX_IMAGE_COUNT - pages.length;
    const validated = validateImageFiles(fileList, { maxAdditional: remaining });
    if (!validated.ok) {
      setStatus(validated.message, true);
      return;
    }
    setStatus('이미지를 읽는 중…');
    busy = true;
    updateUploadEnabled();
    try {
      const dataUrls = await Promise.all(validated.files.map((f) => readFileAsDataUrl(f)));
      const jpegUrls = await Promise.all(dataUrls.map((url) => convertImageDataUrlToJpeg(url)));
      const stamp = Date.now();
      const added = jpegUrls.map((dataUrl, i) => ({
        id: `img-${stamp}-${pages.length + i}`,
        dataUrl,
        label: validated.files[i]?.name || `${pages.length + i + 1}`
      }));
      pages = [...pages, ...added];
      renderPreviewList();
      syncImagePickerLabel();
      setStatus(`${pages.length}장 선택됨 · 순서 조정 후 「이 순서로 업로드」를 누르세요`);
    } catch (err) {
      console.error('[AddPage] image read', err);
      setStatus(err?.message || '이미지를 읽지 못했습니다', true);
    } finally {
      busy = false;
      updateUploadEnabled();
      const input = overlay.querySelector('input[name="imageFiles"]');
      if (input) input.value = '';
    }
  }

  async function handleUpload() {
    if (!pages.length || busy) return;
    busy = true;
    updateUploadEnabled();
    closeModal();

    const total = pages.length;
    let folderUrl = existingFolder;
    let folderPath = existingFolder;
    const newPageCount = existingCount + total;

    showUploadingOverlay(`페이지 업로드 중… 0/${total}`);

    try {
      if (needsShift) {
        if (!existingFolder) {
          throw new Error('기존 페이지 폴더를 확인할 수 없어 중간에 삽입할 수 없습니다');
        }
        showUploadingOverlay('뒤 페이지 번호를 갱신하는 중…');
        await shiftPagesAfter({
          folder: existingFolder,
          afterPage: insertAfterPage,
          shiftBy: total,
          pageCount: existingCount
        });
      }

      for (let i = 0; i < pages.length; i += 1) {
        const pageNumber = startPage + i;
        showUploadingOverlay(`페이지 업로드 중… ${i + 1}/${total}`);
        const result = await uploadPageImage({
          file: pages[i].dataUrl,
          noteName,
          pageNumber,
          folder: folderPath || undefined
        });
        if (!folderUrl && result.folderUrl) folderUrl = result.folderUrl;
        if (result.folder) folderPath = result.folder;
      }

      if (!folderUrl) {
        throw new Error('업로드된 페이지 폴더 URL을 확인하지 못했습니다');
      }

      showUploadingOverlay('노트 정보를 갱신하는 중…');
      const updated = await updateNotionNotePages({
        id: noteId,
        pdfFolderUrl: folderUrl,
        pageCount: newPageCount
      });

      if (noteId) markNoteUnseen(noteId);
      clearNotionNotebooksCache();
      clearNotionTypeItemsCache();
      hideUploadingOverlay();
      showToast(
        needsShift
          ? `${total}페이지를 ${insertAfterPage}페이지 다음에 추가했습니다`
          : `${total}페이지가 추가되었습니다`
      );
      options.onDone?.({
        ...updated,
        id: noteId,
        pdfFolderUrl: folderUrl,
        pageCount: newPageCount,
        insertAfterPage,
        insertedCount: total
      });
    } catch (err) {
      console.error('[AddPage] upload', err);
      hideUploadingOverlay();
      showToast(err?.message || '페이지 추가에 실패했습니다.');
    } finally {
      busy = false;
    }
  }

  overlay.innerHTML = `
    ${renderButton({
      variant: 'icon',
      ariaLabel: '닫기',
      content: CLOSE_ICON,
      className: 'add-note-close'
    })}
    <div class="add-note-panel add-page-panel">
      <header class="add-note-header">
        <h2 id="add-page-title" class="add-note-title">페이지 추가</h2>
      </header>
      <div class="add-page-body"></div>
    </div>
  `;

  document.body.classList.add('add-note-open');
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKeydown);

  overlay.querySelector('.add-note-close')?.addEventListener('click', () => {
    if (!busy) closeModal();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && !busy) closeModal();
  });

  overlay.addEventListener('click', (e) => {
    const sourceBtn = e.target?.closest?.('[data-source]');
    if (sourceBtn) {
      const source = sourceBtn.getAttribute('data-source');
      step = source === 'pdf' ? 'pdf' : 'images';
      pages = [];
      renderBody();
      return;
    }

    const actionBtn = e.target?.closest?.('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-action');
    const id = actionBtn.getAttribute('data-id');

    if (action === 'back') {
      step = 'pick';
      pages = [];
      renderBody();
      return;
    }
    if (action === 'upload') {
      handleUpload();
      return;
    }
    if (action === 'up' && id) movePage(id, -1);
    if (action === 'down' && id) movePage(id, 1);
    if (action === 'remove' && id) removePage(id);
  });

  overlay.addEventListener('change', (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    if (input.name === 'pdfFile') {
      handlePdfSelected(input.files?.[0] || null);
    } else if (input.name === 'imageFiles') {
      handleImagesSelected(input.files);
    }
  });

  renderBody();
}

/**
 * 노트 생성 직후 「페이지를 추가할까요?」 확인
 * @param {{
 *   note: { id?: string, title?: string, name?: string },
 *   onConfirm?: () => void,
 *   onCancel?: () => void
 * }} options
 */
export function openAddPagesConfirmDialog(options = {}) {
  if (document.querySelector('.add-page-confirm-overlay')) {
    options.onCancel?.();
    return;
  }

  const noteName = String(options.note?.title || options.note?.name || '').trim();

  const overlay = document.createElement('div');
  overlay.className = 'add-note-overlay add-page-confirm-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'add-page-confirm-title');

  function close() {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    document.body.classList.remove('add-note-open');
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      close();
      options.onCancel?.();
    }
  }

  overlay.innerHTML = `
    <div class="add-note-panel add-page-confirm-panel">
      <header class="add-note-header">
        <h2 id="add-page-confirm-title" class="add-note-title">페이지를 추가할까요?</h2>
      </header>
      <p class="add-page-confirm-text">
        ${noteName ? `<strong>${escapeHtml(noteName)}</strong> 노트에 ` : ''}본문 페이지(PDF/이미지)를 지금 추가할 수 있습니다.
      </p>
      <div class="add-page-confirm-actions">
        <button type="button" class="add-page-secondary" data-choice="later">나중에</button>
        <button type="button" class="add-note-submit" data-choice="confirm">확인</button>
      </div>
    </div>
  `;

  document.body.classList.add('add-note-open');
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKey);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      close();
      options.onCancel?.();
      return;
    }
    const btn = e.target?.closest?.('[data-choice]');
    if (!btn) return;
    const choice = btn.getAttribute('data-choice');
    close();
    if (choice === 'confirm') options.onConfirm?.();
    else options.onCancel?.();
  });
}
