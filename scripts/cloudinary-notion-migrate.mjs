#!/usr/bin/env node
/**
 * Cloudinary 페이지 이미지 정리 + Notion pdf_folder_url/page_count 채움 (일회성 마이그레이션)
 *
 * 배경:
 * - dynamic folder 모드에서는 폴더 경로가 public_id(URL)에 포함되지 않고,
 *   unique_filename 기본값 때문에 파일명 뒤에 랜덤 접미사(_xxxxxx)가 붙어 있음
 * - 이미지 뷰어는 `{pdf_folder_url}/page-000001.jpg` 규칙으로 URL을 조립하므로,
 *   기존 자산의 public_id를 `폴더경로/page-000001` 형태로 정리해야 함
 *
 * 동작:
 * 1. Cloudinary에서 page-* 이미지를 전부 검색해 asset_folder별로 그룹핑
 * 2. public_id가 `폴더경로/page-XXXXXX` 형태가 아닌 자산을 rename (랜덤 접미사 제거 + 폴더 prefix)
 * 3. Notion 노트북 DB에서 폴더 이름과 제목(또는 pdf_url 파일명)이 매칭되는 페이지를 찾아
 *    비어 있는 pdf_folder_url / page_count를 채움
 *
 * 사용법 (로컬 실행):
 *   NOTION_API_KEY=secret_xxx CLOUDINARY_URL=cloudinary://key:secret@djpgxjwpd \
 *     node scripts/cloudinary-notion-migrate.mjs           # dry-run: 변경 예정 내용만 출력
 *     node scripts/cloudinary-notion-migrate.mjs --apply   # 실제 실행
 *     node scripts/cloudinary-notion-migrate.mjs --folder "notebooks/diary-2020"  # 특정 폴더만
 *
 * 주의:
 * - rename은 기존 이미지 URL을 바꿉니다. 뷰어 외의 곳에서 기존 URL을 참조 중이면 깨집니다.
 * - Notion DB 스키마(속성)는 생성/수정하지 않습니다. pdf_folder_url 속성이 없으면 안내 후 건너뜁니다.
 * - 이미 값이 있는 Notion 필드는 덮어쓰지 않습니다.
 */

import crypto from 'node:crypto';

const NOTION_DB_ID =
  process.env.NOTION_DATABASE_ID || process.env.NOTION_DB_ID || '18dfb9c7066e4df99962c5fed616b3db';
const NOTION_VERSION = '2022-06-28';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const folderArgIdx = args.indexOf('--folder');
const FOLDER_FILTER = folderArgIdx >= 0 ? args[folderArgIdx + 1] || null : null;

function getCloudinaryCredentials() {
  const fromUrl = process.env.CLOUDINARY_URL;
  if (fromUrl) {
    const match = String(fromUrl).match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };
  return null;
}

/* ---------- Cloudinary API ---------- */

async function cloudinarySearchAll(credentials, expression) {
  const auth = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64');
  const resources = [];
  let cursor = null;
  do {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${credentials.cloudName}/resources/search`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expression,
          max_results: 500,
          ...(cursor ? { next_cursor: cursor } : {})
        })
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

/** Upload API rename (서명 필요) */
async function cloudinaryRename(credentials, fromPublicId, toPublicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  /* 서명: 파라미터를 키 알파벳순으로 정렬해 & 로 연결 + api_secret 의 SHA-1 */
  const toSign = `from_public_id=${fromPublicId}&timestamp=${timestamp}&to_public_id=${toPublicId}`;
  const signature = crypto.createHash('sha1').update(toSign + credentials.apiSecret).digest('hex');
  const body = new URLSearchParams({
    from_public_id: fromPublicId,
    to_public_id: toPublicId,
    timestamp: String(timestamp),
    api_key: credentials.apiKey,
    signature
  });
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/rename`,
    { method: 'POST', body }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`rename 실패 (${response.status}): ${data?.error?.message || '?'}`);
  }
  return data;
}

/* ---------- Notion API ---------- */

