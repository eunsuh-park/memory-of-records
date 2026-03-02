/**
 * TypeSubMenu - By Type용 필터 메뉴 (FilterSubMenu 래퍼)
 * @deprecated FilterSubMenu를 직접 사용하세요.
 */
import { typeOptions } from '../data/typeOptions.js';
import { renderFilterSubMenu } from './FilterSubMenu.js';

export function renderTypeSubMenu(selectedType, _onChange, _totalCount, notesCountByType = {}) {
  renderFilterSubMenu(selectedType, '/by-type', typeOptions, notesCountByType);
}

