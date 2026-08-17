/**
 * 노트·페이지 공유용 slug URL
 *
 * 형식: `{slugified-title}-{id앞8자}`
 * 예: 2024-일기장-a1b2c3d4
 * 특정 장: `/note/{slug}?p=12`
 *
 * Notion UUID(`/note/<uuid>`)도 그대로 열 수 있고,
 * slug로 들어오면 id suffix로 노트를 찾는다.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 특정 페이지 공유 쿼리 키 */
export const SHARE_PAGE_QUERY = 'p';

/**
 * @param {unknown} page
 * @returns {number|null} 1 이상 정수, 아니면 null
 */
export function normalizeSharePage(page) {
  const n = Math.floor(Number(page));
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

/**
 * 주소의 `?p=` 값을 페이지 번호로 읽는다.
 * @param {string} [search] location.search. 생략 시 window.location.search
 * @returns {number|null}
 */
export function parseSharePageParam(search) {
  const raw =
    search == null
      ? typeof window !== 'undefined'
        ? window.location.search
        : ''
      : String(search);
  const qs = raw.startsWith('?') ? raw.slice(1) : raw;
  try {
    return normalizeSharePage(new URLSearchParams(qs).get(SHARE_PAGE_QUERY));
  } catch {
    return null;
  }
}

/**
 * @param {string} title
 * @returns {string}
 */
export function slugifyTitle(title) {
  /* NFKD는 한글 음절을 자모로 분해해서 가-힣 필터에 걸러진다. 쓰지 않는다. */
  const raw = String(title || '')
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
 * @param {unknown} [page] 1-based 페이지 번호. 없거나 잘못되면 노트만
 * @returns {string} `/note/...` 경로 (+ `?p=` )
 */
export function notePath(note, page) {
  const slug = buildNoteSlug(note);
  if (!slug) return '/note';
  const path = `/note/${encodeURIComponent(slug)}`;
  const pageNum = normalizeSharePage(page);
  return pageNum ? `${path}?${SHARE_PAGE_QUERY}=${pageNum}` : path;
}

/**
 * BASE_URL을 포함한 사이트 내부 경로 (origin 없음)
 * @param {{ id?: string, title?: string, name?: string, slug?: string }|null|undefined} note
 * @param {unknown} [page]
 * @returns {string}
 */
export function noteHref(note, page) {
  const path = notePath(note, page);
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base === '/' ? '' : base.replace(/\/$/, '');
  return `${prefix}${path}`;
}

/**
 * 절대 URL (공유용)
 * @param {{ id?: string, title?: string, name?: string, slug?: string }|null|undefined} note
 * @param {unknown} [page]
 * @returns {string}
 */
export function noteShareUrl(note, page) {
  const href = noteHref(note, page);
  if (typeof window === 'undefined') return href;
  return `${window.location.origin}${href}`;
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

async function writeClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  if (typeof document === 'undefined') {
    throw new Error('링크 복사에 실패했습니다');
  }
  const input = document.createElement('input');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

/**
 * 노트(또는 특정 페이지) 공유 URL을 클립보드에 복사한다.
 * @param {{ id?: string, title?: string, name?: string, slug?: string }|null|undefined} note
 * @param {unknown} [page]
 * @returns {Promise<string>} 복사한 절대 URL
 */
export async function copyNoteShareUrl(note, page) {
  const url = noteShareUrl(note, page);
  const pathOnly = notePath(note).split('?')[0];
  if (!note?.id || !url || pathOnly.endsWith('/note')) {
    throw new Error('공유할 노트 정보가 없습니다.');
  }
  await writeClipboard(url);
  return url;
}
