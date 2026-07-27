/**
 * POST /api/uploadPage
 * 노트 본문 페이지 이미지를 Cloudinary Content 폴더에 업로드
 *
 * Body (JSON):
 * {
 *   "file": "data:image/...;base64,...." | raw base64,
 *   "noteName": "노트명",
 *   "pageNumber": 1,
 *   "folder"?: "Notebooks_v3/Content/노트명"  // 기존 pdf_folder_url에서 추출한 path
 * }
 *
 * 업로드 위치: Notebooks_v3/Content/{노트명}/page-000001
 */
import crypto from 'crypto';
import { getCloudinaryCredentials } from './_lib/cloudinaryAuth.js';

const CONTENT_ROOT = process.env.CLOUDINARY_CONTENT_FOLDER || 'Notebooks_v3/Content';
const MAX_BYTES = 10 * 1024 * 1024;

function parseDataUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
  if (match) {
    return { mime: match[1], base64: match[2] };
  }
  return { mime: 'image/jpeg', base64: raw };
}

function sanitizePublicIdStem(name) {
  return (
    String(name || 'page')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[\/\\?#%&{}<>*|"`]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 120) || 'page'
  );
}

/** delivery URL → asset folder path (버전·변환·파일명 제거) */
function folderPathFromDeliveryUrl(url) {
  const trimmed = String(url || '').trim().replace(/\/+$/, '');
  const match = trimmed.match(/^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(.+)$/i);
  if (!match) return null;
  const segments = match[1].split('/').filter(Boolean);
  while (segments.length && (/^v\d+$/.test(segments[0]) || segments[0].includes(','))) {
    segments.shift();
  }
  if (segments.length && /^page-\d+/i.test(segments[segments.length - 1])) {
    segments.pop();
  }
  return segments.length ? segments.map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  }).join('/') : null;
}

function resolveFolder(body) {
  const explicit = String(body.folder || '').trim().replace(/\/+$/, '');
  if (explicit) {
    if (/^https?:\/\//i.test(explicit)) {
      return folderPathFromDeliveryUrl(explicit) || explicit;
    }
    return explicit;
  }
  const root = String(CONTENT_ROOT || 'Notebooks_v3/Content').replace(/\/+$/, '');
  const noteStem = sanitizePublicIdStem(body.noteName || body.filename || 'untitled');
  return `${root}/${noteStem}`;
}

function buildFolderBaseUrl(secureUrl) {
  return String(secureUrl || '')
    .replace(/\/v\d+\//, '/')
    .replace(/\/page-\d{1,6}\.[a-z0-9]+(\?.*)?$/i, '');
}

function pagePublicIdStem(pageNumber) {
  const n = Math.max(1, Math.floor(Number(pageNumber) || 1));
  return `page-${String(n).padStart(6, '0')}`;
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
        message: `페이지 이미지는 ${Math.floor(MAX_BYTES / (1024 * 1024))}MB 이하여야 합니다`
      });
    }

    const pageNumber = Math.max(1, Math.floor(Number(body.pageNumber) || 1));
    const folder = resolveFolder(body);
    const publicId = pagePublicIdStem(pageNumber);
    const timestamp = Math.floor(Date.now() / 1000);

    /* visible 기본 true — structured metadata */
    const metadata = 'visible=true';

    const paramsToSign = {
      folder,
      format: 'jpg',
      invalidate: 'true',
      metadata,
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
    form.append('overwrite', 'true');
    form.append('invalidate', 'true');
    form.append('format', 'jpg');
    form.append('metadata', metadata);

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

    const secureUrl = data.secure_url || data.url;
    return res.status(200).json({
      ok: true,
      url: secureUrl,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format || 'jpg',
      pageNumber,
      folder,
      folderUrl: buildFolderBaseUrl(secureUrl)
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
}
