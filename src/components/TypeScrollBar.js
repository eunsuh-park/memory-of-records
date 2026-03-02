/**
 * TypeScrollBar - By Type용 스크롤바 (FilterScrollBar 래퍼)
 * @deprecated FilterScrollBar를 직접 사용하세요.
 */
import { renderFilterScrollBar } from './FilterScrollBar.js';

/**
 * @param {number} totalNotesCount - 표시할 노트 개수 (선택 타입의 노트 개수)
 */
export function renderTypeScrollBar(totalNotesCount, _notesCountByType, _selectedType) {
  renderFilterScrollBar(totalNotesCount, 0);
}

