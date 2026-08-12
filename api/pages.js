/**
 * /api/pages — 페이지 업로드·Notion 갱신·메타 조회/수정·폴더 이름 변경
 * (Hobby 플랜 함수 수 제한으로 통합)
 *
 * GET  ?op=meta&folder=...&page=n
 * POST { op: 'upload' | 'updateNote' | 'updateMeta' | 'renameFolder' | 'shiftPages' | 'deletePage', ... }
 */
import crypto from 'crypto';
import { getCloudinaryCredentials } from './_lib/cloudinaryAuth.js';
import {
  NOTEBOOK_DB_ID,
  findSchemaProperty,
  notionFetch
} from './_lib/notionDb.js';

const CONTENT_ROOT = process.env.CLOUDINARY_CONTENT_FOLDER || 'Notebooks_v3/Content';
const COVER_ROOT = process.env.CLOUDINARY_COVER_FOLDER || 'Notebooks_v3/Cover';
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

/** is_bookmarked: 없으면 false (visible과 달리 opt-in) */
function normalizeBookmarked(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return false;
  return ['true', 'yes', '1', 'on', 'bookmarked'].includes(s);
}

function toMetaBoolFlag(value) {
  return value !== false && value !== 'false' && value !== 0 && value !== '0';
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

function buildMetadataString({ entry_date, ocr_text, visible, is_bookmarked }) {
  const parts = [];
  if (entry_date !== undefined) {
    const d = trimOrEmpty(entry_date);
    /* date 타입 필드는 YYYY-MM-DD. 빈 값은 필드 생략(클리어는 context로 처리) */
    if (d) parts.push(`entry_date=${d.slice(0, 10)}`);
  }
  if (ocr_text !== undefined) {
    const text = String(ocr_text ?? '')
      .replace(/\|/g, '/')
      .replace(/=/g, ':')
      .slice(0, 4000);
    parts.push(`ocr_text=${text}`);
  }
  if (visible !== undefined) {
    parts.push(`visible=${toMetaBoolFlag(visible) ? 'true' : 'false'}`);
  }
  if (is_bookmarked !== undefined) {
    parts.push(`is_bookmarked=${toMetaBoolFlag(is_bookmarked) ? 'true' : 'false'}`);
  }
  return parts.join('|');
}

function buildContextString({ entry_date, ocr_text, visible, is_bookmarked }) {
  const parts = [];
  if (entry_date !== undefined) parts.push(`entry_date=${trimOrEmpty(entry_date).slice(0, 10)}`);
  if (ocr_text !== undefined) {
    const text = String(ocr_text ?? '')
      .replace(/\|/g, '/')
      .replace(/=/g, ':')
      .slice(0, 4000);
    parts.push(`ocr_text=${text}`);
  }
  if (visible !== undefined) {
    parts.push(`visible=${toMetaBoolFlag(visible) ? 'true' : 'false'}`);
  }
  if (is_bookmarked !== undefined) {
    parts.push(`is_bookmarked=${toMetaBoolFlag(is_bookmarked) ? 'true' : 'false'}`);
  }
  return parts.join('|');
}

function contentFolderForNoteName(noteName) {
  const root = String(CONTENT_ROOT || 'Notebooks_v3/Content').replace(/\/+$/, '');
  return `${root}/${sanitizePublicIdStem(noteName)}`;
}

function coverPublicId(kind, noteName) {
  const root = String(COVER_ROOT || 'Notebooks_v3/Cover').replace(/\/+$/, '');
  const folder = kind === 'back' ? `${root}/Back` : `${root}/Front`;
  return `${folder}/${sanitizePublicIdStem(noteName)}`;
}

function rewriteFolderBaseUrl(folderUrl, fromPath, toPath) {
  const url = String(folderUrl || '').trim().replace(/\/+$/, '');
  if (!url) return '';
  if (!fromPath || !toPath || fromPath === toPath) return url;
  try {
    const encodedFrom = fromPath
      .split('/')
      .map((s) => encodeURIComponent(s))
      .join('/');
    const encodedTo = toPath
      .split('/')
      .map((s) => encodeURIComponent(s))
      .join('/');
    if (url.includes(encodedFrom)) return url.replace(encodedFrom, encodedTo);
    if (url.includes(fromPath)) return url.replace(fromPath, toPath);
  } catch {
    /* fall through */
  }
  const cloudMatch = url.match(/^https?:\/\/res\.cloudinary\.com\/([^/]+)/i);
  if (cloudMatch) {
    const encodedTo = toPath
      .split('/')
      .map((s) => encodeURIComponent(s))
      .join('/');
    return `https://res.cloudinary.com/${cloudMatch[1]}/image/upload/${encodedTo}`;
  }
  return url;
}

/** 표지 delivery URL의 파일명(노트명) 구간을 새 이름으로 교체 */
function rewriteCoverUrl(url, oldStem, newStem) {
  const raw = String(url || '').trim();
  if (!raw || !oldStem || !newStem || oldStem === newStem) return raw;
  const variants = [oldStem, encodeURIComponent(oldStem)];
  let next = raw;
  for (const from of variants) {
    if (!from) continue;
    if (next.includes(`/${from}.`)) {
      next = next.replace(`/${from}.`, `/${encodeURIComponent(newStem)}.`);
      break;
    }
    if (next.includes(`/${from}`)) {
      next = next.replace(`/${from}`, `/${encodeURIComponent(newStem)}`);
      break;
    }
  }
  return next;
}

async function renameCloudinaryAsset(credentials, fromPublicId, toPublicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    from_public_id: fromPublicId,
    invalidate: 'true',
    overwrite: 'true',
    timestamp: String(timestamp),
    to_public_id: toPublicId
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
  form.append('from_public_id', fromPublicId);
  form.append('to_public_id', toPublicId);
  form.append('timestamp', String(timestamp));
  form.append('api_key', credentials.apiKey);
  form.append('signature', signature);
  form.append('overwrite', 'true');
  form.append('invalidate', 'true');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/rename`,
    { method: 'POST', body: form }
  );
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function destroyCloudinaryAsset(credentials, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    invalidate: 'true',
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
  form.append('public_id', publicId);
  form.append('timestamp', String(timestamp));
  form.append('api_key', credentials.apiKey);
  form.append('signature', signature);
  form.append('invalidate', 'true');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/destroy`,
    { method: 'POST', body: form }
  );
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
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
  /* 클라이언트에서 비공개 업로드 체크 시 visible=false */
  const visible =
    body.visible === false || body.visible === 'false' || body.visible === 0 || body.visible === '0'
      ? false
      : true;
  const metadata = `visible=${visible ? 'true' : 'false'}`;

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
    body.visible === undefined &&
    body.is_bookmarked === undefined
  ) {
    return res.status(400).json({
      error: 'Validation failed',
      message: '수정할 필드(entry_date, ocr_text, visible, is_bookmarked)가 없습니다'
    });
  }

  const metadata = buildMetadataString({
    entry_date: body.entry_date,
    ocr_text: body.ocr_text,
    visible: body.visible,
    is_bookmarked: body.is_bookmarked
  });
  const context = buildContextString({
    entry_date: body.entry_date,
    ocr_text: body.ocr_text,
    visible: body.visible,
    is_bookmarked: body.is_bookmarked
  });
  if (!metadata && !context) {
    return res.status(400).json({
      error: 'Validation failed',
      message: '유효한 메타데이터가 없습니다'
    });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    overwrite: 'true',
    public_id: publicId,
    timestamp: String(timestamp),
    type: 'upload'
  };
  if (metadata) paramsToSign.metadata = metadata;
  if (context) paramsToSign.context = context;

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
  if (metadata) form.append('metadata', metadata);
  if (context) form.append('context', context);

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
    metadata: data.metadata || null,
    context: data.context || null
  });
}

