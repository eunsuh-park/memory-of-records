/**
 * 사용자 북마크 노트 목록 (Cloudinary JSON + 로컬 캐시)
 */

import { getBookmarkedPages } from './bookmarkedPages.js';
import {
  BOOKMARKS_NOTE_ID,
  createBookmarksNote,
  defaultBookmarkCovers,
  ensureBookmarkNoteCovers
} from '../utils/bookmarksNote.js';
import {
  countPagesByBookmarkNote,
  formatSourceNotesDescription
} from '../utils/bookmarkNotes.js';

const LOCAL_KEY = 'mor.bookmark-notes';

let cache = null;
let inflight = null;

function readLocalNotes() {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeLocalNotes(notes) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(notes || []));
  } catch {
    /* quota / private mode */
  }
}

/**
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<Array>}
 */
export async function fetchBookmarkNotes({ force = false } = {}) {
  if (!force && cache) return cache;
  if (!force && inflight) return inflight;

  const qs = force ? `?op=bookmarkNotes&_=${Date.now()}` : '?op=bookmarkNotes';
  inflight = fetch(`/api/readPages${qs}`, {
    cache: force ? 'no-store' : 'default'
  })
    .then(async (response) => {
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        throw new Error(data?.message || data?.error || '북마크 노트를 불러오지 못했습니다');
      }
      return Array.isArray(data.notes) ? data.notes : [];
    })
    .then((notes) => {
      cache = notes;
      writeLocalNotes(notes);
      return notes;
    })
    .catch((err) => {
      console.warn('[bookmarkNotes] remote read fallback:', err);
      const local = readLocalNotes();
      cache = local;
      return local;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function clearBookmarkNotesCache() {
  cache = null;
  inflight = null;
}

/**
 * @param {Array} notes
 */
export async function saveBookmarkNotes(notes) {
  const payload = Array.isArray(notes) ? notes : [];
  try {
    const response = await fetch('/api/writePages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'saveBookmarkNotes', notes: payload })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || data?.error || '북마크 노트를 저장하지 못했습니다');
    }
    const saved = Array.isArray(data?.notes) ? data.notes : payload;
    cache = saved;
    writeLocalNotes(saved);
    return saved;
  } catch (err) {
    console.warn('[bookmarkNotes] remote save fallback:', err);
    writeLocalNotes(payload);
    cache = payload;
    return payload;
  }
}

/**
 * Page Scrap 갤러리용 노트 목록
 * @returns {Promise<Array>}
 */
export async function loadPageScrapNotes() {
  await ensureBookmarkNoteCovers().catch(() => null);
  const [custom, pages] = await Promise.all([
    fetchBookmarkNotes().catch(() => []),
    getBookmarkedPages().catch(() => [])
  ]);
  const counts = countPagesByBookmarkNote(pages);
  const defaults = defaultBookmarkCovers();
  return [
    createBookmarksNote({ pageCount: counts[BOOKMARKS_NOTE_ID] || 0 }),
    ...(custom || []).map((note) =>
      createBookmarksNote({
        id: note.id,
        title: note.title,
        pageCount: counts[note.id] || 0,
        description: formatSourceNotesDescription(note.sourceNotes),
        sourceNoteIds: note.sourceNoteIds,
        sourceNotes: note.sourceNotes,
        coverFrontUrl: note.coverFrontUrl || defaults.coverFrontUrl,
        coverBackUrl: note.coverBackUrl || defaults.coverBackUrl,
        createdAt: note.createdAt
      })
    )
  ];
}

/**
 * @param {string} id
 */
export async function findBookmarkNote(id) {
  const notes = await loadPageScrapNotes();
  return notes.find((note) => note.id === id) || createBookmarksNote();
}

