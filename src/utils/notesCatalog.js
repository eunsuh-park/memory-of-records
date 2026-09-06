/**
 * Timeline + By type 노트 목록을 한 번에 읽고, 쓰기 후 캐시를 같이 비운다.
 * 뷰어·북마크 원본 매칭·업로드 완료 새로고침이 같은 경로를 타게 한다.
 */

import {
  getNotionNotebooks,
  clearNotionNotebooksCache
} from '../services/notionNotebooks.js';
import {
  getNotionTypeItems,
  clearNotionTypeItemsCache
} from '../services/notionByType.js';
import { clearNotePagesCache } from '../services/notePages.js';

/**
 * @param {{ visibility?: 'public'|'private'|'all' }} [options]
 * @returns {Promise<object[]>}
 */
export async function loadAllNotes(options = {}) {
  const [notebookResult, typeResult] = await Promise.allSettled([
    getNotionNotebooks(options),
    getNotionTypeItems(options)
  ]);
  const notebooks = notebookResult.status === 'fulfilled' ? notebookResult.value : [];
  const typeItems = typeResult.status === 'fulfilled' ? typeResult.value : [];
  const byId = new Map();
  for (const note of [...(notebooks || []), ...(typeItems || [])]) {
    if (note?.id && !byId.has(note.id)) byId.set(note.id, note);
  }
  return Array.from(byId.values());
}

export function clearNotesCaches() {
  clearNotionNotebooksCache();
  clearNotionTypeItemsCache();
  clearNotePagesCache();
}
