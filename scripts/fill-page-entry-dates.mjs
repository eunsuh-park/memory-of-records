#!/usr/bin/env node
/**
 * 이미 올라간 Cloudinary 페이지에 entry_date를 채운다.
 *
 * 제미나이 PDF 재업로드 파이프라인 대신:
 * - 이미지는 다시 올리지 않는다 (AddPageModal 경로 유지)
 * - 자격 증명은 CLOUDINARY_URL / CLOUDINARY_* 만 쓴다
 * - 날짜는 YYYY-MM-DD 로 정규화한다
 * - OCR 텍스트(ocr_text) · 이미 있는 entry_date에서 날짜를 뽑고,
 *   없는 장은 직전 날짜를 Forward Fill 한다
 *
 * 페이지에 ocr_text가 아직 없으면 뷰어 페이지 정보 모달에서
 * 「이미지에서 인식」을 한 뒤 이 스크립트를 다시 돌린다.
 *
 * 사용법:
 *   node scripts/fill-page-entry-dates.mjs --note DIRY-2025-0001
 *   node scripts/fill-page-entry-dates.mjs --folder "notebooks/DIRY-2025-0001/pages"
 *   node scripts/fill-page-entry-dates.mjs --note DIRY-2025-0001 --apply
 *   node scripts/fill-page-entry-dates.mjs --note DIRY-2025-0001 --overwrite --apply
 */

import crypto from 'node:crypto';
import { getCloudinaryCredentials } from '../api/_lib/cloudinaryAuth.js';
import { pagesFolderForNote, sanitizeNotePublicId } from '../api/_lib/notePagesFolder.js';
import { forwardFillEntryDates, normalizeIsoDate } from '../src/utils/entryDate.js';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const OVERWRITE = args.includes('--overwrite');

function argValue(flag) {
  const idx = args.indexOf(flag);
  if (idx < 0) return '';
  return String(args[idx + 1] || '').trim();
}

const NOTE_ID = sanitizeNotePublicId(argValue('--note'));
const FOLDER_ARG = argValue('--folder').replace(/\/+$/, '');

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

function pageNumberFromPublicId(publicId) {
  const stem = String(publicId || '')
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/\.[a-z0-9]+$/i, '');
  const match = String(stem || '').match(/^page-(\d+)$/i);
  return match ? Number(match[1]) : 0;
}

async function cloudinarySearchPages(credentials, folderPath) {
  const auth = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64');
  const escaped = String(folderPath || '').replace(/"/g, '\\"');
  const expression = `resource_type:image AND public_id:${escaped}* AND filename:page-*`;
  const resources = [];
  let cursor = null;

  do {
    const body = {
      expression,
      max_results: 500,
      with_field: ['context', 'metadata']
    };
    if (cursor) body.next_cursor = cursor;
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${credentials.cloudName}/resources/search`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Cloudinary Search ${response.status}: ${data?.error?.message || '?'}`);
    }
    resources.push(...(data?.resources || []));
    cursor = data?.next_cursor || null;
  } while (cursor);

  return resources;
}

function resourceToPage(resource) {
  const pageNumber = pageNumberFromPublicId(resource?.public_id);
  const meta = resource?.metadata || {};
  const context = resource?.context?.custom || resource?.context || {};
  const entryDate =
    readMetaValue(meta, 'entry_date', 'entrydate', 'date') ??
    readMetaValue(context, 'entry_date', 'entrydate', 'date');
  const ocrText =
    readMetaValue(meta, 'ocr_text', 'ocrtext', 'ocr') ??
    readMetaValue(context, 'ocr_text', 'ocrtext', 'ocr');
  return {
    publicId: resource?.public_id,
    pageNumber,
    entry_date: entryDate == null ? '' : String(entryDate),
    ocr_text: ocrText == null ? '' : String(ocrText)
  };
}

async function updateEntryDate(credentials, { publicId, entry_date, fill_status }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const metadata = entry_date ? `entry_date=${entry_date}` : '';
  const contextParts = [`entry_date=${entry_date || ''}`, `fill_status=${fill_status}`];
  const context = contextParts.join('|');
  const paramsToSign = {
    context,
    overwrite: 'true',
    public_id: publicId,
    timestamp: String(timestamp),
    type: 'upload'
  };
  if (metadata) paramsToSign.metadata = metadata;

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
  form.append('context', context);
  if (metadata) form.append('metadata', metadata);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/explicit`,
    { method: 'POST', body: form }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || JSON.stringify(data));
  }
  return data;
}

function resolveFolder() {
  if (NOTE_ID) return pagesFolderForNote(NOTE_ID);
  if (FOLDER_ARG) return FOLDER_ARG;
  return '';
}

const credentials = getCloudinaryCredentials();
if (!credentials) {
  console.error('CLOUDINARY_URL 또는 CLOUDINARY_* 환경변수가 필요합니다.');
  process.exit(1);
}

const folder = resolveFolder();
if (!folder) {
  console.error('--note PUBLIC_ID 또는 --folder "notebooks/.../pages" 가 필요합니다.');
  process.exit(1);
}

const resources = await cloudinarySearchPages(credentials, folder);
const pages = resources
  .map(resourceToPage)
  .filter((page) => page.pageNumber > 0 && page.publicId);
pages.sort((a, b) => a.pageNumber - b.pageNumber);

if (!pages.length) {
  console.error(`폴더 ${folder} 에서 page-* 이미지를 찾지 못했습니다.`);
  process.exit(1);
}

const filled = forwardFillEntryDates(pages, { overwrite: OVERWRITE });
const changes = filled.filter((page, idx) => {
  const before = normalizeIsoDate(pages[idx].entry_date);
  return page.entry_date && page.entry_date !== before;
});

console.log(
  `${APPLY ? '적용' : '미리보기'} · ${folder} · ${filled.length}장 · 변경 ${changes.length}장` +
    (OVERWRITE ? ' · overwrite' : '')
);
for (const page of filled) {
  const before = normalizeIsoDate(pages.find((p) => p.publicId === page.publicId)?.entry_date);
  const mark = page.entry_date && page.entry_date !== before ? '*' : ' ';
  console.log(
    `${mark} [${String(page.pageNumber).padStart(3, '0')}] ${page.entry_date || 'null'} (${page.fill_status})` +
      (page.ocr_text ? '' : ' · ocr_text 없음')
  );
}

if (!APPLY) {
  console.log('\n실제 반영은 --apply 를 붙인다.');
  process.exit(0);
}

if (!changes.length) {
  console.log('반영할 날짜 변경이 없습니다.');
  process.exit(0);
}

for (const page of changes) {
  await updateEntryDate(credentials, {
    publicId: page.publicId,
    entry_date: page.entry_date,
    fill_status: page.fill_status
  });
  console.log(`저장 ${page.pageNumber} → ${page.entry_date} (${page.fill_status})`);
}