/**
 * 노트명 변경 시 Content 폴더 + 앞/뒤 표지 public_id를 함께 바꾸고 Notion URL 갱신
 * Body: {
 *   oldNoteName?, newNoteName, pdfFolderUrl?, noteId?, pageCount?,
 *   coverFrontUrl?, coverBackUrl?
 * }
 */
async function handleRenameFolder(req, res, body) {
  const credentials = getCloudinaryCredentials();
  if (!credentials) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: 'CLOUDINARY_URL 또는 CLOUDINARY_* 환경 변수가 필요합니다'
    });
  }

  const oldNoteName = trimOrEmpty(body.oldNoteName);
  const newNoteName = trimOrEmpty(body.newNoteName);
  if (!newNoteName) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'newNoteName은 필수입니다'
    });
  }

  const oldStem = sanitizePublicIdStem(oldNoteName || 'page');
  const newStem = sanitizePublicIdStem(newNoteName);
  const pdfFolderUrl = trimOrEmpty(body.pdfFolderUrl);
  const fromParsed = parseFolderParam(pdfFolderUrl);
  const fromPath =
    fromParsed.folderPath || (oldNoteName ? contentFolderForNoteName(oldNoteName) : null);
  const toPath = contentFolderForNoteName(newNoteName);

  let newFolderUrl = pdfFolderUrl;
  let contentRenamed = false;
  let contentSkippedReason = '';

  /* 1) Content 폴더 이동 (있을 때만) */
  if (fromPath && fromPath !== toPath) {
    const moveRes = await fetch(
      `https://api.cloudinary.com/v1_1/${credentials.cloudName}/folders/${fromPath
        .split('/')
        .map((s) => encodeURIComponent(s))
        .join('/')}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${credentials.apiKey}:${credentials.apiSecret}`
          ).toString('base64')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ to_folder: toPath })
      }
    );
    const moveData = await moveRes.json().catch(() => ({}));
    if (moveRes.ok) {
      contentRenamed = true;
      newFolderUrl = rewriteFolderBaseUrl(pdfFolderUrl, fromPath, toPath);
    } else {
      const msg = moveData?.error?.message || '';
      if (/not found|does not exist/i.test(msg) || moveRes.status === 404) {
        contentSkippedReason = 'Content 폴더가 아직 없어 이름 변경을 건너뜁니다';
        newFolderUrl = '';
      } else {
        return res.status(moveRes.status).json({
          error: 'Cloudinary folder rename failed',
          details: moveData,
          message: msg || 'Content 폴더 이름 변경에 실패했습니다'
        });
      }
    }
  } else if (fromPath === toPath) {
    contentSkippedReason = 'Content 폴더명이 동일합니다';
  } else {
    contentSkippedReason = '이동할 Content 폴더가 없습니다';
  }

  /* 2) 앞/뒤 표지 public_id 변경 */
  let coverFrontUrl = trimOrEmpty(body.coverFrontUrl);
  let coverBackUrl = trimOrEmpty(body.coverBackUrl);
  const coverResults = { front: null, back: null };

  if (oldStem && newStem && oldStem !== newStem) {
    for (const kind of ['front', 'back']) {
      const fromId = coverPublicId(kind, oldNoteName || oldStem);
      const toId = coverPublicId(kind, newNoteName);
      const renamed = await renameCloudinaryAsset(credentials, fromId, toId);
      coverResults[kind] = {
        ok: renamed.ok,
        status: renamed.status,
        from: fromId,
        to: toId,
        message: renamed.data?.error?.message || null,
        url: renamed.data?.secure_url || renamed.data?.url || null
      };

      if (renamed.ok) {
        const nextUrl =
          coverResults[kind].url ||
          rewriteCoverUrl(kind === 'back' ? coverBackUrl : coverFrontUrl, oldStem, newStem);
        if (kind === 'front') coverFrontUrl = nextUrl;
        else coverBackUrl = nextUrl;
      } else {
        const msg = renamed.data?.error?.message || '';
        /* 표지가 없으면 스킵, 그 외는 실패로 중단 */
        if (!/not found|does not exist|resource not found/i.test(msg) && renamed.status !== 404) {
          return res.status(renamed.status || 500).json({
            error: 'Cloudinary cover rename failed',
            details: renamed.data,
            message: msg || `${kind === 'front' ? '앞' : '뒤'}표지 파일명 변경에 실패했습니다`,
            coverResults
          });
        }
      }
    }
  }

  /* 3) Notion URL 필드 갱신 */
  const noteId = trimOrEmpty(body.noteId).replace(/-/g, '');
  const pageCount = Number(body.pageCount);
  const notionPatch = {};

  if (noteId) {
    const database = await notionFetch(`/databases/${NOTEBOOK_DB_ID}`);
    const schema = database?.properties || {};

    if (newFolderUrl) {
      const folderUrlProp = findSchemaProperty(
        schema,
        'pdf_folder_url',
        'PDF Folder URL',
        'pdf folder url'
      );
      if (folderUrlProp && ['url', 'rich_text'].includes(folderUrlProp.type)) {
        const folderPayload = buildNotionPropertyPayload(folderUrlProp, newFolderUrl);
        if (folderPayload) notionPatch[folderUrlProp.key] = folderPayload;
      }
      if (Number.isFinite(pageCount) && pageCount >= 1) {
        const pageCountProp = findSchemaProperty(
          schema,
          'page_count',
          'Page Count',
          'page count'
        );
        if (pageCountProp && ['number', 'rich_text'].includes(pageCountProp.type)) {
          const countPayload = buildNotionPropertyPayload(pageCountProp, pageCount);
          if (countPayload) notionPatch[pageCountProp.key] = countPayload;
        }
      }
    }

    if (coverFrontUrl) {
      const frontProp = findSchemaProperty(
        schema,
        'cover_front_url',
        'cover front url',
        'Cover Front URL',
        'cover_front',
        '앞표지'
      );
      const frontPayload = buildNotionPropertyPayload(frontProp, coverFrontUrl);
      if (frontPayload) notionPatch[frontProp.key] = frontPayload;
    }
    if (coverBackUrl) {
      const backProp = findSchemaProperty(
        schema,
        'cover_back_url',
        'cover back url',
        'Cover Back URL',
        'cover_back',
        '뒷표지'
      );
      const backPayload = buildNotionPropertyPayload(backProp, coverBackUrl);
      if (backPayload) notionPatch[backProp.key] = backPayload;
    }

    if (Object.keys(notionPatch).length) {
      await notionFetch(`/pages/${noteId}`, {
        method: 'PATCH',
        body: { properties: notionPatch }
      });
    }
  }

  return res.status(200).json({
    ok: true,
    contentRenamed,
    contentSkippedReason: contentSkippedReason || undefined,
    folderPath: toPath,
    fromPath: fromPath || null,
    pdfFolderUrl: newFolderUrl || '',
    coverFrontUrl: coverFrontUrl || '',
    coverBackUrl: coverBackUrl || '',
    coverResults
  });
}

