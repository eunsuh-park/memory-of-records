/**
 * 페이지 추가 모달
 * - PDF → JPEG 변환 후 notebooks/{public_id}/pages 에 업로드
 * - 이미지도 같은 폼에서 변환·미리보기
 */

import { render as renderButton } from '../Button/Button.js';
import { open as openDialog, render as renderDialog } from '../Dialog/Dialog.js';
import {
  render as renderConfirm,
  renderBody as renderConfirmBody,
  open as openConfirm
} from '../Confirm/Confirm.js';
import {
  openUploadResultDialog,
  shortUploadError
} from '../Dialog/uploadResultDialog.js';
import { render as renderField, setStatus as setFormStatus } from '../FormField/FormField.js';
import {
  renderPicker as renderFilePicker,
  renderList as renderUploadList,
  setPickerMeta
} from '../FileUploadPreview/FileUploadPreview.js';
import { showToast } from '../Toast/Toast.js';
import {
  hideUploadingOverlay,
  showUploadingOverlay
} from '../AddNoteFab/uploadOverlay.js';
import {
  convertImageDataUrlToJpeg,
  convertPdfFileToJpegDataUrls,
  MAX_IMAGE_COUNT,
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

function uploadActionLabel(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  return n ? `${n}페이지 추가하기` : '페이지 추가하기';
}

function formatFileSize(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) {
    const mb = n / (1024 * 1024);
    return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)}MB`;
  }
  if (n >= 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${n}B`;
}

function sourceOptionsHtml() {
  return `
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
    </div>`;
}

/**
 * 페이지 추가 모달 본문. openAddPageModal과 /ui-lab 정적 데모가 같은 마크업을 쓴다.
 *
 * @param {{
 *   step?: 'pick'|'form',
 *   source?: 'pdf'|'images',
 *   existingCount?: number,
 *   pages?: { id: string, dataUrl: string, label?: string, pageNumber?: number }[],
 *   startPage?: number,
 *   appendToEnd?: boolean,
 *   allPagesPrivate?: boolean,
 *   firstPageIsCover?: boolean,
 *   lastPageIsCover?: boolean,
 *   showFirstCoverCheck?: boolean,
 *   showLastCoverCheck?: boolean,
 *   uploadDisabled?: boolean,
 *   uploadCount?: number,
 *   status?: string,
 *   statusError?: boolean,
 *   fileName?: string,
 *   fileSize?: string,
 *   fileChip?: ''|'converting'|'done'
 * }} [options]
 * @returns {string}
 */
