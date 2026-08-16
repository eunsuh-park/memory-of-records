/**
 * 노트 공유용 slug URL
 *
 * 형식: `{slugified-title}-{id앞8자}`
 * 예: 2024-일기장-a1b2c3d4
 *
 * Notion UUID(`/note/<uuid>`)도 그대로 열 수 있고,
 * slug로 들어오면 id suffix로 노트를 찾는다.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @param {string} title
 * @returns {string}
 */
export function slugifyTitle(title) {
  const raw = String(title || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  const ascii = raw
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const clipped = ascii.slice(0, 48).replace(/-$/g, '');
  return clipped || 'note';
}

/**
 * @param {string} id - Notion page id
 * @returns {string} 하이픈 제거 앞 8자
 */
export function noteIdShort(id) {
  return String(id || '')
    .replace(/-/g, '')
    .toLowerCase()
    .slice(0, 8);
}

/**
 * @param {{ id?: string, title?: string, name?: string, slug?: string }|null|undefined} note
 * @returns {string}
 */
export function buildNoteSlug(note) {
  if (!note) return '';
  if (note.slug && String(note.slug).trim()) return String(note.slug).trim();
  const short = noteIdShort(note.id);
  if (!short) return slugifyTitle(note.title || note.name || 'note');
  return `${slugifyTitle(note.title || note.name || 'note')}-${short}`;
}

/**
 * @param {{ id?: string, title?: string, name?: string, slug?: string }|null|undefined} note
 * @returns {string} `/note/...` 경로
 */
export function notePath(note) {
  const slug = buildNoteSlug(note);
  return slug ? `/note/${encodeURIComponent(slug)}` : '/note';
}

/**
 * 절대 URL (공유용)
 * @param {{ id?: string, title?: string, name?: string, slug?: string }|null|undefined} note
 * @returns {string}
 */
export function noteShareUrl(note) {
  const path = notePath(note);
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base === '/' ? '' : base.replace(/\/$/, '');
  if (typeof window === 'undefined') return `${prefix}${path}`;
  return `${window.location.origin}${prefix}${path}`;
}

export function isNotionUuid(value) {
  return UUID_RE.test(String(value || '').trim());
}

/**
 * 라우트 파라미터로 노트 찾기 (UUID 또는 slug)
 * @param {Array} notes
 * @param {string} param
 * @returns {Object|null}
 */
export function findNoteByRouteParam(notes, param) {
  const raw = decodeURIComponent(String(param || '').trim());
  if (!raw || !Array.isArray(notes)) return null;

  if (isNotionUuid(raw)) {
    return notes.find((n) => n?.id === raw) || null;
  }

  const bySlug = notes.find((n) => buildNoteSlug(n) === raw);
  if (bySlug) return bySlug;

  const short = raw.includes('-') ? raw.slice(raw.lastIndexOf('-') + 1).toLowerCase() : '';
  if (/^[0-9a-f]{8}$/i.test(short)) {
    return (
      notes.find((n) => noteIdShort(n?.id) === short) ||
      notes.find((n) => String(n?.id || '').replace(/-/g, '').toLowerCase().startsWith(short)) ||
      null
    );
  }

  return null;
}

/**
 * 노트 공유 URL을 클립보드에 복사한다.
 * @param {{ id?: string, title?: string, name?: string, slug?: string }|null|undefined} note
 * @returns {Promise<string>} 복사한 절대 URL
 */
export async function copyNoteShareUrl(note) {
  const url = noteShareUrl(note);
  if (!note?.id || !url || url.endsWith('/note')) {
    throw new Error('공유할 노트 정보가 없습니다.');
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return url;
  }
  if (typeof document === 'undefined') {
    throw new Error('링크 복사에 실패했습니다');
  }
  const input = document.createElement('input');
  input.value = url;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
  return url;
}