async function handleDeletePage(req, res, body) {
  const credentials = getCloudinaryCredentials();
  if (!credentials) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: 'CLOUDINARY_URL 또는 CLOUDINARY_* 환경 변수가 필요합니다'
    });
  }

  const pageNumber = Math.max(1, Math.floor(Number(body.pageNumber) || 0));
  const pageCount = Math.max(0, Math.floor(Number(body.pageCount) || 0));
  const noteId = trimOrEmpty(body.noteId || body.id).replace(/-/g, '');
  const pdfFolderUrl = trimOrEmpty(body.pdfFolderUrl || body.folder);
  const folder =
    folderPathFromDeliveryUrl(body.folder || pdfFolderUrl) ||
    parseFolderParam(body.folder || pdfFolderUrl).folderPath ||
    trimOrEmpty(body.folder).replace(/\/+$/, '');

  if (!folder) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'folder는 필수입니다'
    });
  }
  if (!pageNumber || !pageCount || pageNumber > pageCount) {
    return res.status(400).json({
      error: 'Validation failed',
      message: '유효한 pageNumber와 pageCount가 필요합니다'
    });
  }

  const targetId = `${folder}/${pageStem(pageNumber)}`;
  const destroyed = await destroyCloudinaryAsset(credentials, targetId);
  if (!destroyed.ok) {
    const msg = destroyed.data?.error?.message || destroyed.data?.result || '';
    if (!/not found|does not exist|resource not found|not found/i.test(String(msg)) && destroyed.data?.result !== 'not found') {
      return res.status(destroyed.status || 500).json({
        error: 'Cloudinary page delete failed',
        message: msg || '페이지 삭제에 실패했습니다',
        details: destroyed.data
      });
    }
  }

  /* 뒤 페이지를 한 칸씩 앞으로: page-(N+1) → page-N … (앞에서부터) */
  const shiftResults = [];
  for (let i = pageNumber + 1; i <= pageCount; i += 1) {
    const fromId = `${folder}/${pageStem(i)}`;
    const toId = `${folder}/${pageStem(i - 1)}`;
    const renamed = await renameCloudinaryAsset(credentials, fromId, toId);
    shiftResults.push({
      from: fromId,
      to: toId,
      ok: renamed.ok,
      status: renamed.status,
      message: renamed.data?.error?.message || null
    });
    if (!renamed.ok) {
      const msg = renamed.data?.error?.message || '';
      if (!/not found|does not exist|resource not found/i.test(msg) && renamed.status !== 404) {
        return res.status(renamed.status || 500).json({
          error: 'Cloudinary page compact failed',
          message: msg || '뒤 페이지 번호 갱신에 실패했습니다',
          details: renamed.data,
          shiftResults
        });
      }
    }
  }

  const nextCount = pageCount - 1;
  let notion = null;
  if (noteId && pdfFolderUrl) {
    const database = await notionFetch(`/databases/${NOTEBOOK_DB_ID}`);
    const schema = database?.properties || {};
    const folderUrlProp = findSchemaProperty(
      schema,
      'pdf_folder_url',
      'PDF Folder URL',
      'pdf folder url'
    );
    const pageCountProp = findSchemaProperty(schema, 'page_count', 'Page Count', 'page count');
    const properties = {};
    if (folderUrlProp && ['url', 'rich_text'].includes(folderUrlProp.type)) {
      const folderPayload = buildNotionPropertyPayload(folderUrlProp, pdfFolderUrl);
      if (folderPayload) properties[folderUrlProp.key] = folderPayload;
    }
    if (pageCountProp && ['number', 'rich_text'].includes(pageCountProp.type)) {
      const countPayload = buildNotionPropertyPayload(pageCountProp, nextCount);
      if (countPayload) properties[pageCountProp.key] = countPayload;
    }
    if (Object.keys(properties).length) {
      const page = await notionFetch(`/pages/${noteId}`, {
        method: 'PATCH',
        body: { properties }
      });
      notion = { ok: true, id: page.id, pageCount: nextCount };
    }
  }

  return res.status(200).json({
    ok: true,
    folder,
    deletedPage: pageNumber,
    pageCount: nextCount,
    pdfFolderUrl: pdfFolderUrl || '',
    shiftResults,
    notion
  });
}