export function renderAddPageBody(options = {}) {
  const {
    step = 'pick',
    source = 'pdf',
    existingCount = 0,
    pages = [],
    startPage = 1,
    appendToEnd = true,
    allPagesPrivate = false,
    firstPageIsCover = true,
    lastPageIsCover = true,
    showFirstCoverCheck = false,
    showLastCoverCheck = false,
    uploadDisabled = true,
    uploadCount = 0,
    status = '',
    statusError = false,
    fileName = '',
    fileSize = '',
    fileChip = ''
  } = options;

  if (step === 'pick') {
    return renderConfirmBody({
      message: '추가할 파일 유형을 선택하세요.',
      showActions: false,
      bodyHtml: sourceOptionsHtml()
    });
  }

  const isImages = source === 'images';
  const statusClass = [
    'form-status',
    'form-status--footer',
    'add-page-status',
    statusError ? 'form-status--error' : ''
  ]
    .filter(Boolean)
    .join(' ');
  const statusHtml = `<p class="${statusClass}" role="status"${status ? '' : ' hidden'}>${escapeHtml(
    status
  )}</p>`;
  const coverHint =
    showFirstCoverCheck || showLastCoverCheck
      ? `<p class="add-page-cover-hint">첫·마지막 장이 표지가 아니면, 노트에 올린 표지 이미지가 뷰어의 첫/마지막 페이지로 들어갑니다.</p>`
      : '';
  const listClass = ['upload-list', pages.length === 2 ? 'upload-list--pair' : '']
    .filter(Boolean)
    .join(' ');
  const previewList = `<ul class="${listClass}"${pages.length ? '' : ' hidden'}>${
    pages.length
      ? renderUploadList(pages, {
          startPage,
          showActions: false,
          coverChecks:
            showFirstCoverCheck || showLastCoverCheck
              ? {
                  showFirst: showFirstCoverCheck,
                  showLast: showLastCoverCheck,
                  firstChecked: firstPageIsCover,
                  lastChecked: lastPageIsCover
                }
              : null
        })
      : ''
  }</ul>`;
  const footer = `
    <div class="dialog-actions dialog-actions--stack add-page-footer">
      ${renderButton({
        shape: 'text',
        block: true,
        content: '뒤로',
        className: 'add-page-secondary',
        dataset: { action: 'back' }
      })}
      ${renderButton({
        shape: 'solid',
        content: uploadActionLabel(uploadCount),
        className: 'add-page-submit',
        dataset: { action: 'upload' },
        disabled: uploadDisabled
      })}
    </div>`;
  const privateCheck = `
    <label class="form-check add-page-private-check">
      <input type="checkbox" name="allPagesPrivate" ${allPagesPrivate ? 'checked' : ''} />
      <span>모든 페이지를 비공개로 설정</span>
    </label>`;
  const appendCheck =
    existingCount > 0
      ? `<label class="form-check add-page-append-check">
          <input type="checkbox" name="appendToEnd" ${appendToEnd ? 'checked' : ''} />
          <span>이 페이지들을 제일 뒤에 붙이기</span>
        </label>`
      : '';

  return `
    ${renderField({
      type: 'custom',
      label: isImages ? '이미지 파일' : 'PDF 파일',
      required: true,
      hint: '50mb 이하',
      hintInline: true,
      children: renderFilePicker({
        name: 'pageFile',
        pickLabel: '파일 선택',
        accept: isImages
          ? 'image/png,image/jpeg,image/jpg,image/gif,.png,.jpg,.jpeg,.gif'
          : 'application/pdf,.pdf',
        multiple: isImages,
        fileName,
        fileSize,
        chip: fileChip
      })
    })}
    ${previewList}
    ${appendCheck}
    ${privateCheck}
    ${coverHint}
    ${statusHtml}
    ${footer}`;
}

/**
 * Dialog 껍데기까지 포함한 페이지 추가 모달 마크업.
 *
 * @param {Parameters<typeof renderAddPageBody>[0] & { titleId?: string, className?: string }} [options]
 * @returns {string}
 */
export function renderAddPageModal(options = {}) {
  const step = options.step || 'pick';
  if (step === 'pick') {
    return renderConfirm({
      title: '페이지 추가',
      titleId: options.titleId || 'add-page-title',
      className: ['add-page-dialog', options.className].filter(Boolean).join(' '),
      panelClassName: 'add-page-panel',
      showActions: false,
      message: '추가할 파일 유형을 선택하세요.',
      bodyHtml: sourceOptionsHtml()
    });
  }
  return renderDialog({
    title: '페이지 추가',
    titleId: options.titleId || 'add-page-title',
    className: ['add-page-dialog', options.className].filter(Boolean).join(' '),
    panelClassName: 'add-page-panel',
    bodyHtml: `<div class="add-page-body">${renderAddPageBody(options)}</div>`
  });
}

/**
 * 「페이지를 추가할까요?」 확인 모달 본문.
 *
 * @param {{ noteName?: string }} [options]
 * @returns {string}
 */
export function renderAddPagesConfirmBody(options = {}) {
  const noteName = String(options.noteName || '').trim();
  const nameBit = noteName
    ? `<strong>${escapeHtml(noteName)}</strong> 노트에 `
    : '';
  return renderConfirmBody({
    messageHtml: `${nameBit}본문 페이지(PDF/이미지)를 지금 추가할 수 있습니다.`
  });
}

/**
 * 「페이지를 추가할까요?」 확인 모달 전체 마크업.
 *
 * @param {{ noteName?: string, titleId?: string, className?: string }} [options]
 * @returns {string}
 */
