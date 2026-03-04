/**
 * TypeSubMenu - By Type 사이드 필터 메뉴 (FilterSubMenu 래퍼)
 * typeOptions 기반 notebook_type 5개 태그 필터
 * @deprecated Jukebox.renderJukeboxWithFilter에서 FilterSubMenu 직접 사용
 */
import { typeOptions } from '../../services/typeOptions.js';
import { renderFilterSubMenu } from './FilterSubMenu.js';

export function renderTypeSubMenu(selectedType, _onChange, _totalCount, notesCountByType = {}) {
  renderFilterSubMenu(selectedType, '/by-type', typeOptions, notesCountByType);
}

