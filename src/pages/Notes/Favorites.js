/**
 * Favorites 페이지 = Jukebox + favorites === true 노트만
 *
 * 2차 필터 칩은 없음 (뷰 토글의 Favorites로 충분). 정렬만 노출.
 */

import { getFavoriteNotes } from '../../services/favoriteNotes.js';
import { FAVORITES_PATH } from '../../utils/noteFavorites.js';
import { renderJukeboxWithFilter } from './Jukebox.js';
import './Jukebox.css';

export function renderFavorites() {
  renderJukeboxWithFilter({
    filterMode: 'favorites',
    basePath: FAVORITES_PATH,
    selectedValue: 'all',
    filterOptions: [],
    loadNotes: getFavoriteNotes,
    getNotesCount: () => ({}),
    resolveFilterKey: () => 'all',
    viewModeToggle: { current: 'favorites' }
  });
}
