/**
 * NoteDetail 페이지
 * 노트 상세 내용을 표시하는 페이지입니다.
 */

import { getNoteById, getAdjacentNotes } from '../data/notesData.js';
import { router } from '../router.js';
import { getCoverImagePath } from '../utils/coverImage.js';
import './NoteDetailPage.css';
import '../components/NoteDetail.css';

export function renderNoteDetail(id) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const note = getNoteById(id);
  
  if (!note) {
    mainContent.innerHTML = `
      <div class="note-detail-page">
        <div class="note-detail">
          <div class="note-error">
            <p>노트를 찾을 수 없습니다.</p>
            <a href="/timeline" data-link>목록으로 돌아가기</a>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const { prev, next } = getAdjacentNotes(id);
  const coverImagePath = getCoverImagePath(note);

  mainContent.innerHTML = `
    <div class="note-detail-page">
      <article class="note-detail">
        ${coverImagePath ? `
          <div class="note-cover-section">
            <img 
              src="${coverImagePath}" 
              alt="${note.title} 표지" 
              class="note-cover-image-detail"
              onerror="this.style.display='none';"
            />
          </div>
        ` : ''}
        <header class="note-header">
          <h1 class="note-title">${note.title}</h1>
          <div class="note-meta">
            <span class="note-period">${note.periodName}</span>
            <span class="note-separator">•</span>
            <span class="note-year">${note.year}년</span>
          </div>
        </header>

        <div class="note-content">
          <div class="note-text">
            ${note.content.split('\n').map(paragraph => 
              paragraph ? `<p>${paragraph}</p>` : '<br>'
            ).join('')}
          </div>

          ${note.images && note.images.length > 0 ? `
            <div class="note-images">
              ${note.images.map((image, index) => `
                <img
                  src="${image}"
                  alt="${note.title} 이미지 ${index + 1}"
                  class="note-image"
                />
              `).join('')}
            </div>
          ` : ''}
        </div>

        <nav class="note-navigation">
          <div class="note-nav-buttons">
            ${prev ? `
              <button class="nav-button prev-button">← 이전 노트</button>
            ` : ''}
            ${next ? `
              <button class="nav-button next-button">다음 노트 →</button>
            ` : ''}
          </div>

          <div class="note-back-button">
            <button class="back-button">목록으로 돌아가기</button>
          </div>
        </nav>
      </article>
    </div>
  `;

  // 이벤트 리스너
  const backButton = mainContent.querySelector('.back-button');
  if (backButton) {
    backButton.addEventListener('click', () => {
      router.navigate(`/timeline/${note.period}`);
    });
  }

  const prevButton = mainContent.querySelector('.prev-button');
  if (prevButton && prev) {
    prevButton.addEventListener('click', () => {
      router.navigate(`/note/${prev.id}`);
      window.scrollTo(0, 0);
    });
  }

  const nextButton = mainContent.querySelector('.next-button');
  if (nextButton && next) {
    nextButton.addEventListener('click', () => {
      router.navigate(`/note/${next.id}`);
      window.scrollTo(0, 0);
    });
  }
}

