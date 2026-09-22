/**
 * 사용자 북마크 노트 컬렉션 정규화·한도
 */

export const BOOKMARKS_NOTE_ID = 'virtual:bookmarks';
export const MAX_CUSTOM_BOOKMARK_NOTES = 10;

export function isCustomBookmarkNoteId(id) {
  const raw = String(id || '').trim();
  return raw.startsWith(`${BOOKMARKS_NOTE_ID}:`) && raw.length > BOOKMARKS_NOTE_ID.length + 1;
}

function trimOrEmpty(value) {
  return String(value ?? '').trim();
}

function sanitizeId(id) {
  return trimOrEmpty(id).replace(/[|=]/g, '').slice(0, 80);
}

/**
 * @param {unknown} raw
 * @returns {{ id: string, title: string, description: string, sourceNoteIds: string[], sourceNotes: Array, coverFrontUrl: string, coverBackUrl: string, createdAt: string }[]}
 */
export function normalizeBookmarkNotes(raw) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.notes) ? raw.notes : [];
  const seen = new Set();
  const notes = [];
  for (const item of list) {
    if (notes.length >= MAX_CUSTOM_BOOKMARK_NOTES) break;
    const id = sanitizeId(item?.id);
    if (!isCustomBookmarkNoteId(id) || seen.has(id)) continue;
    const title = trimOrEmpty(item?.title).slice(0, 80);
    if (!title) continue;
    const sourceNotes = Array.isArray(item?.sourceNotes)
      ? item.sourceNotes
          .map((note) => ({
            id: trimOrEmpty(note?.id).slice(0, 80),
            title: trimOrEmpty(note?.title || note?.name).slice(0, 120)
          }))
          .filter((note) => note.id)
      : [];
    const sourceNoteIds = Array.isArray(item?.sourceNoteIds)
      ? item.sourceNoteIds.map((value) => trimOrEmpty(value).slice(0, 80)).filter(Boolean)
      : sourceNotes.map((note) => note.id);
    const uniqueSourceIds = [...new Set(sourceNoteIds)];
    seen.add(id);
    notes.push({
      id,
      title,
      description: trimOrEmpty(item?.description).slice(0, 100),
      sourceNoteIds: uniqueSourceIds,
      sourceNotes: sourceNotes.length
        ? sourceNotes.filter((note) => uniqueSourceIds.includes(note.id))
        : uniqueSourceIds.map((noteId) => ({ id: noteId, title: '' })),
      coverFrontUrl: trimOrEmpty(item?.coverFrontUrl).slice(0, 2000),
      coverBackUrl: trimOrEmpty(item?.coverBackUrl).slice(0, 2000),
      createdAt: trimOrEmpty(item?.createdAt) || new Date().toISOString()
    });
  }
  notes.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  return notes;
}
