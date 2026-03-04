/**
 * Timeline 페이지 = Jukebox + 기간(period) 필터
 */

import { periodOptions } from '../data/notesData.js';
import { getNotionNotebooks } from '../utils/notionNotebooks.js';
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

function getNotesCountByPeriod(notes) {
  const counts = {};
  periodOptions.forEach((opt) => {
    counts[opt.value] = 0;
  });
  (notes || []).forEach((note) => {
    const key = resolvePeriodKey(note.notebookType || note.period);
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

export function renderTimeline(period = null) {
  const selectedPeriod = period || 'elementary';
  renderJukeboxWithFilter({
    filterMode: 'period',
    basePath: '/timeline',
    selectedValue: selectedPeriod,
    filterOptions: periodOptions,
    loadNotes: getNotionNotebooks,
    getNotesCount: getNotesCountByPeriod,
    resolveFilterKey: (note) => resolvePeriodKey(note.notebookType)
  });
}
