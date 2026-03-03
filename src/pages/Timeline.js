/**
 * Timeline 페이지 = Jukebox + 기간(period) 필터
 */

import { periodOptions } from '../data/notesData.js';
import { getNotionNotebooks } from '../utils/notionNotebooks.js';
import { renderJukeboxWithFilter } from './Jukebox.js';

/** period_name 별칭 매핑 (Notion DB 값 변형 대응) */
const PERIOD_ALIASES = {
  elementary: [
    'elementary', 'elementary school', '초등학교', '초등',
    'elementry', 'Elementary School', 'Elementary'
  ],
  'middle-high': [
    'middle-high', 'middle & high school', 'middle and high school',
    'middle high school', 'middle & high', '중고등학교', '중고등',
    'Middle & High School', 'Middle and High School', 'Middle High School',
    'middle-high school', 'middle and high'
  ],
  university: [
    'university', '대학교', '대학', 'University'
  ],
  'after-graduation': [
    'after-graduation', 'after graduation', '졸업 후', '졸업후',
    'After Graduation'
  ]
};

function resolvePeriodKey(notebookType) {
  let raw = notebookType;
  if (Array.isArray(raw)) raw = raw[0] ?? '';
  const normalized = String(raw || '').trim().toLowerCase();
  const match = periodOptions.find(
    (opt) =>
      opt.value.toLowerCase() === normalized ||
      opt.label.toLowerCase() === normalized
  );
  if (match) return match.value;
  for (const [value, aliases] of Object.entries(PERIOD_ALIASES)) {
    if (aliases.some((a) => String(a).toLowerCase() === normalized)) return value;
  }
  return periodOptions[0]?.value || 'elementary';
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
