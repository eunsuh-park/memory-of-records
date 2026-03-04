/**
 * TimelineScrollBar - Timeline용 스크롤바 (FilterScrollBar 래퍼)
 * @deprecated FilterScrollBar를 직접 사용하세요.
 */
import { renderFilterScrollBar } from './FilterScrollBar.js';

export function renderTimelineScrollBar(totalNotesCount, _notesCountByPeriod) {
  renderFilterScrollBar(totalNotesCount, 0);
}

