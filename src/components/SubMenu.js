/**
 * SubMenu - Timeline용 필터 메뉴 (FilterSubMenu 래퍼)
 * @deprecated FilterSubMenu를 직접 사용하세요.
 */
import { periodOptions } from '../data/notesData.js';
import { renderFilterSubMenu } from './FilterSubMenu.js';

export function renderSubMenu(selectedPeriod, _onPeriodChange, _totalNotesCount, notesCountByPeriod) {
  renderFilterSubMenu(selectedPeriod, '/timeline', periodOptions, notesCountByPeriod ?? {});
}