export function renderAddPagesConfirm(options = {}) {
  const noteName = String(options.noteName || '').trim();
  const nameBit = noteName
    ? `<strong>${escapeHtml(noteName)}</strong> 노트에 `
    : '';
  return renderConfirm({
    title: '페이지를 추가할까요?',
    titleId: options.titleId || 'add-page-confirm-title',
    className: ['add-page-confirm-dialog', options.className].filter(Boolean).join(' '),
    messageHtml: `${nameBit}본문 페이지(PDF/이미지)를 지금 추가할 수 있습니다.`
  });
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
  if (document.body.querySelector(':scope > .add-page-dialog')) {
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

  /** @type {'pick'|'form'} */
  let step = 'pick';
  /** @type {'pdf'|'images'} */
  let source = 'pdf';
  /** @type {{ id: string, dataUrl: string, label?: string, pageNumber?: number }[]} */
  let pages = [];
  /** PDF/이미지 전체 페이지 dataUrl (업로드용). PDF는 전 장, 미리보기는 첫·마지막만 */
  let allPdfPages = [];
  let selectedFileName = '';
  let selectedFileSize = '';
  /** @type {''|'converting'|'done'} */
  let fileChip = '';
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
    setFormStatus(overlay.querySelector('.add-page-status'), isError ? message : '', isError);
  }

  function syncFileRow() {
    setPickerMeta(overlay, {
      fileName: selectedFileName,
      fileSize: selectedFileSize,
      chip: fileChip
    });
    const clearBtn = overlay.querySelector('[data-action="clear-file"]');
    if (clearBtn) clearBtn.disabled = busy;
  }

  function previewCount() {
    return allPdfPages.length || pages.length;
  }

  function formBodyOptions() {
    return {
      step,
      source,
      existingCount,
      pages,
      startPage,
      appendToEnd,
      allPagesPrivate,
      firstPageIsCover,
      lastPageIsCover,
      showFirstCoverCheck,
      showLastCoverCheck,
      uploadDisabled: pages.length === 0 || busy,
      uploadCount: previewCount(),
      fileName: selectedFileName,
      fileSize: selectedFileSize,
      fileChip
    };
  }

  function renderPreviewList() {
    const list = overlay.querySelector('.upload-list');
    if (!list) return;
    list.hidden = pages.length === 0;
    list.classList.toggle('upload-list--pair', pages.length === 2);
    list.innerHTML = renderUploadList(pages, {
      startPage,
      showActions: false,
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
    body.innerHTML = renderAddPageBody(formBodyOptions());
  }

  function updateUploadEnabled() {
    const btn = overlay.querySelector('[data-action="upload"]');
    if (!btn) return;
    btn.disabled = pages.length === 0 || busy;
    btn.textContent = uploadActionLabel(previewCount());
  }

  function resetSelectedFile() {
    pages = [];
    allPdfPages = [];
    selectedFileName = '';
    selectedFileSize = '';
    fileChip = '';
    const input = overlay.querySelector('input[name="pageFile"]');
    if (input) input.value = '';
    renderPreviewList();
    syncFileRow();
    updateUploadEnabled();
    setStatus('');
  }

  async function handlePdfSelected(file) {
    if (!file) return;
    selectedFileName = String(file.name || 'PDF').trim() || 'PDF';
    selectedFileSize = formatFileSize(file.size);
    fileChip = 'converting';
    syncFileRow();

    const validated = validatePdfFile(file);
    if (!validated.ok) {
      setStatus(validated.message, true);
      resetSelectedFile();
      return;
    }

    setStatus('');
    busy = true;
    updateUploadEnabled();
    syncFileRow();
    try {
      const dataUrls = await convertPdfFileToJpegDataUrls(file);
      if (dataUrls.length === 0) {
        throw new Error('PDF에 페이지가 없습니다');
      }
      allPdfPages = dataUrls;
      if (dataUrls.length === 1) {
        pages = [{
          id: `pdf-${Date.now()}-0`,
          dataUrl: dataUrls[0],
          pageNumber: 1
        }];
      } else {
        pages = [
          {
            id: `pdf-${Date.now()}-0`,
            dataUrl: dataUrls[0],
            pageNumber: 1
          },
          {
            id: `pdf-${Date.now()}-${dataUrls.length - 1}`,
            dataUrl: dataUrls[dataUrls.length - 1],
            pageNumber: dataUrls.length
          }
        ];
      }
      fileChip = 'done';
      renderPreviewList();
      syncFileRow();
    } catch (err) {
      console.error('[AddPage] PDF convert', err);
      resetSelectedFile();
      setStatus(err?.message || 'PDF 변환에 실패했습니다', true);
    } finally {
      busy = false;
      updateUploadEnabled();
      syncFileRow();
    }
  }

  async function handleImagesSelected(fileList) {
    const validated = validateImageFiles(fileList, { maxAdditional: MAX_IMAGE_COUNT });
    if (!validated.ok) {
      setStatus(validated.message, true);
      const input = overlay.querySelector('input[name="pageFile"]');
      if (input) input.value = '';
      return;
    }
    const files = validated.files;
    selectedFileName =
      files.length === 1
        ? String(files[0].name || '이미지').trim() || '이미지'
        : `${files.length}장 선택됨`;
    selectedFileSize = files.length === 1 ? formatFileSize(files[0].size) : '';
    fileChip = 'converting';
    syncFileRow();
    setStatus('');
    busy = true;
    updateUploadEnabled();
    try {
      const dataUrls = await Promise.all(files.map((f) => readFileAsDataUrl(f)));
      const jpegUrls = await Promise.all(dataUrls.map((url) => convertImageDataUrlToJpeg(url)));
      const stamp = Date.now();
      allPdfPages = jpegUrls;
      if (jpegUrls.length === 1) {
        pages = [{ id: `img-${stamp}-0`, dataUrl: jpegUrls[0], pageNumber: 1 }];
      } else {
        pages = [
          { id: `img-${stamp}-0`, dataUrl: jpegUrls[0], pageNumber: 1 },
          {
            id: `img-${stamp}-${jpegUrls.length - 1}`,
            dataUrl: jpegUrls[jpegUrls.length - 1],
            pageNumber: jpegUrls.length
          }
        ];
      }
      fileChip = 'done';
      renderPreviewList();
      syncFileRow();
    } catch (err) {
      console.error('[AddPage] image read', err);
      resetSelectedFile();
      setStatus(err?.message || '이미지를 읽지 못했습니다', true);
    } finally {
      busy = false;
      updateUploadEnabled();
      syncFileRow();
      const input = overlay.querySelector('input[name="pageFile"]');
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
      source = sourceBtn.getAttribute('data-source') === 'pdf' ? 'pdf' : 'images';
      step = 'form';
      resetSelectedFile();
      renderBody();
      return;
    }

    const actionBtn = e.target?.closest?.('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-action');

    if (action === 'back') {
      if (busy) return;
      step = 'pick';
      resetSelectedFile();
      renderBody();
      return;
    }
    if (action === 'clear-file') {
      if (busy) return;
      resetSelectedFile();
      return;
    }
    if (action === 'upload') {
      handleUpload();
    }
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
    if (input.name === 'pageFile') {
      if (source === 'pdf') handlePdfSelected(input.files?.[0] || null);
      else handleImagesSelected(input.files);
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
  if (document.body.querySelector(':scope > .add-page-confirm-dialog')) {
    options.onCancel?.();
    return;
  }

  const noteName = String(options.note?.title || options.note?.name || '').trim();
  const nameBit = noteName ? `<strong>${escapeHtml(noteName)}</strong> 노트에 ` : '';

  openConfirm({
    title: '페이지를 추가할까요?',
    titleId: 'add-page-confirm-title',
    className: 'add-page-confirm-dialog',
    messageHtml: `${nameBit}본문 페이지(PDF/이미지)를 지금 추가할 수 있습니다.`,
    onConfirm: () => options.onConfirm?.(),
    onCancel: () => options.onCancel?.()
  });
}
