/**
 * Favorites 페이지 = Jukebox + favorites === true 노트만
 */

import { getFavoriteNotes } from '../../services/favoriteNotes.js';
import { FAVORITES_PATH } from '../../utils/noteFavorites.js';
import { renderJukeboxWithFilter } from './Jukebox.js';
import './Jukebox.css';

const FAVORITE_FILTER_OPTIONS = [
  { value: 'all', label: 'Favorites', labelMobile: 'Fav' }
];

function getNotesCountByFavorite(notes) {
  return { all: Array.isArray(notes) ? notes.length : 0 };
}

export function renderFavorites() {
  renderJukeboxWithFilter({
    filterMode: 'favorites',
    basePath: FAVORITES_PATH,
    selectedValue: 'all',
    filterOptions: FAVORITE_FILTER_OPTIONS,
    loadNotes: getFavoriteNotes,
    getNotesCount: getNotesCountByFavorite,
    resolveFilterKey: () => 'all',
    viewModeToggle: { current: 'favorites' }
  });
}
