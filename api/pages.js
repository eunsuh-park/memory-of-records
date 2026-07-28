/**
 * /api/pages — 페이지 업로드·Notion 갱신·메타 조회/수정 (Hobby 플랜 함수 수 제한으로 통합)
 *
 * GET  ?op=meta&folder=...&page=n
 * POST { op: 'upload' | 'updateNote' | 'updateMeta', ... }
 */
import crypto from 'crypto';
import { getCloudinaryCredentials } from './_lib/cloudinaryAuth.js';
import {
  NOTEBOOK_DB_ID,
  findSchemaProperty,
  notionFetch
} from './_lib/notionDb.js';

const CONTENT_ROOT = process.env.CLOUDINARY_CONTENT_FOLDER || 'Notebooks_v3/Content';
const MAX_BYTES = 10 * 1024 * 1024;

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

function parseDataUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
  if (match) return { mime: match[1], base64: match[2] };
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
  return segments.length
    ? segments.map(decodePathSegment).join('/')
    : null;
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

function resolveUploadFolder(body) {
  const explicit = String(body.folder || '').trim().replace(/\/+$/, '');
  if (explicit) {
    if (/^https?:\/\//i.test(explicit)) {
      return folderPathFromDeliveryUrl(explicit) || explicit;
    }
    return explicit;
  }
  const root = String(CONTENT_ROOT || 'Notebooks_v3/Content').replace(/\/+$/, '');
  return `${root}/${sanitizePublicIdStem(body.noteName || body.filename || 'untitled')}`;
}

function buildFolderBaseUrl(secureUrl) {
  return String(secureUrl || '')
    .replace(/\/v\d+\//, '/')
    .replace(/\/page-\d{1,6}\.[a-z0-9]+(\?.*)?$/i, '');
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

function buildNotionPropertyPayload(prop, value) {
  if (!prop) return null;
  if (prop.type === 'url') return { url: value || null };
  if (prop.type === 'rich_text') {
    const text = String(value || '').slice(0, 2000);
    return text
      ? { rich_text: [{ type: 'text', text: { content: text } }] }
      : { rich_text: [] };
  }
  if (prop.type === 'number') {
    const n = Number(value);
    return { number: Number.isFinite(n) ? n : null };
  }
  return null;
}

function resolvePublicId(body) {
  const direct = trimOrEmpty(body.publicId);
  if (direct) return direct.replace(/^\/+|\/+$/g, '');
  const folder = folderPathFromDeliveryUrl(body.folder) || parseFolderParam(body.folder).folderPath;
  if (!folder) return null;
  return `${folder}/${pageStem(body.pageNumber)}`;
}

function buildMetadataString({ entry_date, ocr_text, visible }) {
  const parts = [];
  if (entry_date !== undefined) parts.push(`entry_date=${trimOrEmpty(entry_date)}`);
  if (ocr_text !== undefined) {
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

async function handleUpload(req, res, body) {
  const credentials = getCloudinaryCredentials();
  if (!credentials) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: 'CLOUDINARY_URL 또는 CLOUDINARY_* 환경 변수가 필요합니다'
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
      message: `페이지 이미지는 ${Math.floor(MAX_BYTES / (1024 * 1024))}MB 이하여야 합니다`
    });
  }

  const pageNumber = Math.max(1, Math.floor(Number(body.pageNumber) || 1));
  const folder = resolveUploadFolder(body);
  const publicId = pageStem(pageNumber);
  const timestamp = Math.floor(Date.now() / 1000);
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
  const response = await fetch(uploadUrl, { method: 'POST', body: form });
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
}

async function handleUpdateNote(req, res, body) {
  const id = trimOrEmpty(body.id).replace(/-/g, '');
  const pdfFolderUrl = trimOrEmpty(body.pdfFolderUrl);
  const pageCount = Number(body.pageCount);

  if (!id) {
    return res.status(400).json({ error: 'Validation failed', message: 'id는 필수입니다' });
  }
  if (!pdfFolderUrl) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'pdfFolderUrl은 필수입니다'
    });
  }
  if (!Number.isFinite(pageCount) || pageCount < 1) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'pageCount는 1 이상의 숫자여야 합니다'
    });
  }

  const database = await notionFetch(`/databases/${NOTEBOOK_DB_ID}`);
  const schema = database?.properties || {};
  const folderUrlProp = findSchemaProperty(
    schema,
    'pdf_folder_url',
    'PDF Folder URL',
    'pdf folder url'
  );
  const pageCountProp = findSchemaProperty(schema, 'page_count', 'Page Count', 'page count');

  if (!folderUrlProp || !['url', 'rich_text'].includes(folderUrlProp.type)) {
    return res.status(500).json({
      error: 'Schema error',
      message: 'Notion DB에 pdf_folder_url(URL/rich_text) 속성이 없습니다'
    });
  }

  const properties = {};
  const folderPayload = buildNotionPropertyPayload(folderUrlProp, pdfFolderUrl);
  if (folderPayload) properties[folderUrlProp.key] = folderPayload;

  if (pageCountProp && ['number', 'rich_text'].includes(pageCountProp.type)) {
    const countPayload = buildNotionPropertyPayload(pageCountProp, pageCount);
    if (countPayload) properties[pageCountProp.key] = countPayload;
  }

  const page = await notionFetch(`/pages/${id}`, {
    method: 'PATCH',
    body: { properties }
  });

  return res.status(200).json({
    ok: true,
    id: page.id,
    url: page.url,
    pdfFolderUrl,
    pageCount
  });
}

async function handleGetMeta(req, res) {
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

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    publicId: data.public_id || publicId,
    pageNumber,
    entry_date: normalizeDate(entryDate),
    ocr_text: ocrText == null ? '' : String(ocrText),
    visible: normalizeVisible(visibleRaw)
  });
}

async function handleUpdateMeta(req, res, body) {
  const credentials = getCloudinaryCredentials();
  if (!credentials) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: 'CLOUDINARY_URL 또는 CLOUDINARY_* 환경 변수가 필요합니다'
    });
  }

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
  const response = await fetch(explicitUrl, { method: 'POST', body: form });
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
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const op = String(req.query?.op || 'meta').trim();
      if (op !== 'meta') {
        return res.status(400).json({ error: 'Unknown op', message: 'GET op=meta 만 지원합니다' });
      }
      return await handleGetMeta(req, res);
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const op = String(body.op || '').trim();

    if (op === 'upload') return await handleUpload(req, res, body);
    if (op === 'updateNote') return await handleUpdateNote(req, res, body);
    if (op === 'updateMeta') return await handleUpdateMeta(req, res, body);

    return res.status(400).json({
      error: 'Validation failed',
      message: "op은 'upload' | 'updateNote' | 'updateMeta' 중 하나여야 합니다"
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: 'pages API failed',
      message: error.message,
      details: error.details
    });
  }
}
