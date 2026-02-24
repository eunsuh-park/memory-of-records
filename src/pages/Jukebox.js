/**
 * Jukebox 페이지
 * Timeline과 동일한 노트 커버 이미지를 jukebox CSS 애니메이션 스타일로 표시합니다.
 * 삭제 시: router.js에서 라우트 제거, 본 파일 및 Jukebox.css 삭제하면 됩니다.
 */

import { getNotionNotebooks } from '../utils/notionNotebooks.js';
import './Jukebox.css';

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderJukebox() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.className = 'app-main jukebox-active';
  const mainWrapper = mainContent.closest('.main-wrapper');
  if (mainWrapper) {
    mainWrapper.classList.add('jukebox-active');
  }
  document.body.classList.add('jukebox-active');

  mainContent.innerHTML = `
    <div class="jukebox-page">
      <div class="jukebox-frame">
        <div class="jukebox-window">
          <div class="jukebox-slot">
            <div class="jukebox-slot-inner">
              <div class="jukebox-loading">노트를 불러오는 중...</div>
            </div>
          </div>
        </div>
        <div class="jukebox-controls">
          <button type="button" class="jukebox-btn jukebox-prev" aria-label="이전">‹</button>
          <span class="jukebox-counter"><span class="jukebox-current">1</span> / <span class="jukebox-total">0</span></span>
          <button type="button" class="jukebox-btn jukebox-next" aria-label="다음">›</button>
        </div>
      </div>
    </div>
  `;

  let currentIndex = 0;
  let notes = [];

  const slotInner = mainContent.querySelector('.jukebox-slot-inner');
  const currentEl = mainContent.querySelector('.jukebox-current');
  const totalEl = mainContent.querySelector('.jukebox-total');
  const prevBtn = mainContent.querySelector('.jukebox-prev');
  const nextBtn = mainContent.querySelector('.jukebox-next');

  function showSlide(index, direction = 'next') {
    if (!notes.length) return;
    const safeIndex = ((index % notes.length) + notes.length) % notes.length;
    currentIndex = safeIndex;
    const note = notes[safeIndex];
    const coverSrc = note.coverFrontUrl || TRANSPARENT_PIXEL;
    const title = escapeHtml(note.title);

    slotInner.classList.remove('jukebox-slide-in-next', 'jukebox-slide-in-prev');
    slotInner.offsetHeight;
    slotInner.classList.add(direction === 'next' ? 'jukebox-slide-in-next' : 'jukebox-slide-in-prev');

    slotInner.innerHTML = `
      <img 
        src="${escapeHtml(coverSrc)}" 
        alt="${title}" 
        class="jukebox-cover-image"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
      <p class="jukebox-cover-title">${title}</p>
    `;

    currentEl.textContent = String(safeIndex + 1);
    totalEl.textContent = String(notes.length);

    slotInner.querySelector('.jukebox-cover-image')?.addEventListener('error', () => {
      slotInner.querySelector('.jukebox-cover-image')?.classList.add('jukebox-cover-image--error');
    }, { once: true });
  }

  prevBtn?.addEventListener('click', () => {
    showSlide(currentIndex - 1, 'prev');
  });
  nextBtn?.addEventListener('click', () => {
    showSlide(currentIndex + 1, 'next');
  });

  getNotionNotebooks()
    .then((notebooks) => {
      if (!Array.isArray(notebooks) || notebooks.length === 0) {
        slotInner.innerHTML = '<div class="jukebox-empty">표시할 노트가 없습니다.</div>';
        totalEl.textContent = '0';
        return;
      }
      notes = notebooks;
      totalEl.textContent = String(notes.length);
      showSlide(0, 'next');
    })
    .catch((err) => {
      console.warn('Jukebox: 노트 로드 실패', err);
      slotInner.innerHTML = '<div class="jukebox-empty">노트를 불러올 수 없습니다.</div>';
      totalEl.textContent = '0';
    });
}
