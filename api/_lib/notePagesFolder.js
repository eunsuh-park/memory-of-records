/**
 * Cloudinary 노트 페이지 폴더 경로
 * notebooks/{public_id}/pages
 */
const NOTEBOOKS_ROOT = process.env.CLOUDINARY_NOTEBOOKS_FOLDER || 'notebooks';

export function sanitizeNotePublicId(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 80) return '';
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(raw)) return '';
  return raw;
}

export function pagesFolderForNote(noteId) {
  const id = sanitizeNotePublicId(noteId);
  if (!id) return '';
  const root = String(NOTEBOOKS_ROOT || 'notebooks').replace(/\/+$/, '');
  return `${root}/${id}/pages`;
}
