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
import { updateCoverPageFlags } from '../../services/noteCovers.js';
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
  /** PDF 전체 페이지 수 (첫/마지막만 미리보기로 보여줄 때) */
  let totalPdfPages = 0;
  /** PDF 전체 페이지 dataUrl (업로드용) */
  let allPdfPages = [];
  let busy = false;
  let uploadStarted = false;
  let settled = false;
  let firstPageIsCover = note.firstPageIsCover !== false;
  let lastPageIsCover = note.lastPageIsCover !== false;
  /** 기존 페이지가 있을 때, 제일 뒤에 붙이기 옵션 */
  let appendToEnd = true;
  /** 모든 페이지를 비공개로 설정 */
  let allPagesPrivate = false;
  const showFirstCoverCheck = startPage === 1;
  const showLastCoverCheck = insertAfterPage == null || existingCount === 0;

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
    list.innerHTML = renderUploadList(pages, {
      startPage,
      coverChecks:
        pages.length && (showFirstCoverCheck || showLastCoverCheck)
          ? {
              showFirst: showFirstCoverCheck,
              showLast: showLastCoverCheck,
              firstChecked: firstPageIsCover,
              lastChecked: lastPageIsCover
            }
          : null
    });
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
        ${
          existingCount > 0
            ? `<label class="form-check add-page-append-check">
                <input type="checkbox" name="appendToEnd" ${appendToEnd ? 'checked' : ''} />
                <span>이 페이지들을 제일 뒤에 붙이기</span>
              </label>`
            : ''
        }
        <label class="form-check add-page-private-check">
          <input type="checkbox" name="allPagesPrivate" ${allPagesPrivate ? 'checked' : ''} />
          <span>모든 페이지를 비공개로 설정</span>
        </label>
        <ul class="upload-list"></ul>
        ${
          showFirstCoverCheck || showLastCoverCheck
            ? `<p class="add-page-cover-hint">첫·마지막 장이 표지가 아니면, 노트에 올린 표지 이미지가 뷰어의 첫/마지막 페이지로 들어갑니다.</p>`
            : ''
        }
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
      <label class="form-check add-page-private-check">
        <input type="checkbox" name="allPagesPrivate" ${allPagesPrivate ? 'checked' : ''} />
        <span>모든 페이지를 비공개로 설정</span>
      </label>
      <ul class="upload-list"></ul>
      ${
        showFirstCoverCheck || showLastCoverCheck
          ? `<p class="add-page-cover-hint">첫·마지막 장이 표지가 아니면, 노트에 올린 표지 이미지가 뷰어의 첫/마지막 페이지로 들어갑니다.</p>`
          : ''
      }
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
      totalPdfPages = dataUrls.length;
      allPdfPages = dataUrls;
      
      if (totalPdfPages === 0) {
        throw new Error('PDF에 페이지가 없습니다');
      }
      
      // 첫 장과 마지막 장만 미리보기로 표시
      if (totalPdfPages === 1) {
        pages = [{
          id: `pdf-${Date.now()}-0`,
          dataUrl: dataUrls[0],
          label: 'p.1'
        }];
      } else {
        pages = [
          {
            id: `pdf-${Date.now()}-0`,
            dataUrl: dataUrls[0],
            label: 'p.1 (첫 장)'
          },
          {
            id: `pdf-${Date.now()}-${totalPdfPages - 1}`,
            dataUrl: dataUrls[totalPdfPages - 1],
            label: `p.${totalPdfPages} (마지막 장)`
          }
        ];
      }
      
      renderPreviewList();
      setStatus(
        totalPdfPages === 1
          ? '1페이지 변환 완료'
          : `${totalPdfPages}페이지 변환 완료 · 첫 장과 마지막 장 미리보기`
      );
    } catch (err) {
      console.error('[AddPage] PDF convert', err);
      pages = [];
      totalPdfPages = 0;
      allPdfPages = [];
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

  async function saveCoverFlagsIfNeeded() {
    const coverFlags = {};
    if (showFirstCoverCheck) coverFlags.firstPageIsCover = firstPageIsCover;
    if (showLastCoverCheck) coverFlags.lastPageIsCover = lastPageIsCover;
    if (!Object.keys(coverFlags).length) return coverFlags;
    try {
      await updateCoverPageFlags({
        publicId: notePublicId,
        ...coverFlags
      });
    } catch (flagErr) {
      console.warn('[AddPage] cover flags', flagErr);
      showToast(flagErr?.message || '표지 페이지 설정은 저장하지 못했습니다');
    }
    return coverFlags;
  }

  async function handleUpload() {
    if (!pages.length || busy) return;
    
    // PDF 업로드인 경우와 이미지 업로드인 경우를 구분
    const isPdfUpload = allPdfPages.length > 0;
    const uploadPages = isPdfUpload ? allPdfPages : pages.map(p => p.dataUrl);
    
    // appendToEnd 체크박스 상태 확인 (PDF step에서만 표시됨)
    const actualInsertAfterPage = 
      existingCount > 0 && !appendToEnd ? insertAfterPage : null;
    const actualStartPage = 
      actualInsertAfterPage != null ? actualInsertAfterPage + 1 : existingCount + 1;
    const actualNeedsShift = 
      actualInsertAfterPage != null && actualInsertAfterPage < existingCount;
    
    uploadStarted = true;
    closeModal();
    busy = true;
    updateUploadEnabled();

    const total = uploadPages.length;
    let uploadedCount = 0;
    let stage = actualNeedsShift ? 'shift' : 'pages';
    let failedPageIndex = -1;

    showUploadingOverlay({
      message: `페이지 업로드 중… 0/${total}`,
      current: 0,
      total
    });

    try {
      if (actualNeedsShift) {
        showUploadingOverlay('뒤 페이지 번호를 갱신하는 중…');
        await shiftPagesAfter({
          folder: canonicalFolder,
          afterPage: actualInsertAfterPage,
          shiftBy: total,
          pageCount: existingCount
        });
        stage = 'pages';
      }

      for (let i = 0; i < uploadPages.length; i += 1) {
        const pageNumber = actualStartPage + i;
        stage = 'pages';
        failedPageIndex = i;
        showUploadingOverlay({
          message: `페이지 업로드 중… ${i + 1}/${total}`,
          current: i + 1,
          total
        });
        await uploadPageImage({
          file: uploadPages[i],
          noteName,
          pageNumber,
          publicId: notePublicId,
          visible: !allPagesPrivate
        });
        uploadedCount += 1;
      }

      const newPageCount = existingCount + uploadedCount;
      if (noteId) markNoteUnseen(noteId);
      clearNotesCaches();
      const coverFlags = await saveCoverFlagsIfNeeded();

      hideUploadingOverlay();
      const donePayload = {
        id: noteId,
        publicId: notePublicId,
        pageCount: newPageCount,
        insertAfterPage: actualInsertAfterPage,
        insertedCount: uploadedCount,
        ...coverFlags
      };
      if (fromNewNote) {
        options.onDone?.(donePayload);
        settle();
      } else {
        openUploadResultDialog({
          title: '업로드 완료',
          message: actualNeedsShift
            ? `${uploadedCount}페이지를 ${actualInsertAfterPage}페이지 다음에 추가했습니다.`
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
        const coverFlags = await saveCoverFlagsIfNeeded();
        options.onDone?.({
          id: noteId,
          publicId: notePublicId,
          pageCount: existingCount + uploadedCount,
          insertAfterPage: actualInsertAfterPage,
          insertedCount: uploadedCount,
          partial: true,
          ...coverFlags
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
      totalPdfPages = 0;
      allPdfPages = [];
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
    if (!(input instanceof HTMLInputElement)) return;
    if (input.type === 'checkbox') {
      if (input.name === 'firstPageIsCover') firstPageIsCover = input.checked;
      if (input.name === 'lastPageIsCover') lastPageIsCover = input.checked;
      if (input.name === 'appendToEnd') appendToEnd = input.checked;
      if (input.name === 'allPagesPrivate') allPagesPrivate = input.checked;
      return;
    }
    if (input.type !== 'file') return;
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
