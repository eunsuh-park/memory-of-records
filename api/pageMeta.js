/**
 * GET /api/pageMeta?folder={pdf_folder_url|path}&page={n}
 * 특정 페이지 이미지의 structured metadata / context 조회
 *
 * 응답: { ok, publicId, entry_date, ocr_text, visible }
 */
import { getCloudinaryCredentials } from './_lib/cloudinaryAuth.js';

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
  /* Cloudinary date metadata: often YYYY-MM-DD or epoch ms */
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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  try {
    const endpoint =
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/` +
      `${encodeURIComponent(publicId)}?context=true&metadata=true`;
    const response = await fetch(endpoint, {
      headers: { Authorization: authHeader }
    });
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
    const visibleRaw =
      readMetaValue(meta, 'visible') ?? readMetaValue(context, 'visible');

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      publicId: data.public_id || publicId,
      pageNumber,
      entry_date: normalizeDate(entryDate),
      ocr_text: ocrText == null ? '' : String(ocrText),
      visible: normalizeVisible(visibleRaw)
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch page meta',
      message: error.message
    });
  }
}
