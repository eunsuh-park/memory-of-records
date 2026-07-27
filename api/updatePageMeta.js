/**
 * POST /api/updatePageMeta
 * 페이지 이미지 structured metadata 갱신 (entry_date, ocr_text, visible)
 *
 * Body:
 * {
 *   "publicId"?: "Notebooks_v3/Content/노트/page-000001",
 *   "folder"?: "...", "pageNumber"?: 1,  // publicId 없을 때
 *   "entry_date"?: "YYYY-MM-DD" | "",
 *   "ocr_text"?: string,
 *   "visible"?: boolean
 * }
 */
import crypto from 'crypto';
import { getCloudinaryCredentials } from './_lib/cloudinaryAuth.js';

function trimOrEmpty(value) {
  if (value == null) return '';
  return String(value).trim();
}

function decodePathSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function folderPathFromParam(folder) {
  const trimmed = String(folder || '').trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  const deliveryMatch = trimmed.match(
    /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(.+)$/i
  );
  if (!deliveryMatch) return decodePathSegment(trimmed);
  const segments = deliveryMatch[1].split('/').filter(Boolean);
  while (segments.length && (/^v\d+$/.test(segments[0]) || segments[0].includes(','))) {
    segments.shift();
  }
  if (segments.length && /^page-\d+/i.test(segments[segments.length - 1])) {
    segments.pop();
  }
  return segments.map(decodePathSegment).join('/');
}

function pageStem(pageNumber) {
  const n = Math.max(1, Math.floor(Number(pageNumber) || 1));
  return `page-${String(n).padStart(6, '0')}`;
}

function resolvePublicId(body) {
  const direct = trimOrEmpty(body.publicId);
  if (direct) return direct.replace(/^\/+|\/+$/g, '');
  const folder = folderPathFromParam(body.folder);
  if (!folder) return null;
  return `${folder}/${pageStem(body.pageNumber)}`;
}

/**
 * Cloudinary metadata 파라미터: key=value|key=value
 * 빈 문자열로 지우려면 key= 형태
 */
function buildMetadataString({ entry_date, ocr_text, visible }) {
  const parts = [];
  if (entry_date !== undefined) {
    const d = trimOrEmpty(entry_date);
    parts.push(`entry_date=${d}`);
  }
  if (ocr_text !== undefined) {
    /* | 와 = 는 메타 구분자 — 단순 치환 */
    const text = String(ocr_text ?? '')
      .replace(/\|/g, '/')
      .replace(/=/g, ':')
      .slice(0, 4000);
    parts.push(`ocr_text=${text}`);
  }
  if (visible !== undefined) {
    const v = visible !== false && visible !== 'false' && visible !== 0 && visible !== '0';
    parts.push(`visible=${v ? 'true' : 'false'}`);
  }
  return parts.join('|');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const credentials = getCloudinaryCredentials();
  if (!credentials) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: 'CLOUDINARY_URL 또는 CLOUDINARY_* 환경 변수가 필요합니다'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const publicId = resolvePublicId(body);
    if (!publicId) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'publicId 또는 folder+pageNumber가 필요합니다'
      });
    }

    if (
      body.entry_date === undefined &&
      body.ocr_text === undefined &&
      body.visible === undefined
    ) {
      return res.status(400).json({
        error: 'Validation failed',
        message: '수정할 필드(entry_date, ocr_text, visible)가 없습니다'
      });
    }

    const metadata = buildMetadataString({
      entry_date: body.entry_date,
      ocr_text: body.ocr_text,
      visible: body.visible
    });
    if (!metadata) {
      return res.status(400).json({
        error: 'Validation failed',
        message: '유효한 메타데이터가 없습니다'
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = {
      metadata,
      overwrite: 'true',
      public_id: publicId,
      timestamp: String(timestamp),
      type: 'upload'
    };
    const signatureBase = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join('&');
    const signature = crypto
      .createHash('sha1')
      .update(signatureBase + credentials.apiSecret)
      .digest('hex');

    const form = new FormData();
    form.append('public_id', publicId);
    form.append('timestamp', String(timestamp));
    form.append('api_key', credentials.apiKey);
    form.append('signature', signature);
    form.append('type', 'upload');
    form.append('overwrite', 'true');
    form.append('metadata', metadata);

    const explicitUrl = `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/explicit`;
    const response = await fetch(explicitUrl, {
      method: 'POST',
      body: form
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Cloudinary update failed',
        details: data,
        message: data?.error?.message || '페이지 메타 수정에 실패했습니다'
      });
    }

    return res.status(200).json({
      ok: true,
      publicId: data.public_id || publicId,
      metadata: data.metadata || null
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to update page meta',
      message: error.message
    });
  }
}
