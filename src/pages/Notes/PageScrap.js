/**
 * Page Scrap = Jukebox + Bookmark Note만
 *
 * Timeline/By type 선두에 두던 가상 북마크 노트를 이 페이지로 모은다.
 * 서브메뉴 탭(Timeline / By type / Favorites / Page Scrap)은 Favorites와 같이 유지한다.
 */

import { getPageScrapNotes, PAGE_SCRAP_PATH } from '../../utils/bookmarksNote.js';
import { renderJukeboxWithFilter } from './Jukebox.js';
import './Jukebox.css';

export function renderPageScrap() {
  renderJukeboxWithFilter({
    filterMode: 'scrap',
    basePath: PAGE_SCRAP_PATH,
    selectedValue: 'all',
    filterOptions: [],
    loadNotes: getPageScrapNotes,
    getNotesCount: () => ({}),
    resolveFilterKey: () => 'all',
    viewModeToggle: { current: 'scrap' }
  });
}
