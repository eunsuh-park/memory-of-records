/**
 * body에 붙는 일시 오버레이(Dialog · PDF 뷰어)를 닫는다.
 * 라우트 전환 시 #main-content만 바뀌면 이들이 남아 로그인 등을 가리는 문제를 막는다.
 */
export function dismissTransientOverlays() {
  const dialogs = [...document.querySelectorAll('.dialog')];
  for (const dialog of dialogs.reverse()) {
    const closeBtn = dialog.querySelector('.dialog__close');
    if (closeBtn instanceof HTMLElement) {
      closeBtn.click();
    } else {
      dialog.remove();
    }
  }
  if (!document.querySelector('.dialog')) {
    document.body.classList.remove('dialog-open');
  }

  const pdfClose = document.querySelector('.pdf-modal-overlay .pdf-modal-close');
  if (pdfClose instanceof HTMLElement) {
    pdfClose.click();
    return;
  }

  document.querySelectorAll('.pdf-modal-overlay').forEach((el) => el.remove());
  document.body.classList.remove('pdf-modal-open');
}
