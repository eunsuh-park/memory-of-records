/**
 * 페이지 추가 모달
 * - PDF → JPEG 변환 후 Cloudinary Content 폴더 업로드
 * - 이미지 1~10장 (순서 변경·삭제)
 */

import { render as renderButton } from '../Button/Button.js';
import { open as openDialog } from '../Dialog/Dialog.js';
import {
  openUploadResultDialog,
  shortUploadError
} from '../Dialog/uploadResultDialog.js';
import { render as renderField } from '../FormField/FormField.js';
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
  updateNotionNotePages,
  uploadPageImage,
  validateImageFiles,
  validatePdfFile
} from '../../services/pages.js';
import { clearNotionNotebooksCache } from '../../services/notionNotebooks.js';
import { clearNotionTypeItemsCache } from '../../services/notionByType.js';
import { markNoteUnseen } from '../../utils/unseenNotes.js';
import { requireAuth } from '../../services/auth.js';
import '../AddNoteFab/AddNoteFab.css';
import './AddPageModal.css';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {{
 *   uploadedCount: number,
 *   total: number,
 *   stage: 'shift' | 'pages' | 'link',
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
    title: '일부만 저장됨',
    message: `${coverPrefix}이미지는 올렸지만 노트 장수 정보를 저장하지 못했습니다.`,
    detail: reason
  };
}

/**
 * @param {{
 *   note: { id?: string, title?: string, name?: string, pdfFolderUrl?: string, pageCount?: number },
 *   insertAfterPage?: number,
 *   fromNewNote?: boolean,
 *   onDone?: (result?: object) => void
 * }} [options]
 */
