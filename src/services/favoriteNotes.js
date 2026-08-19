/**
 * 즐겨찾기 노트 로딩 (favorites 전용 페이지용)
 *
 * Timeline/By Type와 동일한 Notion 노트북 목록에서 favorites === true 만 골라 반환한다.
 */
import { loadAllNotes } from '../utils/notesCatalog.js';
import { filterFavoriteNotes } from '../utils/noteFavorites.js';

/**
 * Timeline + By Type 소스를 합친 뒤 favorites만 반환 (id 기준 중복 제거)
 * @param {{ visibility?: 'public'|'private'|'all' }} [options]
 * @returns {Promise<Array>}
 */
export async function getFavoriteNotes(options = {}) {
  return filterFavoriteNotes(await loadAllNotes(options));
}
