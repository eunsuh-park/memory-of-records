/**
 * TypeScrollBar 컴포넌트
 * By type 페이지에서 사용하는 가로 스크롤바입니다.
 */

import { typeOptions } from '../data/typeOptions.js';
import './TimelineScrollBar.css';

/**
 * @param {number} totalNotesCount - 표시할 노트 개수 (선택 타입만일 때는 해당 타입 개수)
 * @param {Record<string,number>} notesCountByType - 타입별 개수
 * @param {string} [selectedType] - 지정 시 이 타입의 노트만 스크롤바에 표시 (인덱스 0부터)
 */
export function renderTypeScrollBar(totalNotesCount, notesCountByType, selectedType) {
  const container = document.getElementById('timeline-scrollbar');
  if (!container) return;

  const dotSpreadPercent = 50;
  const dotSpreadFactor = dotSpreadPercent / 100;
  const dotSpreadOffset = (100 - dotSpreadPercent) / 2;

  let marksHTML = '';
  let noteIndex = 0;

  if (totalNotesCount > 0 && notesCountByType) {
    if (selectedType) {
      const count = notesCountByType[selectedType] ?? 0;
      for (let i = 0; i < count; i++) {
        const leftPercent = dotSpreadOffset + ((i + 0.5) / count) * dotSpreadPercent;
        marksHTML += `<div class="scrollbar-dot" data-note-index="${i}" style="left: ${leftPercent}%;"></div>`;
      }
    } else {
      let currentPosition = 0;
      const widthPerNote = 100 / totalNotesCount;
      typeOptions.forEach((typeOption) => {
        const count = notesCountByType[typeOption.value] || 0;
        if (count > 0) {
          for (let i = 0; i < count; i++) {
            const dotPosition =
              dotSpreadOffset + (currentPosition + widthPerNote / 2) * dotSpreadFactor;
            marksHTML += `<div class="scrollbar-dot" data-note-index="${noteIndex}" style="left: ${dotPosition}%;"></div>`;
            currentPosition += widthPerNote;
            noteIndex++;
          }
        }
      });
    }
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

