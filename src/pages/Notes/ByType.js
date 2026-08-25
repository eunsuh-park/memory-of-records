/**
 * By Type 페이지 = Jukebox + notebook_type 필터
 *
 * Notion DB notebook_type 태그와 1:1 매칭:
 *   다이어리, 플래너, 메모장, 스케치북, 학습/공부 노트, 업무용 노트,
 *   일반 노트, 여행 기록, 스크랩, 컬렉션, 기타
 * @see typeOptions (src/data/typeOptions.js)
 */

import { typeOptions, resolveTypeKey } from '../../data/typeOptions.js';
import { getNotionTypeItems } from '../../services/notionByType.js';
import { renderJukeboxWithFilter } from './Jukebox.js';
import './Jukebox.css';

/**
 * 타입별 노트 개수 집계 (사이드 메뉴 카운트 표시용)
 * resolveTypeKey가 null인 노트는 counts에 포함되지 않음 (미분류)
 * 값이 0이어도 0 그대로 표시됨
 */
function getNotesCountByType(notes) {
  // 각 typeOption.value를 0으로 초기화
  const counts = {};
  typeOptions.forEach((opt) => {
    counts[opt.value] = 0;
  });
  // 각 노트에 대해 해당 type의 카운트 증가
  (notes || []).forEach((note) => {
    const key = resolveTypeKey(note.type || note.notebookType || note.title);
    if (key && Object.prototype.hasOwnProperty.call(counts, key)) {
      counts[key] += 1;
    }
    // key가 counts에 없으면 무시(미분류)
  });
  // 모든 타입이 0이어도 0이 그대로 유지됨
  return counts;
}

/**
 * By Type 페이지 렌더링
 * @param {string|null} type - URL 파라미터 (/by-type/:type). 유효하지 않으면 첫 번째 타입 사용.
 */
export function renderByType(type = null) {
  const resolved = type ? resolveTypeKey(type) : null;
  const selectedType = resolved ?? typeOptions[0]?.value ?? 'diary';

  renderJukeboxWithFilter({
    filterMode: 'type',
    basePath: '/by-type',
    selectedValue: selectedType,
    filterOptions: typeOptions,
    loadNotes: getNotionTypeItems,
    getNotesCount: getNotesCountByType,
    resolveFilterKey: (note) => resolveTypeKey(note.type || note.notebookType || note.title),
    viewModeToggle: { current: 'type' }
  });
}
