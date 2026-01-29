/**
 * TimelineScrollBar 컴포넌트
 * Timeline 페이지에서 사용하는 가로 스크롤바입니다.
 */

import { periodOptions } from '../data/notesData.js';
import './TimelineScrollBar.css';

export function renderTimelineScrollBar(totalNotesCount, notesCountByPeriod) {
  const container = document.getElementById('timeline-scrollbar');
  if (!container) return;

  const dotSpreadPercent = 50;
  const dotSpreadFactor = dotSpreadPercent / 100;
  const dotSpreadOffset = (100 - dotSpreadPercent) / 2;

  // 전체 노트 개수와 period별 노트 개수로 눈금 생성 (노트 1개당 1개 눈금)
  let marksHTML = '';
  let noteIndex = 0; // 전체 노트 인덱스 추적
  if (totalNotesCount > 0 && notesCountByPeriod) {
    let currentPosition = 0;
    const widthPerNote = 100 / totalNotesCount; // 각 노트의 위치 비율
    
    periodOptions.forEach(period => {
      const count = notesCountByPeriod[period.value] || 0;
      if (count > 0) {
        // 각 노트마다 점 생성 (data-note-index 추가)
        for (let i = 0; i < count; i++) {
          const dotPosition = dotSpreadOffset
            + (currentPosition + widthPerNote / 2) * dotSpreadFactor;
          marksHTML += `<div class="scrollbar-dot" data-note-index="${noteIndex}" style="left: ${dotPosition}%;"></div>`;
          currentPosition += widthPerNote;
          noteIndex++;
        }
      }
    });
  }

  container.innerHTML = `
    <div class="timeline-scrollbar">
      <div class="scrollbar-track">
        <div class="scrollbar-dots">
          ${marksHTML}
        </div>
      </div>
    </div>
  `;
}

