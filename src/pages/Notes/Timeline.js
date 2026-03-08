/**
 * Timeline 페이지 = Jukebox + 기간(period) 필터
 */

import { periodOptions } from '../../services/notesData.js';
import { getNotionNotebooks } from '../../services/notionNotebooks.js';
import { renderJukeboxWithFilter } from './Jukebox.js';

/** period_name: Notion 태그와 1:1 매칭 */
function resolvePeriodKey(notebookType) {
  let raw = notebookType;
  if (Array.isArray(raw)) raw = raw[0] ?? '';
  const normalized = String(raw || '').trim().toLowerCase();
  const match = periodOptions.find(
    (opt) =>
      opt.value.toLowerCase() === normalized ||
      opt.label.toLowerCase() === normalized
  );
  return match?.value ?? null;
}

/**
 * 시기별 노트 개수 집계 (사이드 메뉴 카운트 표시용)
 * resolvePeriodKey가 null인 노트는 counts에 포함되지 않음 (미분류)
 * 값이 0이어도 0 그대로 표시됨
 */
function getNotesCountByPeriod(notes) {
  // 각 periodOption.value를 0으로 초기화
  const counts = {};
  periodOptions.forEach((opt) => {
    counts[opt.value] = 0;
  });
  // 각 노트에 대해 해당 period의 카운트 증가
  (notes || []).forEach((note) => {
    const key = resolvePeriodKey(note.notebookType || note.period);
    if (key && Object.prototype.hasOwnProperty.call(counts, key)) {
      counts[key] += 1;
    }
    // key가 counts에 없으면 무시(미분류)
  });
  // 모든 시기가 0이어도 0이 그대로 유지됨
  return counts;
}

export function renderTimeline(period = null) {
  // URL 파라미터를 periodOptions와 매칭; 없거나 잘못된 값이면 첫 번째 시기 사용
  const selectedPeriod =
    (period ? resolvePeriodKey(period) : null) ?? periodOptions[0]?.value ?? 'elementary';
  renderJukeboxWithFilter({
    filterMode: 'period',
    basePath: '/timeline',
    selectedValue: selectedPeriod,
    filterOptions: periodOptions,
    loadNotes: getNotionNotebooks,
    getNotesCount: getNotesCountByPeriod,
    resolveFilterKey: (note) => resolvePeriodKey(note.notebookType),
    viewModeToggle: { current: 'timeline' }
  });
}
