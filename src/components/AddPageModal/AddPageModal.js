/**
 * 페이지 추가 모달
 * - PDF → JPEG 변환 후 notebooks/{public_id}/pages 에 업로드
 * - 이미지 1~10장 (순서 변경·삭제)
 */

import { render as renderButton } from '../Button/Button.js';
import { open as openDialog } from '../Dialog/Dialog.js';
import {
  openUploadResultDialog,
  shortUploadError
} from '../Dialog/uploadResultDialog.js';
import { render as renderField, setStatus as setFormStatus } from '../FormField/FormField.js';
import {
  renderPicker as renderFilePicker,
  renderList as renderUploadList
} from '../FileUploadPreview/FileUploadPreview.js';
import { showToast } from '../Toast/Toast.js';
import {
  hideUploadingOverlay,
  showUploadingOverlay
} from '../AddNoteFab/uploadOverlay.js';
import {
  convertImageDataUrlToJpeg,
  convertPdfFileToJpegDataUrls,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_COUNT,
  MAX_PDF_BYTES,
  readFileAsDataUrl,
  shiftPagesAfter,
  uploadPageImage,
  validateImageFiles,
  validatePdfFile
} from '../../services/pages.js';
import { markNoteUnseen } from '../../utils/unseenNotes.js';
import { requireAuth } from '../../services/auth.js';
import { fetchNotePages, notePagesFolder } from '../../services/notePages.js';
import { clearNotesCaches } from '../../utils/notesCatalog.js';
import { escapeHtml } from '../../utils/html.js';
import './AddPageModal.css';

/**
 * @param {{
 *   uploadedCount: number,
 *   total: number,
 *   stage: 'shift' | 'pages',
 *   failedPageIndex: number,
 *   fromNewNote: boolean,
 *   error: unknown
 * }} info
 */
function describePageUploadFailure(info) {
  const reason = shortUploadError(info.error);
  const coverPrefix = info.fromNewNote ? '표지는 저장됐고, ' : '';

  if (info.stage === 'shift') {
    return {
      title: '페이지 추가 실패',
      message: '기존 페이지 번호를 바꾸는 중 실패해서 새 장을 넣지 못했습니다.',
      detail: reason
    };
  }

  if (info.uploadedCount <= 0) {
    return {
      title: '페이지 업로드 실패',
      message: info.fromNewNote
        ? '표지는 저장됐지만 본문 페이지는 올리지 못했습니다.'
        : '본문 페이지를 올리지 못했습니다.',
      detail: reason
    };
  }

  if (info.uploadedCount < info.total) {
    const failedAt =
      info.failedPageIndex >= 0 ? `${info.failedPageIndex + 1}장째부터 실패했습니다.` : '';
    return {
      title: '일부만 저장됨',
      message: `${coverPrefix}${info.total}장 중 ${info.uploadedCount}장만 올렸습니다.`,
      detail: [failedAt, reason].filter(Boolean).join(' ')
    };
  }

  return {
    title: '페이지 업로드 실패',
    message: info.fromNewNote
      ? '표지는 저장됐지만 본문 페이지 처리 중 오류가 났습니다.'
      : '페이지 처리 중 오류가 났습니다.',
    detail: reason
  };
}

/**
 * @param {{
 *   note: { id?: string, title?: string, name?: string, publicId?: string, pageCount?: number },
 *   insertAfterPage?: number,
 *   fromNewNote?: boolean,
 *   onDone?: (result?: object) => void,
 *   onSettled?: () => void
 * }} [options]
 */