async function handleShiftPages(req, res, body) {
  const credentials = getCloudinaryCredentials();
  if (!credentials) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: 'CLOUDINARY_URL 또는 CLOUDINARY_* 환경 변수가 필요합니다'
    });
  }

  const afterPage = Math.max(0, Math.floor(Number(body.afterPage) || 0));
  const shiftBy = Math.max(1, Math.floor(Number(body.shiftBy) || 1));
  const pageCount = Math.max(0, Math.floor(Number(body.pageCount) || 0));
  const folder =
    folderPathFromDeliveryUrl(body.folder) ||
    parseFolderParam(body.folder).folderPath ||
    trimOrEmpty(body.folder).replace(/\/+$/, '');

  if (!folder) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'folder는 필수입니다'
    });
  }
  if (pageCount < 1) {
    return res.status(200).json({ ok: true, shifted: 0, folder });
  }
  if (afterPage > pageCount) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'afterPage가 pageCount보다 클 수 없습니다'
    });
  }

  /* 끝 페이지부터 올려 번호 충돌을 피함: page-N → page-(N+shiftBy) */
  const results = [];
  for (let i = pageCount; i >= afterPage + 1; i -= 1) {
    const fromId = `${folder}/${pageStem(i)}`;
    const toId = `${folder}/${pageStem(i + shiftBy)}`;
    const renamed = await renameCloudinaryAsset(credentials, fromId, toId);
    results.push({
      from: fromId,
      to: toId,
      ok: renamed.ok,
      status: renamed.status,
      message: renamed.data?.error?.message || null
    });
    if (!renamed.ok) {
      const msg = renamed.data?.error?.message || '';
      if (!/not found|does not exist|resource not found/i.test(msg) && renamed.status !== 404) {
        return res.status(renamed.status || 500).json({
          error: 'Cloudinary page shift failed',
          message: msg || '페이지 번호 갱신에 실패했습니다',
          details: renamed.data,
          results
        });
      }
    }
  }

  return res.status(200).json({
    ok: true,
    folder,
    afterPage,
    shiftBy,
    pageCount,
    shifted: Math.max(0, pageCount - afterPage),
    results
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
    if (op === 'renameFolder') return await handleRenameFolder(req, res, body);
    if (op === 'shiftPages') return await handleShiftPages(req, res, body);
    if (op === 'deletePage') return await handleDeletePage(req, res, body);

    return res.status(400).json({
      error: 'Validation failed',
      message:
        "op은 'upload' | 'updateNote' | 'updateMeta' | 'renameFolder' | 'shiftPages' | 'deletePage' 중 하나여야 합니다"
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: 'pages API failed',
      message: error.message,
      details: error.details
    });
  }
}
