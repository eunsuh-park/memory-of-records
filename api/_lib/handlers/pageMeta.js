/**
 * GET /api/readPages?op=meta
 * 장 메타 (entry_date, ocr_text, visible, is_bookmarked)
 */
import { getCloudinaryCredentials } from '../cloudinaryAuth.js';

function decodePathSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function parseFolderParam(folder) {
  const trimmed = String(folder || '').trim().replace(/\/+$/, '');
  if (!trimmed) return { cloudName: null, folderPath: null };
  const deliveryMatch = trimmed.match(
    /^https?:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(.+)$/i
  );
  if (!deliveryMatch) {
    return { cloudName: null, folderPath: decodePathSegment(trimmed) };
  }
  const segments = deliveryMatch[2].split('/').filter(Boolean);
  while (segments.length && (/^v\d+$/.test(segments[0]) || segments[0].includes(','))) {
    segments.shift();
  }
  if (segments.length && /^page-\d+/i.test(segments[segments.length - 1])) {
    segments.pop();
  }
  return {
    cloudName: deliveryMatch[1],
    folderPath: segments.map(decodePathSegment).join('/')
  };
}

function pageStem(pageNumber) {
  const n = Math.max(1, Math.floor(Number(pageNumber) || 1));
  return `page-${String(n).padStart(6, '0')}`;
}

function readMetaValue(source, ...keys) {
  if (!source || typeof source !== 'object') return undefined;
  const normalized = new Map(
    Object.entries(source).map(([k, v]) => [
      String(k).trim().toLowerCase().replace(/[\s_-]+/g, ''),
      v
    ])
  );
  for (const key of keys) {
    const hit = normalized.get(String(key).trim().toLowerCase().replace(/[\s_-]+/g, ''));
    if (hit !== undefined && hit !== null && hit !== '') return hit;
  }
  return undefined;
}

function normalizeDate(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) {
    const d = new Date(n > 1e12 ? n : n * 1000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return s;
}

function normalizeVisible(value) {
  if (value === false || value === 0) return false;
  if (value === true || value === 1) return true;
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return true;
  return !['false', 'no', '0', 'off', 'hidden', '숨김'].includes(s);
}

function normalizeBookmarked(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return false;
  return ['true', 'yes', '1', 'on', 'bookmarked'].includes(s);
}

export async function handlePageMeta(req, res) {
  const { cloudName: urlCloudName, folderPath } = parseFolderParam(req.query?.folder);
  const pageNumber = Math.max(1, Math.floor(Number(req.query?.page) || 1));
  if (!folderPath) {
    return res.status(400).json({
      error: 'Invalid folder',
      message: 'folder query parameter is required'
    });
  }

  const credentials = getCloudinaryCredentials();
  const cloudName = credentials?.cloudName || urlCloudName;
  if (!credentials?.apiKey || !credentials?.apiSecret || !cloudName) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: 'CLOUDINARY_URL 또는 CLOUDINARY_* 환경 변수가 필요합니다'
    });
  }

  const publicId = `${folderPath}/${pageStem(pageNumber)}`;
  const authHeader = `Basic ${Buffer.from(
    `${credentials.apiKey}:${credentials.apiSecret}`
  ).toString('base64')}`;

  const endpoint =
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/` +
    `${encodeURIComponent(publicId)}?context=true&metadata=true`;
  const response = await fetch(endpoint, { headers: { Authorization: authHeader } });
  const data = await response.json();
  if (!response.ok) {
    return res.status(response.status).json({
      error: 'Cloudinary API error',
      details: data,
      message: data?.error?.message || '페이지 메타를 불러오지 못했습니다'
    });
  }

  const meta = data.metadata || {};
  const context = data.context?.custom || data.context || {};
  const entryDate =
    readMetaValue(meta, 'entry_date', 'entrydate', 'date') ??
    readMetaValue(context, 'entry_date', 'entrydate', 'date');
  const ocrText =
    readMetaValue(meta, 'ocr_text', 'ocrtext', 'ocr') ??
    readMetaValue(context, 'ocr_text', 'ocrtext', 'ocr');
  const visibleRaw = readMetaValue(meta, 'visible') ?? readMetaValue(context, 'visible');
  const bookmarkedRaw =
    readMetaValue(meta, 'is_bookmarked', 'isbookmarked', 'bookmarked') ??
    readMetaValue(context, 'is_bookmarked', 'isbookmarked', 'bookmarked');

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    publicId: data.public_id || publicId,
    pageNumber,
    entry_date: normalizeDate(entryDate),
    ocr_text: ocrText == null ? '' : String(ocrText),
    visible: normalizeVisible(visibleRaw),
    is_bookmarked: normalizeBookmarked(bookmarkedRaw)
  });
}