async function notionFetch(path, { method = 'GET', body } = {}) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Notion API ${response.status}: ${data?.message || '?'}`);
  return data;
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
    default:
      return null;
  }
}

function buildPropertyPayload(propertySchema, value) {
  if (propertySchema.type === 'url') return { url: value };
  if (propertySchema.type === 'rich_text') {
    return { rich_text: [{ type: 'text', text: { content: String(value) } }] };
  }
  if (propertySchema.type === 'number') return { number: value };
  return null;
}

/* ---------- 헬퍼 ---------- */

function normalizeKey(name) {
  return String(name || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase().replace(/[\s_\-./]+/g, '');
}

function extractUrlStem(url) {
  const match = String(url || '').match(/\/([^/?#]+?)(\.[a-z0-9]+)?(\?.*)?$/i);
  return match ? match[1] : '';
}

function getAssetFolderPath(asset) {
  if (asset?.asset_folder) return asset.asset_folder;
  if (asset?.folder) return asset.folder;
  const publicId = String(asset?.public_id || '');
  const idx = publicId.lastIndexOf('/');
  return idx > 0 ? publicId.slice(0, idx) : '';
}

/** display_name 또는 파일명에서 페이지 번호 추출 (page-000001_abc123 형태 포함) */
function extractPageNumber(asset) {
  const candidates = [asset?.display_name, asset?.filename];
  for (const candidate of candidates) {
    const match = String(candidate || '').match(/^page-(\d{1,6})(?:[_.]|$)/);
    if (match) return Number(match[1]);
  }
  return null;
}

/* ---------- 메인 ---------- */

async function main() {
  const credentials = getCloudinaryCredentials();
  if (!credentials) {
    console.error('CLOUDINARY_URL 또는 CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET 환경 변수가 필요합니다.');
    process.exit(1);
  }
  if (!process.env.NOTION_API_KEY) {
    console.error('NOTION_API_KEY 환경 변수가 필요합니다.');
    process.exit(1);
  }
  console.log(`모드: ${APPLY ? 'APPLY (실제 실행)' : 'DRY-RUN (변경 없음, --apply로 실행)'}\n`);

  /* 1) 페이지 이미지 수집 및 폴더별 그룹핑 */
  let expression = 'resource_type:image AND filename=page-*';
  if (FOLDER_FILTER) expression += ` AND asset_folder="${FOLDER_FILTER}"`;
  const assets = await cloudinarySearchAll(credentials, expression);
  console.log(`Cloudinary에서 page-* 이미지 ${assets.length}개 발견`);

  const folderMap = new Map();
  const skippedRoot = [];
  for (const asset of assets) {
    const folderPath = getAssetFolderPath(asset);
    if (!folderPath) {
      skippedRoot.push(asset.public_id);
      continue;
    }
    if (!folderMap.has(folderPath)) folderMap.set(folderPath, []);
    folderMap.get(folderPath).push(asset);
  }
  if (skippedRoot.length > 0) {
    console.warn(`⚠️ 루트(폴더 없음)에 있어 건너뛴 이미지 ${skippedRoot.length}개:`, skippedRoot.slice(0, 5), skippedRoot.length > 5 ? '...' : '');
  }

  /* 2) 폴더별 rename 계획 수립 */
  const folderSummaries = [];
  for (const [folderPath, folderAssets] of folderMap) {
    const renames = [];
    const problems = [];
    const seenTargets = new Set();
    let maxPage = 0;
    let pageAssetCount = 0;

    for (const asset of folderAssets) {
      const pageNumber = extractPageNumber(asset);
      if (!pageNumber) {
        problems.push(`페이지 번호 인식 불가: ${asset.public_id}`);
        continue;
      }
      pageAssetCount += 1;
      if (pageNumber > maxPage) maxPage = pageNumber;
      const targetPublicId = `${folderPath}/page-${String(pageNumber).padStart(6, '0')}`;
      if (asset.public_id === targetPublicId) continue; /* 이미 정리됨 */
      if (seenTargets.has(targetPublicId)) {
        problems.push(`중복 페이지 번호(${pageNumber}): ${asset.public_id} → 건너뜀`);
        continue;
      }
      seenTargets.add(targetPublicId);
      renames.push({ from: asset.public_id, to: targetPublicId });
    }

    if (pageAssetCount > 0 && pageAssetCount !== maxPage) {
      problems.push(`페이지 누락 의심: 이미지 ${pageAssetCount}개 vs 최대 페이지 번호 ${maxPage}`);
    }

    folderSummaries.push({
      folderPath,
      baseUrl: `https://res.cloudinary.com/${credentials.cloudName}/image/upload/${folderPath}`,
      pageCount: maxPage,
      renames,
      problems
    });
  }

  folderSummaries.sort((a, b) => a.folderPath.localeCompare(b.folderPath));
  console.log(`\n=== 폴더 ${folderSummaries.length}개 ===`);
  for (const summary of folderSummaries) {
    console.log(`\n📁 ${summary.folderPath} (${summary.pageCount}페이지, rename 대상 ${summary.renames.length}개)`);
    for (const rename of summary.renames.slice(0, 3)) {
      console.log(`   ${rename.from} → ${rename.to}`);
    }
    if (summary.renames.length > 3) console.log(`   ... 외 ${summary.renames.length - 3}개`);
    for (const problem of summary.problems) console.warn(`   ⚠️ ${problem}`);
  }

  /* 3) rename 실행 */
  let renamed = 0;
  let renameFailed = 0;
  if (APPLY) {
    console.log('\n=== rename 실행 ===');
    for (const summary of folderSummaries) {
      for (const rename of summary.renames) {
        try {
          await cloudinaryRename(credentials, rename.from, rename.to);
          renamed += 1;
        } catch (error) {
          renameFailed += 1;
          console.error(`❌ ${rename.from}: ${error.message}`);
        }
      }
      if (summary.renames.length > 0) {
        console.log(`📁 ${summary.folderPath}: 완료`);
      }
    }
    console.log(`rename: 성공 ${renamed}개, 실패 ${renameFailed}개`);
  }

  /* 4) Notion 채움 */
  console.log('\n=== Notion 매칭 ===');
  const database = await notionFetch(`/databases/${NOTION_DB_ID}`);
  const schemaByKey = new Map(
    Object.entries(database?.properties || {}).map(([key, value]) => [normalizeKey(key), { key, ...value }])
  );
  const folderUrlProp = schemaByKey.get('pdffolderurl');
  const pageCountProp = schemaByKey.get('pagecount');
  const pdfUrlProp = schemaByKey.get('pdfurl');
  if (!folderUrlProp) {
    console.warn('⚠️ Notion DB에 pdf_folder_url 속성이 없습니다. 속성 추가 후 다시 실행해주세요. (Notion 채움 건너뜀)');
    return;
  }

  const pages = await queryAllNotionPages(NOTION_DB_ID);
  const notebooks = pages.map((page) => {
    const properties = page?.properties || {};
    const titleProp = Object.values(properties).find((p) => p.type === 'title');
    return {
      id: page.id,
      title: readPropertyValue(titleProp) || '',
      folderUrl: readPropertyValue(properties[folderUrlProp.key]),
      pageCount: pageCountProp ? readPropertyValue(properties[pageCountProp.key]) : null,
      pdfUrl: pdfUrlProp ? readPropertyValue(properties[pdfUrlProp.key]) : null
    };
  });

  let updated = 0;
  const unmatched = [];
  for (const notebook of notebooks) {
    const needsFolderUrl = !notebook.folderUrl;
    const needsPageCount = Boolean(pageCountProp) && !notebook.pageCount;
    if (!needsFolderUrl && !needsPageCount) continue;

    const candidates = [normalizeName(notebook.title), normalizeName(extractUrlStem(notebook.pdfUrl))].filter(Boolean);
    const matches = folderSummaries.filter((summary) => {
      const lastSegment = summary.folderPath.split('/').filter(Boolean).pop() || '';
      return candidates.includes(normalizeName(lastSegment)) || candidates.includes(normalizeName(summary.folderPath));
    });

    if (matches.length !== 1) {
      unmatched.push(`${notebook.title} (매칭 ${matches.length}개)`);
      continue;
    }
    const folder = matches[0];

    const propertiesPayload = {};
    if (needsFolderUrl) propertiesPayload[folderUrlProp.key] = buildPropertyPayload(folderUrlProp, folder.baseUrl);
    if (needsPageCount && folder.pageCount > 0) {
      propertiesPayload[pageCountProp.key] = buildPropertyPayload(pageCountProp, folder.pageCount);
    }
    if (Object.keys(propertiesPayload).length === 0) continue;

    console.log(`📝 ${notebook.title} ← ${folder.folderPath} (${folder.pageCount}페이지)`);
    if (APPLY) {
      await notionFetch(`/pages/${notebook.id}`, { method: 'PATCH', body: { properties: propertiesPayload } });
    }
    updated += 1;
  }

  console.log(`\nNotion: ${APPLY ? '갱신' : '갱신 예정'} ${updated}개`);
  if (unmatched.length > 0) {
    console.warn('⚠️ 폴더를 찾지 못한(또는 중복 매칭) 노트북 — Notion에서 직접 채워주세요:');
    for (const title of unmatched) console.warn(`   - ${title}`);
  }
  if (!APPLY) console.log('\n위 내용이 맞으면 --apply를 붙여 다시 실행하세요.');
}

main().catch((error) => {
  console.error('실행 실패:', error.message);
  process.exit(1);
});
