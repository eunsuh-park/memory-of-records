/**
 * By Type 페이지 = Jukebox + notebook_type 필터
 *
 * Notion DB notebook_type 태그와 1:1 매칭:
 *   다이어리(일기장), 스케줄러, 수첩/메모지, 스케치북, 줄공책
 * @see typeOptions (src/services/typeOptions.js)
 */

import { typeOptions } from '../../services/typeOptions.js';
import { getNotionTypeItems } from '../../services/notionByType.js';
import { renderJukeboxWithFilter } from './Jukebox.js';

/**
 * Notion notebook_type 값 → typeOptions.value 매핑 (1:1)
 * - Notion Select/Multi-select에서 올 수 있는 값(label 또는 value)을 정규화 후 매칭
 * - multi_select인 경우 첫 번째 값 사용
 * @param {string|string[]} notebookType - notionByType에서 오는 type
 * @returns {string|null} typeOptions.value 또는 매칭 실패 시 null
 */
function resolveTypeKey(notebookType) {
  let raw = notebookType;
  if (Array.isArray(raw)) raw = raw[0] ?? '';
  const normalized = String(raw || '').trim().toLowerCase();
  const match = typeOptions.find(
    (opt) =>
      opt.value.toLowerCase() === normalized ||
      opt.label.toLowerCase() === normalized
  );
  return match?.value ?? null;
}

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
    resolveFilterKey: (note) => resolveTypeKey(note.type || note.notebookType || note.title)
  });
}
