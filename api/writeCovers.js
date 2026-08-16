/**
 * POST /api/writeCovers
 * 표지 앞·뒤 이미지를 Cloudinary Cover 폴더에 업로드하고 secure_url 반환
 *
 * Body (JSON):
 * {
 *   "file": "data:image/...;base64,...." | raw base64,
 *   "filename": "노트명",
 *   "kind": "front" | "back",
 *   "noteName": "노트명",
 *   "publicId": "DIRY-2024-0001"  // 있으면 폴더명으로 사용
 * }
 *
 * 업로드 위치:
 *   notebooks/{publicId 또는 노트명}/cover_front
 *   notebooks/{publicId 또는 노트명}/cover_back
 */
import crypto from 'crypto';
import { getCloudinaryCredentials } from './_lib/cloudinaryAuth.js';

const NOTEBOOKS_ROOT = process.env.CLOUDINARY_NOTEBOOKS_FOLDER || 'notebooks';
const MAX_BYTES = 8 * 1024 * 1024; /* ~8MB raw (base64는 더 큼) */

function parseDataUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
  if (match) {
    return { mime: match[1], base64: match[2] };
  }
  return { mime: 'image/jpeg', base64: raw };
}

function extensionFromMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  return 'jpg';
}

/** Cloudinary public_id용 — 경로 문자만 제거하고 노트명은 최대한 유지 */
function sanitizePublicIdStem(name) {
  return (
    String(name || 'cover')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[\/\\?#%&{}<>*|"`]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 120) || 'cover'
  );
}

function coverUploadTarget(kind, body) {
  const root = String(NOTEBOOKS_ROOT || 'notebooks').replace(/\/+$/, '');
  const stem = sanitizePublicIdStem(body.publicId || body.noteName || body.filename || `cover-${kind}`);
  const fileId = kind === 'back' ? 'cover_back' : 'cover_front';
  return {
    folder: `${root}/${stem}`,
    publicId: fileId,
    displayName: fileId
  };
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
    const parsed = parseDataUrl(body.file);
    if (!parsed?.base64) {
      return res.status(400).json({ error: 'file is required (base64 or data URL)' });
    }

    const approxBytes = Math.floor((parsed.base64.length * 3) / 4);
    if (approxBytes > MAX_BYTES) {
      return res.status(400).json({
        error: 'File too large',
        message: `표지 이미지는 ${Math.floor(MAX_BYTES / (1024 * 1024))}MB 이하여야 합니다`
      });
    }

    const kind = body.kind === 'back' ? 'back' : 'front';
    const ext = extensionFromMime(parsed.mime);
    const { folder, publicId, displayName } = coverUploadTarget(kind, body);
    const timestamp = Math.floor(Date.now() / 1000);

    const paramsToSign = {
      display_name: displayName,
      folder,
      invalidate: 'true',
      overwrite: 'true',
      public_id: publicId,
      timestamp: String(timestamp)
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
    form.append('file', `data:${parsed.mime};base64,${parsed.base64}`);
    form.append('api_key', credentials.apiKey);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    form.append('folder', folder);
    form.append('public_id', publicId);
    form.append('display_name', displayName);
    form.append('overwrite', 'true');
    form.append('invalidate', 'true');

    const uploadUrl = `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/upload`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: form
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Cloudinary upload failed',
        details: data
      });
    }

    return res.status(200).json({
      ok: true,
      url: data.secure_url || data.url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format || ext,
      kind,
      folder
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
}
