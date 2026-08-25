/**
 * POST /api/writeCovers
 * 표지 앞·뒤 이미지를 Cloudinary Cover 폴더에 업로드하고 secure_url 반환
 *
 * Body (JSON):
 * {
 *   "op": "upload" | "coverFlags",   // 생략 시 upload
 *   "file": "data:image/...;base64,...." | raw base64,  // upload
 *   "filename": "노트명",
 *   "kind": "front" | "back",
 *   "noteName": "노트명",
 *   "publicId": "DIRY-2024-0001"  // 필수. Cloudinary 폴더명
 *   "firstPageIsCover": true | false,  // coverFlags
 *   "lastPageIsCover": true | false    // coverFlags
 * }
 *
 * 업로드 위치:
 *   notebooks/{publicId}/cover_front
 *   notebooks/{publicId}/cover_back
 */
import crypto from 'crypto';
import { getCloudinaryCredentials } from './_lib/cloudinaryAuth.js';
import { isPublicIdFormat } from './_lib/publicId.js';

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
  const notePublicId = String(body.publicId || '').trim();
  if (!isPublicIdFormat(notePublicId)) return null;
  const root = String(NOTEBOOKS_ROOT || 'notebooks').replace(/\/+$/, '');
  const stem = sanitizePublicIdStem(notePublicId);
  const fileId = kind === 'back' ? 'cover_back' : 'cover_front';
  return {
    folder: `${root}/${stem}`,
    publicId: fileId,
    displayName: fileId
  };
}

function toCoverFlagString(value) {
  if (value === true || value === 'true' || value === 1 || value === '1') return 'true';
  if (value === false || value === 'false' || value === 0 || value === '0') return 'false';
  return null;
}

function coverResourcePublicId(kind, body) {
  const target = coverUploadTarget(kind, body);
  if (!target) return null;
  return `${target.folder}/${target.publicId}`;
}

function signParams(params, apiSecret) {
  const signatureBase = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto
    .createHash('sha1')
    .update(signatureBase + apiSecret)
    .digest('hex');
}

/**
 * 앞표지 리소스 context에 첫/마지막 장이 PDF 표지인지 저장한다.
 * 뷰어는 false일 때만 업로드한 표지 이미지를 양 끝에 끼워 넣는다.
 */
async function handleCoverFlags(req, res, body, credentials) {
  const firstFlag = toCoverFlagString(body.firstPageIsCover);
  const lastFlag = toCoverFlagString(body.lastPageIsCover);
  if (firstFlag == null && lastFlag == null) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'firstPageIsCover 또는 lastPageIsCover가 필요합니다'
    });
  }

  const publicId = coverResourcePublicId('front', body);
  if (!publicId) {
    return res.status(400).json({
      error: 'Validation failed',
      message: '표지 플래그를 저장하려면 publicId가 필요합니다'
    });
  }

  const parts = [];
  if (firstFlag != null) parts.push(`first_page_is_cover=${firstFlag}`);
  if (lastFlag != null) parts.push(`last_page_is_cover=${lastFlag}`);
  const context = parts.join('|');
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    context,
    invalidate: 'true',
    public_id: publicId,
    timestamp: String(timestamp),
    type: 'upload'
  };
  const signature = signParams(paramsToSign, credentials.apiSecret);

  const form = new FormData();
  form.append('public_id', publicId);
  form.append('timestamp', String(timestamp));
  form.append('api_key', credentials.apiKey);
  form.append('signature', signature);
  form.append('type', 'upload');
  form.append('invalidate', 'true');
  form.append('context', context);

  const explicitUrl = `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/explicit`;
  const response = await fetch(explicitUrl, { method: 'POST', body: form });
  const data = await response.json();
  if (!response.ok) {
    return res.status(response.status).json({
      error: 'Cloudinary update failed',
      details: data,
      message: data?.error?.message || '표지 페이지 설정을 저장하지 못했습니다'
    });
  }

  return res.status(200).json({
    ok: true,
    publicId: data.public_id || publicId,
    firstPageIsCover: firstFlag == null ? undefined : firstFlag === 'true',
    lastPageIsCover: lastFlag == null ? undefined : lastFlag === 'true',
    context: data.context || null
  });
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
    const op = String(body.op || 'upload').trim();
    if (op === 'coverFlags') {
      return await handleCoverFlags(req, res, body, credentials);
    }
    if (op !== 'upload') {
      return res.status(400).json({
        error: 'Validation failed',
        message: "op은 'upload' | 'coverFlags' 중 하나여야 합니다"
      });
    }

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
    const target = coverUploadTarget(kind, body);
    if (!target) {
      return res.status(400).json({
        error: 'Validation failed',
        message: '표지는 notebooks/{public_id} 폴더에 올리므로 publicId(PREFIX-YEAR-SEQ)가 필요합니다'
      });
    }
    const { folder, publicId, displayName } = target;
    const timestamp = Math.floor(Date.now() / 1000);

    const paramsToSign = {
      display_name: displayName,
      folder,
      invalidate: 'true',
      overwrite: 'true',
      public_id: publicId,
      timestamp: String(timestamp)
    };
    const signature = signParams(paramsToSign, credentials.apiSecret);

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
