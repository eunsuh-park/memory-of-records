#!/usr/bin/env node
/**
 * Cloudinary 노트 asset을 notebooks/{public_id}/... 규칙으로 정리한다.
 *
 * 1) Notion all_notebooks 를 읽기만 한다 (수정 없음)
 * 2) name 으로 Cloudinary asset 을 매칭한다
 * 3) 폴더를 먼저 만들고, 그다음 rename 한다
 *
 *   npm run migrate:cloudinary -- --dry-run
 *   npm run migrate:cloudinary -- --create-folders
 *   npm run migrate:cloudinary -- --execute
 *
 * 기본값은 dry-run. Notion PATCH / 삭제 / 재업로드는 하지 않는다.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCloudinaryCredentials } from '../api/_lib/cloudinaryAuth.js';
import {
  NOTEBOOK_DB_ID,
  findSchemaProperty,
  findTitleProperty,
  notionFetch
} from '../api/_lib/notionDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const PLAN_PATH = path.join(DATA_DIR, 'cloudinary-rename-plan.json');
const LOG_PATH = path.join(DATA_DIR, 'cloudinary-rename-log.json');

const PUBLIC_ID_RE = /^[A-Z]{4}-\d{4}-\d{4}$/;
const EXCLUDE_FOLDER_PREFIXES = ['bookmark note', 'my brand'];
const EXCLUDE_PUBLIC_ID_PREFIXES = ['samples/', 'cld-sample', 'main-sample'];
const SOURCE_FOLDER_HINTS = ['notebooks_v', 'notebook_v', 'notebooks/', 'notebook/'];

const args = process.argv.slice(2);
const WANT_EXECUTE = args.includes('--execute');
const WANT_FOLDERS = args.includes('--create-folders');
const FORCE_DRY_RUN = args.includes('--dry-run') || (!WANT_EXECUTE && !WANT_FOLDERS);
const MODE = FORCE_DRY_RUN ? 'dry-run' : WANT_EXECUTE ? 'execute' : 'create-folders';

loadDotEnv();

function loadDotEnv() {
  for (const fileName of ['.env', '.env.local']) {
    const filePath = path.join(ROOT, fileName);
    if (!fs.existsSync(filePath)) continue;
    const text = fs.readFileSync(filePath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null || process.env[key] === '') process.env[key] = value;
    }
  }
}

function basicAuth(credentials) {
  return `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64')}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function toNfc(value) {
  return String(value || '').normalize('NFC');
}

function stripUploadNoise(name) {
  let value = toNfc(name).replace(/\.[a-z0-9]+$/i, '');
  value = value.replace(/_(front|back)$/i, '');
  value = value.replace(/_[a-z0-9]{6}$/i, '');
  value = value.replace(/_(front|back)$/i, '');
  value = value.replace(/_+$/g, '');
  return value;
}

function sanitizeStem(name) {
  return (
    stripUploadNoise(name)
      .replace(/[()]/g, '_')
      .replace(/[\/\\?#%&{}<>*|"`]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 120) || ''
  );
}

function normalizeName(name) {
  return sanitizeStem(name)
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./]+/g, '');
}

const FOLDER_NAME_ALIASES = {
  '2024_스케줄러': '01_2024_스케줄러'
};

function stripPageSuffix(name) {
  return String(name || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]page-\d{1,6}(?:_[a-z0-9]+)?$/i, '')
    .replace(/[-_]+\d{1,6}$/, '');
}

function lastSegment(value) {
  const parts = String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean);
  return parts[parts.length - 1] || '';
}

function parentFolder(value) {
  const parts = String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean);
  return parts.slice(0, -1).join('/');
}

function decodePathSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function extractPublicIdFromUrl(url) {
  const trimmed = String(url || '').trim();
  const match = trimmed.match(/^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/(.+)$/i);
  if (!match) return null;
  const segments = match[1].split('/').filter(Boolean).map(decodePathSegment);
  while (segments.length && (/^v\d+$/.test(segments[0]) || segments[0].includes(','))) {
    segments.shift();
  }
  if (!segments.length) return null;
  const last = segments[segments.length - 1].replace(/\.[a-z0-9]+$/i, '');
  segments[segments.length - 1] = last;
  return segments.join('/');
}

function readPropertyValue(property) {
  if (!property) return null;
  switch (property.type) {
    case 'title':
      return property.title?.map((t) => t.plain_text).join('') || '';
    case 'rich_text':
      return property.rich_text?.map((t) => t.plain_text).join('') || '';
    case 'url':
      return property.url || null;
    case 'number':
      return property.number ?? null;
    case 'select':
      return property.select?.name || null;
    default:
      return null;
  }
}

function isExcludedAsset(asset) {
  const folder = String(asset.asset_folder || asset.folder || '').toLowerCase();
  const publicId = String(asset.public_id || '').toLowerCase();
  if (EXCLUDE_PUBLIC_ID_PREFIXES.some((prefix) => publicId === prefix || publicId.startsWith(prefix))) {
    return true;
  }
  return EXCLUDE_FOLDER_PREFIXES.some(
    (prefix) => folder === prefix || folder.startsWith(`${prefix}/`) || publicId.startsWith(`${prefix}/`)
  );
}

function looksLikeSourceNotebookAsset(asset) {
  const folder = String(asset.asset_folder || asset.folder || publicIdFolder(asset) || '').toLowerCase();
  const publicId = String(asset.public_id || '').toLowerCase();
  if (publicId.startsWith('notebooks/')) return true;
  return SOURCE_FOLDER_HINTS.some((hint) => folder.includes(hint) || publicId.includes(hint));
}

function publicIdFolder(asset) {
  const publicId = String(asset.public_id || '');
  const idx = publicId.lastIndexOf('/');
  return idx > 0 ? publicId.slice(0, idx) : '';
}

function parseAlreadyRenamed(publicId) {
  const match = String(publicId || '').match(
    /^notebooks\/([A-Z]{4}-\d{4}-\d{4})\/(cover_front|cover_back|pages\/page-(\d{6}))$/
  );
  if (!match) return null;
  if (match[2] === 'cover_front') return { notePublicId: match[1], role: 'cover_front' };
  if (match[2] === 'cover_back') return { notePublicId: match[1], role: 'cover_back' };
  return { notePublicId: match[1], role: 'page', pageNumber: Number(match[3]) };
}

function detectRole(asset) {
  const already = parseAlreadyRenamed(asset.public_id);
  if (already) return already.role;
  const haystack = [asset.asset_folder, asset.folder, asset.public_id].filter(Boolean).join('/');
  if (/cover\/front/i.test(haystack) || /\/front\//i.test(`/${haystack}/`)) return 'cover_front';
  if (/cover\/back/i.test(haystack) || /\/back\//i.test(`/${haystack}/`)) return 'cover_back';
  if (
    /\/pages\//i.test(haystack) ||
    /content/i.test(haystack) ||
    /page-\d+/i.test(String(asset.public_id || '')) ||
    /page-\d+/i.test(String(asset.display_name || '')) ||
    /page-\d+/i.test(String(asset.filename || ''))
  ) {
    return 'page';
  }
  return null;
}

function extractPageNumber(asset) {
  const already = parseAlreadyRenamed(asset.public_id);
  if (already?.pageNumber) return already.pageNumber;
  const candidates = [asset.public_id, asset.display_name, asset.filename, lastSegment(asset.public_id)].map(
    (value) => stripUploadNoise(lastSegment(value))
  );
  for (const candidate of candidates) {
    const pageMatch = String(candidate || '').match(/page-(\d{1,6})$/i);
    if (pageMatch) return Number(pageMatch[1]);
  }
  for (const candidate of candidates) {
    const numbered = String(candidate || '').match(/^(\d{1,6})$/);
    if (numbered) return Number(numbered[1]);
  }
  for (const candidate of candidates) {
    const tail = String(candidate || '').match(/[_-](\d{1,6})$/);
    if (tail) return Number(tail[1]);
  }
  return null;
}

function pageStem(pageNumber) {
  return `page-${String(pageNumber).padStart(6, '0')}`;
}

function targetPublicId(notePublicId, role, pageNumber) {
  if (role === 'cover_front') return `notebooks/${notePublicId}/cover_front`;
  if (role === 'cover_back') return `notebooks/${notePublicId}/cover_back`;
  return `notebooks/${notePublicId}/pages/${pageStem(pageNumber)}`;
}

function nameKeysForNote(name) {
  const raw = toNfc(name).trim();
  const stem = sanitizeStem(raw);
  const stripped = stripPageSuffix(raw);
  const strippedStem = sanitizeStem(stripped);
  const withoutPrefix = stem.replace(/^\d{2}_/, '');
  return [
    ...new Set(
      [raw, stem, stripped, strippedStem, withoutPrefix, normalizeName(raw), normalizeName(stem), normalizeName(withoutPrefix)].filter(
        Boolean
      )
    )
  ];
}

function nameKeysForAsset(asset) {
  const filename = stripUploadNoise(asset.filename || lastSegment(asset.public_id) || '');
  const displayName = stripUploadNoise(asset.display_name || '');
  const folderName = lastSegment(asset.asset_folder || asset.folder || parentFolder(asset.public_id));
  const aliasedFolder = FOLDER_NAME_ALIASES[toNfc(folderName)] || folderName;
  const keys = [];
  for (const value of [displayName, filename, folderName, aliasedFolder]) {
    if (!value) continue;
    const nfcValue = toNfc(value);
    if (/^page-\d+/i.test(nfcValue) || /^(front|back|contents?)$/i.test(nfcValue)) continue;
    keys.push(nfcValue, sanitizeStem(nfcValue), stripPageSuffix(nfcValue), sanitizeStem(stripPageSuffix(nfcValue)));
    keys.push(normalizeName(nfcValue), normalizeName(stripPageSuffix(nfcValue)));
  }
  return [...new Set(keys.filter(Boolean))];
}

async function queryAllNotionPages(databaseId) {
  const results = [];
  let cursor = null;
  do {
    const data = await notionFetch(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: cursor ? { start_cursor: cursor } : {}
    });
    results.push(...(data?.results || []));
    cursor = data?.has_more ? data?.next_cursor : null;
  } while (cursor);
  return results;
}

async function loadNotionNotes() {
  const database = await notionFetch(`/databases/${NOTEBOOK_DB_ID}`);
  const schema = database?.properties || {};
  const titleProp = findTitleProperty(schema);
  const publicIdProp = findSchemaProperty(schema, 'public_id', 'publicId', 'Public ID');
  const frontProp = findSchemaProperty(
    schema,
    'cover_front_url',
    'cover front url',
    'Cover Front URL',
    'cover_front',
    '앞표지'
  );
  const backProp = findSchemaProperty(
    schema,
    'cover_back_url',
    'cover back url',
    'Cover Back URL',
    'cover_back',
    '뒷표지'
  );
  const folderProp = findSchemaProperty(schema, 'pdf_folder_url', 'PDF Folder URL', 'pdf folder url');
  if (!titleProp) throw new Error('Notion DB에 name/title 속성이 없습니다');
  if (!publicIdProp) throw new Error('Notion DB에 public_id 속성이 없습니다');

  const pages = await queryAllNotionPages(NOTEBOOK_DB_ID);
  return pages.map((page) => {
    const properties = page.properties || {};
    return {
      pageId: page.id,
      name: String(readPropertyValue(properties[titleProp.key]) || '').trim(),
      publicId: String(readPropertyValue(properties[publicIdProp.key]) || '').trim(),
      coverFrontUrl: readPropertyValue(frontProp ? properties[frontProp.key] : null),
      coverBackUrl: readPropertyValue(backProp ? properties[backProp.key] : null),
      pdfFolderUrl: readPropertyValue(folderProp ? properties[folderProp.key] : null)
    };
  });
}

async function cloudinarySearchAll(credentials, expression) {
  const resources = [];
  let cursor = null;
  do {
    const body = {
      expression,
      max_results: 500,
      with_field: ['context', 'tags']
    };
    if (cursor) body.next_cursor = cursor;
    const response = await fetch(`https://api.cloudinary.com/v1_1/${credentials.cloudName}/resources/search`, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(credentials),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Cloudinary Search ${response.status}: ${data?.error?.message || '?'}`);
    }
    resources.push(...(data?.resources || []));
    cursor = data?.next_cursor || null;
  } while (cursor);
  return resources;
}

async function cloudinaryCreateFolder(credentials, folderPath) {
  const encoded = folderPath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const response = await fetch(`https://api.cloudinary.com/v1_1/${credentials.cloudName}/folders/${encoded}`, {
    method: 'POST',
    headers: { Authorization: basicAuth(credentials) }
  });
  const data = await response.json().catch(() => ({}));
  if (response.ok) return { ok: true, status: 'created', data };
  const message = String(data?.error?.message || '');
  if (/already exists|already exist/i.test(message) || response.status === 409) {
    return { ok: true, status: 'exists', data };
  }
  return { ok: false, status: 'error', message: message || `HTTP ${response.status}`, data };
}

async function cloudinaryRename(credentials, fromPublicId, toPublicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    from_public_id: fromPublicId,
    invalidate: 'true',
    overwrite: 'false',
    timestamp: String(timestamp),
    to_public_id: toPublicId
  };
  const signatureBase = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join('&');
  const signature = crypto.createHash('sha1').update(signatureBase + credentials.apiSecret).digest('hex');
  const form = new FormData();
  form.append('from_public_id', fromPublicId);
  form.append('to_public_id', toPublicId);
  form.append('timestamp', String(timestamp));
  form.append('api_key', credentials.apiKey);
  form.append('signature', signature);
  form.append('overwrite', 'false');
  form.append('invalidate', 'true');
  const response = await fetch(`https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/rename`, {
    method: 'POST',
    body: form
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function cloudinaryUpdateAssetFolder(credentials, publicId, assetFolder) {
  const encoded = encodeURIComponent(publicId);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/resources/image/upload/${encoded}`,
    {
      method: 'POST',
      headers: {
        Authorization: basicAuth(credentials),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ asset_folder: assetFolder })
    }
  );
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

function buildNoteIndex(notes) {
  const byKey = new Map();
  const duplicateNames = new Set();
  const duplicatePublicIds = new Set();
  const seenPublicIds = new Map();

  for (const note of notes) {
    if (note.publicId) {
      const prev = seenPublicIds.get(note.publicId);
      if (prev && prev.pageId !== note.pageId) duplicatePublicIds.add(note.publicId);
      else seenPublicIds.set(note.publicId, note);
    }
    for (const key of nameKeysForNote(note.name)) {
      const existing = byKey.get(key);
      if (existing && existing.pageId !== note.pageId) duplicateNames.add(note.name);
      else byKey.set(key, note);
    }
  }

  return { byKey, duplicateNames, duplicatePublicIds };
}

function urlRoleHint(note, asset) {
  const assetId = String(asset.public_id || '');
  const frontId = extractPublicIdFromUrl(note.coverFrontUrl);
  const backId = extractPublicIdFromUrl(note.coverBackUrl);
  const folderId = extractPublicIdFromUrl(note.pdfFolderUrl);
  if (frontId && (assetId === frontId || assetId.endsWith(`/${lastSegment(frontId)}`))) return 'cover_front';
  if (backId && (assetId === backId || assetId.endsWith(`/${lastSegment(backId)}`))) return 'cover_back';
  if (folderId && (assetId === folderId || assetId.startsWith(`${folderId}/`) || parentFolder(assetId) === folderId)) {
    return 'page';
  }
  return null;
}

function buildPlan(notes, assets, previousLog) {
  const { byKey, duplicateNames, duplicatePublicIds } = buildNoteIndex(notes);
  const doneKeys = new Set(
    (previousLog?.renames || []).filter((item) => item.status === 'renamed' || item.status === 'already-renamed').map((item) => `${item.from}=>${item.to}`)
  );
  const existingPublicIds = new Map();
  for (const asset of assets) {
    if (asset.public_id) existingPublicIds.set(asset.public_id, asset);
  }

  const notePlans = new Map();
  for (const note of notes) {
    notePlans.set(note.pageId, {
      note,
      folders: note.publicId
        ? [`notebooks/${note.publicId}`, `notebooks/${note.publicId}/pages`]
        : [],
      coverFront: null,
      coverBack: null,
      pages: [],
      unmatchedAssets: [],
      errors: [],
      warnings: []
    });
  }

  const unmatchedAssets = [];
  const ambiguousAssets = [];
  const errors = [];
  const usedAssetIds = new Map();

  for (const note of notes) {
    const plan = notePlans.get(note.pageId);
    if (!note.name) plan.errors.push('Notion name 이 비어 있음');
    if (!note.publicId) plan.errors.push('Notion public_id 가 비어 있음');
    else if (!PUBLIC_ID_RE.test(note.publicId)) {
      plan.errors.push(`public_id 형식 오류: ${note.publicId}`);
    }
    if (duplicateNames.has(note.name)) plan.errors.push(`동일한 name 의 노트가 둘 이상: ${note.name}`);
    if (note.publicId && duplicatePublicIds.has(note.publicId)) {
      plan.errors.push(`동일한 public_id 를 쓰는 노트가 둘 이상: ${note.publicId}`);
    }
  }

  for (const asset of assets) {
    if (isExcludedAsset(asset)) continue;
    const already = parseAlreadyRenamed(asset.public_id);
    if (already) {
      const note = notes.find((item) => item.publicId === already.notePublicId);
      if (!note) {
        unmatchedAssets.push({
          publicId: asset.public_id,
          reason: `이미 notebooks/ 아래지만 Notion public_id 없음: ${already.notePublicId}`
        });
        continue;
      }
      const plan = notePlans.get(note.pageId);
      assignAsset(plan, asset, already.role, already.pageNumber, 'already-renamed');
      continue;
    }

    if (!looksLikeSourceNotebookAsset(asset)) {
      unmatchedAssets.push({ publicId: asset.public_id, reason: '노트 폴더로 보이지 않음' });
      continue;
    }

    const keys = nameKeysForAsset(asset);
    const matchedNotes = [];
    for (const key of keys) {
      const note = byKey.get(key);
      if (note && !matchedNotes.some((item) => item.pageId === note.pageId)) matchedNotes.push(note);
    }

    if (matchedNotes.length === 0) {
      unmatchedAssets.push({
        publicId: asset.public_id,
        displayName: asset.display_name || null,
        filename: asset.filename || lastSegment(asset.public_id),
        assetFolder: asset.asset_folder || asset.folder || null,
        reason: 'Notion name 매칭 없음'
      });
      continue;
    }
    if (matchedNotes.length > 1) {
      ambiguousAssets.push({
        publicId: asset.public_id,
        names: matchedNotes.map((item) => item.name),
        reason: '여러 Notion 노트와 name 이 맞음'
      });
      continue;
    }

    const note = matchedNotes[0];
    const plan = notePlans.get(note.pageId);
    const pathRole = detectRole(asset);
    const hintedRole = urlRoleHint(note, asset);
    if (pathRole && hintedRole && pathRole !== hintedRole) {
      plan.errors.push(
        `역할 불일치: ${asset.public_id} (경로=${pathRole}, URL=${hintedRole})`
      );
      continue;
    }
    const role = pathRole || hintedRole;
    if (!role) {
      plan.errors.push(`역할을 판별할 수 없음: ${asset.public_id}`);
      continue;
    }
    const pageNumber = role === 'page' ? extractPageNumber(asset) : null;
    if (role === 'page' && !pageNumber) {
      unmatchedAssets.push({
        publicId: asset.public_id,
        displayName: asset.display_name || null,
        filename: asset.filename || lastSegment(asset.public_id),
        assetFolder: asset.asset_folder || asset.folder || null,
        reason: '페이지 번호를 판별할 수 없음'
      });
      continue;
    }
    assignAsset(plan, asset, role, pageNumber, 'MATCHED');
  }

  const mappings = [];
  const duplicateTargets = [];
  const targetOwners = new Map();

  for (const plan of notePlans.values()) {
    const items = collectPlanItems(plan);
    const pageNumbers = items.filter((item) => item.role === 'page').map((item) => item.pageNumber);
    if (pageNumbers.length) {
      const unique = [...new Set(pageNumbers)].sort((a, b) => a - b);
      if (unique.length !== pageNumbers.length) {
        plan.errors.push('페이지 번호가 중복됨');
      }
    }

    for (const item of items) {
      const to = targetPublicId(plan.note.publicId, item.role, item.pageNumber);
      const occupant = existingPublicIds.get(to);
      const alreadyThis =
        occupant &&
        (occupant.asset_id === item.asset.asset_id || occupant.public_id === item.asset.public_id);
      if (occupant && !alreadyThis) {
        duplicateTargets.push({ from: item.asset.public_id, to, occupant: occupant.public_id });
        plan.errors.push(`target 이 이미 다른 asset 에 있음: ${to}`);
      }
      const prevOwner = targetOwners.get(to);
      if (prevOwner && prevOwner !== item.asset.public_id) {
        duplicateTargets.push({ from: item.asset.public_id, to, occupant: prevOwner });
        plan.errors.push(`같은 target 에 asset 이 둘 이상 매핑됨: ${to}`);
      } else {
        targetOwners.set(to, item.asset.public_id);
      }

      const assetKey = item.asset.asset_id || item.asset.public_id;
      const mappedTo = usedAssetIds.get(assetKey);
      if (mappedTo && mappedTo !== to) {
        plan.errors.push(`같은 asset 이 target 두 개에 매핑됨: ${item.asset.public_id}`);
      } else {
        usedAssetIds.set(assetKey, to);
      }

      const status =
        item.asset.public_id === to || item.status === 'already-renamed'
          ? 'already-renamed'
          : doneKeys.has(`${item.asset.public_id}=>${to}`)
            ? 'already-renamed'
            : 'MATCHED';
      mappings.push({
        noteName: plan.note.name,
        notePublicId: plan.note.publicId,
        role: item.role,
        pageNumber: item.pageNumber || null,
        from: item.asset.public_id,
        to,
        assetId: item.asset.asset_id || null,
        status,
        assetFolder: item.asset.asset_folder || item.asset.folder || null
      });
    }
  }

  const blockingErrors = [];
  for (const plan of notePlans.values()) {
    blockingErrors.push(...plan.errors.map((message) => `${plan.note.name}: ${message}`));
  }
  blockingErrors.push(...ambiguousAssets.map((item) => `ambiguous: ${item.publicId} (${item.names.join(', ')})`));
  blockingErrors.push(...duplicateTargets.map((item) => `duplicate target: ${item.from} → ${item.to}`));

  return {
    notes,
    notePlans,
    mappings,
    unmatchedAssets,
    ambiguousAssets,
    duplicateTargets,
    errors: blockingErrors,
    duplicateNames: [...duplicateNames],
    duplicatePublicIds: [...duplicatePublicIds]
  };
}

function assignAsset(plan, asset, role, pageNumber, status) {
  const record = { asset, role, pageNumber: pageNumber || null, status };
  if (role === 'cover_front') {
    if (plan.coverFront) plan.errors.push(`cover_front 가 둘 이상: ${plan.coverFront.asset.public_id}, ${asset.public_id}`);
    else plan.coverFront = record;
    return;
  }
  if (role === 'cover_back') {
    if (plan.coverBack) plan.errors.push(`cover_back 이 둘 이상: ${plan.coverBack.asset.public_id}, ${asset.public_id}`);
    else plan.coverBack = record;
    return;
  }
  plan.pages.push(record);
}

function collectPlanItems(plan) {
  const items = [];
  if (plan.coverFront) items.push(plan.coverFront);
  if (plan.coverBack) items.push(plan.coverBack);
  const pages = [...plan.pages].sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));
  items.push(...pages);
  return items;
}

function printPlan(plan, assetCount) {
  for (const notePlan of [...plan.notePlans.values()].sort((a, b) => a.note.name.localeCompare(b.note.name, 'ko'))) {
    const note = notePlan.note;
    console.log(`\n[${note.name}]  public_id=${note.publicId || '(없음)'}`);
    console.log('FOLDER');
    if (!notePlan.folders.length) {
      console.log('  status: SKIP (public_id 없음)');
    } else {
      for (const folder of notePlan.folders) console.log(`  ${folder}`);
      console.log(`  status: ${notePlan.errors.length ? 'BLOCKED' : 'CREATE'}`);
    }

    const rows = [
      ['COVER_FRONT', notePlan.coverFront],
      ['COVER_BACK', notePlan.coverBack],
      ...[...notePlan.pages]
        .sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0))
        .map((item) => [`PAGE ${item.pageNumber}`, item])
    ];
    for (const [label, item] of rows) {
      if (!item) {
        if (label.startsWith('COVER')) {
          console.log(`\n${label}`);
          console.log('old: (없음)');
          console.log('new: (없음)');
          console.log('status: UNMATCHED');
        }
        continue;
      }
      const to = targetPublicId(note.publicId, item.role, item.pageNumber);
      const status = item.asset.public_id === to || item.status === 'already-renamed' ? 'already-renamed' : 'MATCHED';
      console.log(`\n${label}`);
      console.log(`old: ${item.asset.public_id}`);
      console.log(`new: ${to}`);
      console.log(`status: ${status}`);
    }
    for (const message of notePlan.errors) console.log(`ERROR: ${message}`);
  }

  if (plan.unmatchedAssets.length) {
    console.log('\n=== unmatched Cloudinary assets ===');
    for (const item of plan.unmatchedAssets.slice(0, 50)) {
      console.log(`- ${item.publicId} (${item.reason})`);
    }
    if (plan.unmatchedAssets.length > 50) console.log(`... 외 ${plan.unmatchedAssets.length - 50}개`);
  }
  if (plan.ambiguousAssets.length) {
    console.log('\n=== ambiguous assets ===');
    for (const item of plan.ambiguousAssets) {
      console.log(`- ${item.publicId} → ${item.names.join(', ')}`);
    }
  }

  const matched = plan.mappings.filter((item) => item.status === 'MATCHED').length;
  const already = plan.mappings.filter((item) => item.status === 'already-renamed').length;
  console.log('\n=== 요약 ===');
  console.log(`- total Notion notes: ${plan.notes.length}`);
  console.log(`- total Cloudinary assets: ${assetCount}`);
  console.log(`- matched assets: ${matched}`);
  console.log(`- unmatched assets: ${plan.unmatchedAssets.length}`);
  console.log(`- ambiguous assets: ${plan.ambiguousAssets.length}`);
  console.log(`- duplicate target public_ids: ${plan.duplicateTargets.length}`);
  console.log(`- already-renamed assets: ${already}`);
  console.log(`- errors: ${plan.errors.length}`);
}

function summaryCounts(plan, assetCount) {
  return {
    totalNotionNotes: plan.notes.length,
    totalCloudinaryAssets: assetCount,
    matchedAssets: plan.mappings.filter((item) => item.status === 'MATCHED').length,
    unmatchedAssets: plan.unmatchedAssets.length,
    ambiguousAssets: plan.ambiguousAssets.length,
    duplicateTargetPublicIds: plan.duplicateTargets.length,
    alreadyRenamedAssets: plan.mappings.filter((item) => item.status === 'already-renamed').length,
    errors: plan.errors.length
  };
}

async function createFolders(credentials, plan) {
  const unique = [];
  unique.push('notebooks');
  for (const notePlan of plan.notePlans.values()) {
    if (notePlan.errors.some((message) => /public_id/.test(message))) continue;
    unique.push(...notePlan.folders);
  }
  const folders = [...new Set(unique)];
  const results = [];
  for (const folder of folders) {
    const result = await cloudinaryCreateFolder(credentials, folder);
    results.push({ folder, ...result });
    console.log(
      `${result.ok ? 'OK' : 'FAIL'}  ${folder}  (${result.status}${result.message ? `: ${result.message}` : ''})`
    );
    if (!result.ok) break;
    await sleep(80);
  }
  return results;
}

async function executeRenames(credentials, plan, previousLog) {
  if (plan.errors.length) {
    console.error('\n검증 실패. 실제 rename 을 시작하지 않습니다.');
    for (const message of plan.errors) console.error(`- ${message}`);
    process.exitCode = 1;
    return previousLog;
  }

  const log = previousLog || { createdAt: new Date().toISOString(), renames: [] };
  const done = new Set(
    log.renames
      .filter((item) => item.status === 'renamed' || item.status === 'already-renamed')
      .map((item) => `${item.from}=>${item.to}`)
  );

  for (const mapping of plan.mappings) {
    if (mapping.status === 'already-renamed' || done.has(`${mapping.from}=>${mapping.to}`)) {
      log.renames.push({ ...mapping, status: 'already-renamed', at: new Date().toISOString() });
      console.log(`SKIP already-renamed  ${mapping.from}`);
      continue;
    }
    const renamed = await cloudinaryRename(credentials, mapping.from, mapping.to);
    if (!renamed.ok) {
      const message = renamed.data?.error?.message || `HTTP ${renamed.status}`;
      log.renames.push({ ...mapping, status: 'error', message, at: new Date().toISOString() });
      writeJson(LOG_PATH, log);
      console.error(`FAIL rename  ${mapping.from} → ${mapping.to}: ${message}`);
      console.error('이미 성공한 rename 은 재실행하지 않습니다. 로그를 남기고 중단합니다.');
      process.exitCode = 1;
      return log;
    }
    const folder = mapping.role === 'page' ? `notebooks/${mapping.notePublicId}/pages` : `notebooks/${mapping.notePublicId}`;
    const moved = await cloudinaryUpdateAssetFolder(credentials, mapping.to, folder);
    log.renames.push({
      ...mapping,
      status: 'renamed',
      assetFolderUpdated: moved.ok,
      assetFolderMessage: moved.ok ? null : moved.data?.error?.message || `HTTP ${moved.status}`,
      at: new Date().toISOString()
    });
    writeJson(LOG_PATH, log);
    console.log(`OK  ${mapping.from} → ${mapping.to}`);
    await sleep(80);
  }
  return log;
}

async function main() {
  const credentials = getCloudinaryCredentials();
  if (!credentials) {
    console.error('CLOUDINARY_URL 또는 CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET 이 필요합니다.');
    process.exit(1);
  }
  if (!process.env.NOTION_API_KEY) {
    console.error('NOTION_API_KEY 가 필요합니다. Notion DB 는 읽기만 합니다.');
    process.exit(1);
  }

  console.log(`모드: ${MODE}`);
  console.log(`Notion DB: ${NOTEBOOK_DB_ID}`);
  console.log(`Cloudinary cloud: ${credentials.cloudName}\n`);

  const notes = await loadNotionNotes();
  const assets = await cloudinarySearchAll(credentials, 'resource_type:image AND type:upload');
  const previousLog = readJsonSafe(LOG_PATH, { createdAt: null, renames: [] });
  const plan = buildPlan(notes, assets, previousLog);
  printPlan(plan, assets.length);

  const payload = {
    mode: MODE,
    generatedAt: new Date().toISOString(),
    summary: summaryCounts(plan, assets.length),
    mappings: plan.mappings,
    unmatchedAssets: plan.unmatchedAssets,
    ambiguousAssets: plan.ambiguousAssets,
    duplicateTargets: plan.duplicateTargets,
    errors: plan.errors,
    folders: [...new Set(['notebooks', ...[...plan.notePlans.values()].flatMap((item) => item.folders)])]
  };
  writeJson(PLAN_PATH, payload);
  console.log(`\n계획 파일: ${path.relative(ROOT, PLAN_PATH)}`);

  if (MODE === 'dry-run') {
    console.log('\n위 내용이 맞으면 다음을 실행하세요:');
    console.log('  npm run migrate:cloudinary -- --create-folders');
    console.log('  npm run migrate:cloudinary -- --execute');
    return;
  }

  if (MODE === 'create-folders' || MODE === 'execute') {
    console.log('\n=== 폴더 생성 ===');
    const folderResults = await createFolders(credentials, plan);
    const failedFolder = folderResults.find((item) => !item.ok);
    if (failedFolder) {
      console.error('폴더 생성 실패. rename 을 시작하지 않습니다.');
      process.exit(1);
    }
  }

  if (MODE === 'execute') {
    console.log('\n=== rename ===');
    const log = await executeRenames(credentials, plan, previousLog);
    writeJson(LOG_PATH, log);
    console.log(`로그: ${path.relative(ROOT, LOG_PATH)}`);
  }
}

main().catch((error) => {
  console.error('실행 실패:', error.message);
  process.exit(1);
});