export async function openAddPageModal(options = {}) {
  if (document.querySelector('.add-page-dialog')) {
    options.onSettled?.();
    return;
  }
  if (!(await requireAuth())) {
    options.onSettled?.();
    return;
  }

  const note = options.note || {};
  const noteId = String(note.id || '').trim();
  const noteName = String(note.title || note.name || '').trim();
  const notePublicId = String(note.publicId || '').trim();
  const canonicalFolder = notePublicId ? notePagesFolder(notePublicId) : '';
  const fromNewNote = Boolean(options.fromNewNote);

  if (!noteId || !noteName || !notePublicId) {
    showToast('노트 정보가 없어 페이지를 추가할 수 없습니다.');
    options.onSettled?.();
    return;
  }

  let existingCount = 0;
  if (!fromNewNote) {
    try {
      const listed = await fetchNotePages(notePublicId);
      existingCount = Math.max(0, Math.floor(Number(listed.pageCount) || 0));
    } catch (err) {
      console.error('[AddPage] list pages', err);
      showToast(err?.message || '기존 페이지 목록을 확인하지 못했습니다.');
      options.onSettled?.();
      return;
    }
  }

  /* null이면 맨 뒤에 추가. 값이 있으면 해당 페이지 다음에 삽입 */
  const insertAfterRaw = options.insertAfterPage;
  const insertAfterPage =
    insertAfterRaw == null || insertAfterRaw === ''
      ? null
      : Math.max(0, Math.min(existingCount, Math.floor(Number(insertAfterRaw) || 0)));
  const startPage = insertAfterPage != null ? insertAfterPage + 1 : existingCount + 1;
  const needsShift = insertAfterPage != null && insertAfterPage < existingCount;

  /** @type {'pick'|'pdf'|'images'} */
  let step = 'pick';
  /** @type {{ id: string, dataUrl: string, label: string }[]} */
  let pages = [];
  let busy = false;
  let uploadStarted = false;
  let settled = false;

  const settle = () => {
    if (settled) return;
    settled = true;
    options.onSettled?.();
  };

  const dialog = openDialog({
    title: '페이지 추가',
    titleId: 'add-page-title',
    className: 'add-page-dialog',
    panelClassName: 'add-page-panel',
    canClose: () => !busy,
    bodyHtml: '<div class="add-page-body"></div>',
    onClose: () => {
      if (!uploadStarted) settle();
    }
  });
  const overlay = dialog.overlay;
  const closeModal = dialog.close;

  function setStatus(message, isError = false) {
    setFormStatus(overlay.querySelector('.add-page-status'), message, isError);
  }

  function renderPreviewList() {
    const list = overlay.querySelector('.upload-list');
    if (!list) return;
    list.innerHTML = renderUploadList(pages, { startPage });
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
          ${renderButton({
            shape: 'text',
            className: 'add-page-source-btn',
            dataset: { source: 'pdf' },
            content: `<span class="add-page-source-title">PDF</span><span class="add-page-source-desc">자동으로 JPEG로 변환해 업로드</span>`
          })}
          ${renderButton({
            shape: 'text',
            className: 'add-page-source-btn',
            dataset: { source: 'images' },
            content: `<span class="add-page-source-title">이미지</span><span class="add-page-source-desc">PNG, JPEG, JPG, GIF · 1~${MAX_IMAGE_COUNT}장</span>`
          })}
        </div>
        <p class="form-status add-page-status" role="status"></p>
      `;
      return;
    }

    if (step === 'pdf') {
      body.innerHTML = `
        <p class="add-page-note-name">노트: <strong>${escapeHtml(noteName)}</strong></p>
        ${renderField({
          type: 'custom',
          label: 'PDF 파일',
          required: true,
          hint: `권장 ${Math.floor(MAX_PDF_BYTES / (1024 * 1024))}MB 이하 · 페이지별로 자동 변환됩니다`,
          children: renderFilePicker({
            name: 'pdfFile',
            pickLabel: 'PDF 선택',
            accept: 'application/pdf,.pdf',
            statusAttr: 'data-pdf-name'
          })
        })}
        <ul class="upload-list"></ul>
        <p class="form-status add-page-status" role="status"></p>
        <div class="add-page-footer">
          ${renderButton({
            shape: 'text',
            block: true,
            content: '뒤로',
            className: 'add-page-secondary',
            dataset: { action: 'back' }
          })}
          ${renderButton({
            shape: 'solid',
            content: '이 순서로 업로드',
            className: 'add-page-submit',
            dataset: { action: 'upload' },
            disabled: true
          })}
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
      ${renderField({
        type: 'custom',
        label: `이미지 파일`,
        required: true,
        hint: `최대 ${MAX_IMAGE_COUNT}장 · 장당 ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB 이하`,
        children: renderFilePicker({
          name: 'imageFiles',
          pickLabel: '이미지 선택',
          accept: 'image/png,image/jpeg,image/jpg,image/gif,.png,.jpg,.jpeg,.gif',
          multiple: true,
          statusText: '아직 선택된 이미지 없음',
          labelAttr: 'data-image-pick-label',
          statusAttr: 'data-image-name'
        })
      })}
      <ul class="upload-list"></ul>
      <p class="form-status add-page-status" role="status"></p>
      <div class="add-page-footer">
        ${renderButton({
          shape: 'text',
          block: true,
          content: '뒤로',
          className: 'add-page-secondary',
          dataset: { action: 'back' }
        })}
        ${renderButton({
          shape: 'solid',
          content: '이 순서로 업로드',
          className: 'add-page-submit',
          dataset: { action: 'upload' },
          disabled: true
        })}
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

    const validated = validatePdfFile(file);
    if (!validated.ok) {
      setStatus(validated.message, true);
      const input = overlay.querySelector('input[name="pdfFile"]');
      if (input) input.value = '';
      if (nameEl) nameEl.textContent = '선택된 파일 없음';
      return;
    }

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
    uploadStarted = true;
    closeModal();
    busy = true;
    updateUploadEnabled();

    const total = pages.length;
    let uploadedCount = 0;
    let stage = needsShift ? 'shift' : 'pages';
    let failedPageIndex = -1;

    showUploadingOverlay({
      message: `페이지 업로드 중… 0/${total}`,
      current: 0,
      total
    });

    try {
      if (needsShift) {
        showUploadingOverlay('뒤 페이지 번호를 갱신하는 중…');
        await shiftPagesAfter({
          folder: canonicalFolder,
          afterPage: insertAfterPage,
          shiftBy: total,
          pageCount: existingCount
        });
        stage = 'pages';
      }

      for (let i = 0; i < pages.length; i += 1) {
        const pageNumber = startPage + i;
        stage = 'pages';
        failedPageIndex = i;
        showUploadingOverlay({
          message: `페이지 업로드 중… ${i + 1}/${total}`,
          current: i + 1,
          total
        });
        await uploadPageImage({
          file: pages[i].dataUrl,
          noteName,
          pageNumber,
          publicId: notePublicId
        });
        uploadedCount += 1;
      }

      const newPageCount = existingCount + uploadedCount;
      if (noteId) markNoteUnseen(noteId);
      clearNotesCaches();
      hideUploadingOverlay();
      const donePayload = {
        id: noteId,
        publicId: notePublicId,
        pageCount: newPageCount,
        insertAfterPage,
        insertedCount: uploadedCount
      };
      if (fromNewNote) {
        options.onDone?.(donePayload);
        settle();
      } else {
        openUploadResultDialog({
          title: '업로드 완료',
          message: needsShift
            ? `${uploadedCount}페이지를 ${insertAfterPage}페이지 다음에 추가했습니다.`
            : `${uploadedCount}페이지가 추가되었습니다.`
        });
        options.onDone?.(donePayload);
      }
    } catch (err) {
      console.error('[AddPage] upload', err);
      hideUploadingOverlay();
      const result = describePageUploadFailure({
        uploadedCount,
        total,
        stage,
        failedPageIndex,
        fromNewNote,
        error: err
      });
      if (uploadedCount > 0) {
        if (noteId) markNoteUnseen(noteId);
        clearNotesCaches();
        options.onDone?.({
          id: noteId,
          publicId: notePublicId,
          pageCount: existingCount + uploadedCount,
          insertAfterPage,
          insertedCount: uploadedCount,
          partial: true
        });
      }
      openUploadResultDialog({
        ...result,
        onClose: fromNewNote ? settle : undefined
      });
    } finally {
      busy = false;
    }
  }

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
  if (document.querySelector('.add-page-confirm-dialog')) {
    options.onCancel?.();
    return;
  }

  const noteName = String(options.note?.title || options.note?.name || '').trim();
  /* 닫기 경로(딤·ESC)와 「나중에」를 구분하지 않고 취소로 취급 */
  let confirmed = false;

  const dialog = openDialog({
    title: '페이지를 추가할까요?',
    titleId: 'add-page-confirm-title',
    className: 'add-page-confirm-dialog',
    panelClassName: 'dialog__panel--narrow',
    showClose: false,
    bodyHtml: `
      <p class="add-page-confirm-text">
        ${noteName ? `<strong>${escapeHtml(noteName)}</strong> 노트에 ` : ''}본문 페이지(PDF/이미지)를 지금 추가할 수 있습니다.
      </p>
      <div class="dialog-actions">
        ${renderButton({
          shape: 'text',
          block: true,
          content: '나중에',
          className: 'add-page-secondary',
          dataset: { choice: 'later' }
        })}
        ${renderButton({
          shape: 'solid',
          content: '확인',
          className: 'add-page-confirm-ok',
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