export async function openAddPageModal(options = {}) {
  if (document.querySelector('.add-page-dialog')) return;
  if (!(await requireAuth())) return;

  const note = options.note || {};
  const noteId = String(note.id || '').trim();
  const noteName = String(note.title || note.name || '').trim();
  const existingFolder = String(note.pdfFolderUrl || '').trim();
  const existingCount = Math.max(0, Math.floor(Number(note.pageCount) || 0));
  const fromNewNote = Boolean(options.fromNewNote);
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

  const dialog = openDialog({
    title: '페이지 추가',
    titleId: 'add-page-title',
    className: 'add-page-dialog',
    panelClassName: 'add-page-panel',
    canClose: () => !busy,
    bodyHtml: '<div class="add-page-body"></div>'
  });
  const overlay = dialog.overlay;
  const closeModal = dialog.close;

  function setStatus(message, isError = false) {
    const el = overlay.querySelector('.add-page-status');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('form-status--error', Boolean(isError));
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
          <button type="button" class="add-page-source-btn" data-source="pdf">
            <span class="add-page-source-title">PDF</span>
            <span class="add-page-source-desc">자동으로 JPEG로 변환해 업로드</span>
          </button>
          <button type="button" class="add-page-source-btn" data-source="images">
            <span class="add-page-source-title">이미지</span>
            <span class="add-page-source-desc">PNG, JPEG, JPG, GIF · 1~${MAX_IMAGE_COUNT}장</span>
          </button>
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
          <button type="button" class="add-page-secondary" data-action="back">뒤로</button>
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
        <button type="button" class="add-page-secondary" data-action="back">뒤로</button>
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

  /**
   * Cloudinary 업로드와 Notion pdf_folder_url/page_count를 최대한 같이 맞춘다.
   * 중간에 끊겨도 이미 올라간 장수만큼 Notion에 남겨 "Load Failed"를 막는다.
   */
  async function linkNotePages(folderUrl, pageCount, { required = true } = {}) {
    if (!noteId || !folderUrl || !Number.isFinite(pageCount) || pageCount < 1) {
      if (required) {
        throw new Error('노트 페이지 정보를 갱신할 수 없습니다');
      }
      return null;
    }
    const attempts = required ? 3 : 1;
    let lastError = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await updateNotionNotePages({
          id: noteId,
          pdfFolderUrl: folderUrl,
          pageCount
        });
      } catch (err) {
        lastError = err;
        console.warn(`[AddPage] Notion link attempt ${attempt}/${attempts}`, err);
        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
        }
      }
    }
    if (required) throw lastError || new Error('노트 페이지 정보 갱신에 실패했습니다');
    return null;
  }

  async function handleUpload() {
    if (!pages.length || busy) return;
    closeModal();
    busy = true;
    updateUploadEnabled();

    const total = pages.length;
    let folderUrl = existingFolder;
    let folderPath = existingFolder;
    let uploadedCount = 0;
    let linkedCount = existingCount;
    let updated = null;
    let stage = needsShift ? 'shift' : 'pages';
    let failedPageIndex = -1;

    showUploadingOverlay({
      message: `페이지 업로드 중… 0/${total}`,
      current: 0,
      total
    });

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
        const result = await uploadPageImage({
          file: pages[i].dataUrl,
          noteName,
          pageNumber,
          folder: folderPath || undefined
        });
        if (!folderUrl && result.folderUrl) folderUrl = result.folderUrl;
        if (result.folder) folderPath = result.folder;
        uploadedCount += 1;

        /* 첫 장부터 Notion에 폴더 URL을 심어 부분 실패 시에도 뷰어가 열리게 한다 */
        if (folderUrl) {
          const runningCount = existingCount + uploadedCount;
          const isFirstLink = linkedCount === existingCount && existingCount === 0;
          const linking = isFirstLink || i === pages.length - 1;
          if (linking) {
            stage = 'link';
            showUploadingOverlay({
              message: '노트 정보를 갱신하는 중…',
              current: i + 1,
              total
            });
          } else {
            showUploadingOverlay({
              message: `페이지 업로드 중… ${i + 1}/${total}`,
              current: i + 1,
              total
            });
          }
          const linkResult = await linkNotePages(folderUrl, runningCount, {
            required: linking
          });
          if (linkResult) {
            updated = linkResult;
            linkedCount = runningCount;
          }
        }
      }

      if (!folderUrl) {
        throw new Error('업로드된 페이지 폴더 URL을 확인하지 못했습니다');
      }

      const newPageCount = existingCount + uploadedCount;
      if (linkedCount !== newPageCount) {
        stage = 'link';
        showUploadingOverlay({
          message: '노트 정보를 갱신하는 중…',
          current: total,
          total
        });
        updated = await linkNotePages(folderUrl, newPageCount, { required: true });
        linkedCount = newPageCount;
      }

      if (noteId) markNoteUnseen(noteId);
      clearNotionNotebooksCache();
      clearNotionTypeItemsCache();
      hideUploadingOverlay();
      openUploadResultDialog({
        title: '업로드 완료',
        message: needsShift
          ? `${uploadedCount}페이지를 ${insertAfterPage}페이지 다음에 추가했습니다.`
          : `${uploadedCount}페이지가 추가되었습니다.`
      });
      options.onDone?.({
        ...(updated || {}),
        id: noteId,
        pdfFolderUrl: folderUrl,
        pageCount: linkedCount,
        insertAfterPage,
        insertedCount: uploadedCount
      });
    } catch (err) {
      console.error('[AddPage] upload', err);
      /* Cloudinary까지 올라간 장수가 있으면 Notion에 부분 반영 시도 */
      if (folderUrl && uploadedCount > 0 && linkedCount < existingCount + uploadedCount) {
        try {
          updated = await linkNotePages(folderUrl, existingCount + uploadedCount, {
            required: false
          });
          if (updated) linkedCount = existingCount + uploadedCount;
        } catch (linkErr) {
          console.warn('[AddPage] partial Notion link failed', linkErr);
        }
      }
      hideUploadingOverlay();
      const result = describePageUploadFailure({
        uploadedCount,
        total,
        stage,
        failedPageIndex,
        fromNewNote,
        error: err
      });
      const savedSome = folderUrl && uploadedCount > 0 && linkedCount > existingCount;
      if (savedSome) {
        if (noteId) markNoteUnseen(noteId);
        clearNotionNotebooksCache();
        clearNotionTypeItemsCache();
        options.onDone?.({
          ...(updated || {}),
          id: noteId,
          pdfFolderUrl: folderUrl,
          pageCount: linkedCount,
          insertAfterPage,
          insertedCount: linkedCount - existingCount,
          partial: true
        });
      }
      openUploadResultDialog(result);
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
    panelClassName: 'add-page-confirm-panel',
    showClose: false,
    bodyHtml: `
      <p class="add-page-confirm-text">
        ${noteName ? `<strong>${escapeHtml(noteName)}</strong> 노트에 ` : ''}본문 페이지(PDF/이미지)를 지금 추가할 수 있습니다.
      </p>
      <div class="add-page-confirm-actions">
        <button type="button" class="add-page-secondary" data-choice="later">나중에</button>
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
