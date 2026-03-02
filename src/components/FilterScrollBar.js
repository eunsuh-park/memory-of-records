/**
 * FilterScrollBar - Timeline / By Type 공통 스크롤바
 * TimelineScrollBar + TypeScrollBar 통합
 */

import './TimelineScrollBar.css';

const DOT_SPREAD_PERCENT = 50;
const DOT_SPREAD_FACTOR = DOT_SPREAD_PERCENT / 100;
const DOT_SPREAD_OFFSET = (100 - DOT_SPREAD_PERCENT) / 2;

/**
 * @param {number} noteCount - 표시할 노트 개수
 * @param {number} [activeIndex=0] - 활성화할 점의 인덱스 (0-based)
 */
export function renderFilterScrollBar(noteCount, activeIndex = 0) {
  const container = document.getElementById('timeline-scrollbar');
  if (!container) return;

  let marksHTML = '';
  if (noteCount > 0) {
    const widthPerNote = 100 / noteCount;
    for (let i = 0; i < noteCount; i++) {
      const leftPercent =
        DOT_SPREAD_OFFSET + (i + 0.5) * (widthPerNote * DOT_SPREAD_FACTOR);
      const isActive = i === activeIndex;
      marksHTML += `<div class="scrollbar-dot ${isActive ? 'scrollbar-dot--active' : ''}" data-note-index="${i}" style="left: ${leftPercent}%;"></div>`;
    }
  }

  container.innerHTML = `
    <div class="timeline-scrollbar filter-scrollbar">
      <div class="scrollbar-track">
        <div class="scrollbar-dots">
          ${marksHTML}
        </div>
      </div>
    </div>
  `;
}

/**
 * 스크롤바 점의 활성 상태 업데이트
 * @param {number} activeIndex - 활성화할 점의 인덱스 (0-based)
 */
export function updateFilterScrollBarActive(activeIndex) {
  const dots = document.querySelectorAll('.scrollbar-dot');
  dots.forEach((dot) => {
    const dotIndex = parseInt(dot.getAttribute('data-note-index'), 10);
    dot.classList.toggle('scrollbar-dot--active', dotIndex === activeIndex);
  });
}
