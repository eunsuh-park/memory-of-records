/**
 * TimelineScrollBar 컴포넌트
 * Timeline 페이지에서 사용하는 가로 스크롤바입니다.
 */

import { periodOptions } from '../data/notesData.js';
import './TimelineScrollBar.css';

// 각 period별 색상 정의
const periodColors = {
  'elementary': '#fff9e6',
  'middle-high': '#e8f4f8',
  'university': '#f0e8f5',
  'after-graduation': '#f5f0e8'
};

export function renderTimelineScrollBar(totalNotesCount, notesCountByPeriod) {
  const container = document.getElementById('timeline-scrollbar');
  if (!container) return;

  // 전체 노트 개수와 period별 노트 개수로 눈금 생성 (노트 1개당 1개 눈금)
  let marksHTML = '';
  let noteIndex = 0; // 전체 노트 인덱스 추적
  if (totalNotesCount > 0 && notesCountByPeriod) {
    let currentPosition = 0;
    const widthPerNote = 100 / totalNotesCount; // 각 노트의 너비 비율
    
    periodOptions.forEach(period => {
      const count = notesCountByPeriod[period.value] || 0;
      if (count > 0) {
        const color = periodColors[period.value] || '#f5f5f5';
        
        // 각 노트마다 눈금 생성 (data-note-index 추가)
        for (let i = 0; i < count; i++) {
          marksHTML += `<div class="scrollbar-mark" data-note-index="${noteIndex}" style="left: ${currentPosition}%; width: ${widthPerNote}%; background-color: ${color};"></div>`;
          currentPosition += widthPerNote;
          noteIndex++;
        }
      }
    });
  }

  container.innerHTML = `
    <div class="timeline-scrollbar">
      <div class="scrollbar-track">
        <div class="scrollbar-line">
          ${marksHTML}
        </div>
        <div class="scrollbar-indicator" id="scrollbar-indicator"></div>
      </div>
    </div>
  `;
}

