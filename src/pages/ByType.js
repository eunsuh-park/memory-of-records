/**
 * By Type 페이지 = Jukebox + 타입(type) 필터
 */

import { typeOptions } from '../data/typeOptions.js';
import { getNotionTypeItems } from '../utils/notionByType.js';
import { renderJukeboxWithFilter } from './Jukebox.js';

function normalizeTypeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveTypeKeyFromTitle(title) {
  const trimmed = String(title || '').trim();
  const prefix = trimmed.slice(0, 2);
  switch (prefix) {
    case '01':
      return 'diary-scheduler';
    case '02':
      return 'notebook-memo';
    case '03':
      return 'sketchbook';
    case '04':
      return 'lined-notebook';
    default:
      return null;
  }
}

function resolveTypeKey(notebookType) {
  const prefixMatch = resolveTypeKeyFromTitle(notebookType);
  if (prefixMatch) return prefixMatch;
  const normalized = normalizeTypeValue(notebookType);
  const match = typeOptions.find((option) => {
    const candidateList = [
      option.value,
      option.label,
      option.detail,
      ...(option.aliases || [])
    ];
    return candidateList.some((c) => normalizeTypeValue(c) === normalized);
  });
  return match?.value || typeOptions[0]?.value || 'diary-scheduler';
}

function getNotesCountByType(notes) {
  const counts = {};
  typeOptions.forEach((opt) => {
    counts[opt.value] = 0;
  });
  (notes || []).forEach((note) => {
    const key = resolveTypeKey(note.type || note.notebookType || note.title);
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

export function renderByType(type = null) {
  const selectedType = type ? resolveTypeKey(type) : 'diary-scheduler';
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
