/**
 * 표지·페이지 업로드 중 전체 화면 오버레이 (Lottie + 문구 + 선택적 진행바)
 * 같은 오버레이를 재사용해 Lottie가 장마다 다시 시작되지 않게 한다.
 */

import uploadingLottieUrl from '../../assets/uploading.json?url';
import './uploadOverlay.css';

/**
 * @param {string | { message?: string, current?: number, total?: number }} messageOrOptions
 */
export function showUploadingOverlay(messageOrOptions = '업로드하는 중…') {
  const opts =
    typeof messageOrOptions === 'string'
      ? { message: messageOrOptions }
      : messageOrOptions || {};
  const message = opts.message || '업로드하는 중…';
  const current = Number(opts.current);
  const total = Number(opts.total);
  const hasProgress = Number.isFinite(current) && Number.isFinite(total) && total > 0;

  let overlay = document.querySelector('.add-note-upload-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
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
      <p class="add-note-upload-text"></p>
      <div
        class="add-note-upload-progress"
        hidden
        role="progressbar"
        aria-valuemin="0"
        aria-valuenow="0"
        aria-valuemax="1"
      >
        <div class="add-note-upload-progress__fill"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add('add-note-uploading');
  }

  const text = overlay.querySelector('.add-note-upload-text');
  if (text) text.textContent = message;

  const progress = overlay.querySelector('.add-note-upload-progress');
  if (!progress) return;

  if (hasProgress) {
    const pct = Math.max(0, Math.min(100, (current / total) * 100));
    progress.hidden = false;
    progress.setAttribute('aria-valuenow', String(current));
    progress.setAttribute('aria-valuemax', String(total));
    progress.style.setProperty('--upload-progress', `${pct}%`);
  } else {
    progress.hidden = true;
  }
}

export function hideUploadingOverlay() {
  document.querySelectorAll('.add-note-upload-overlay').forEach((el) => el.remove());
  document.body.classList.remove('add-note-uploading');
}
