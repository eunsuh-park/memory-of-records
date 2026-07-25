/**
 * Vercel Serverless Function: Cloudinary → Notion pdf_folder_url 자동 동기화
 *
 * POST /api/syncPdfFolders
 *
 * 동작:
 * 1. Notion 노트북 DB에서 pdf_folder_url 또는 page_count가 비어 있는 페이지를 찾음
 * 2. Cloudinary에서 첫 페이지 이미지(page-000001)가 있는 폴더들을 검색
 * 3. 폴더 이름(마지막 세그먼트/전체 경로)을 노트북 제목 또는 pdf_url 파일명과 매칭
 * 4. 매칭이 유일한 경우에만, 비어 있는 pdf_folder_url / page_count 값을 채움
 *    (이미 값이 있는 필드와 DB 스키마는 절대 건드리지 않음)
 *
 * 프런트에서 서비스 접속 시 fire-and-forget으로 호출됩니다. 멱등하게 동작하며,
 * 채울 것이 없으면 Notion 조회 1회로 끝납니다.
 *
 * 필요 환경 변수:
 * - NOTION_API_KEY
 * - NOTION_DATABASE_ID 또는 NOTION_DB_ID (없으면 기본값)
 * - CLOUDINARY_URL (cloudinary://api_key:api_secret@cloud_name)
 *   또는 CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET
 */

const NOTEBOOK_DB_ID =
  process.env.NOTION_DATABASE_ID || process.env.NOTION_DB_ID || '18dfb9c7066e4df99962c5fed616b3db';

const NOTION_VERSION = '2022-06-28';

/** 워밍된 인스턴스에서 방문마다 재실행되는 것을 막는 쿨다운 */
const COOLDOWN_MS = 10 * 60 * 1000;
let lastRunAt = 0;

/** 한 번의 요청에서 갱신할 최대 페이지 수 (서버리스 타임아웃 보호, 나머지는 다음 방문 때 이어서) */
const MAX_UPDATES_PER_RUN = 25;

function normalizeKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

/** 제목/폴더명 매칭용 정규화: 소문자화 + 공백/구분자 제거 */
function normalizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./]+/g, '');
}

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
  if (!response.ok) {
    throw new Error(`Notion API ${response.status}: ${data?.message || 'unknown error'}`);
  }
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

/** Cloudinary Search API (Admin, basic auth) */
async function cloudinarySearch(credentials, expression, { maxResults = 500, nextCursor } = {}) {
  const auth = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64');
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/resources/search`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expression,
        max_results: maxResults,
        ...(nextCursor ? { next_cursor: nextCursor } : {})
      })
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Cloudinary API ${response.status}: ${data?.error?.message || 'unknown error'}`);
  }
  return data;
}

async function cloudinarySearchAll(credentials, expression) {
  const resources = [];
  let cursor = null;
  do {
    const data = await cloudinarySearch(credentials, expression, { nextCursor: cursor });
    resources.push(...(data?.resources || []));
    cursor = data?.next_cursor || null;
  } while (cursor);
  return resources;
}

function getAssetFolderPath(asset) {
  if (asset?.asset_folder) return asset.asset_folder;
  if (asset?.folder) return asset.folder;
  const publicId = String(asset?.public_id || '');
  const idx = publicId.lastIndexOf('/');
  return idx > 0 ? publicId.slice(0, idx) : '';
}

/** secure_url에서 버전 세그먼트와 파일명을 제거해 폴더 base URL을 만듦 */
function buildFolderBaseUrl(secureUrl) {
  return String(secureUrl || '')
    .replace(/\/v\d+\//, '/')
    .replace(/\/page-000001\.[a-z0-9]+(\?.*)?$/i, '');
}

/** Notion 속성 값 헬퍼 */
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

/** pdf_url 값에서 파일명(확장자 제외)을 추출: 폴더명 매칭 후보로 사용 */
function extractUrlStem(url) {
  const match = String(url || '').match(/\/([^/?#]+?)(\.[a-z0-9]+)?(\?.*)?$/i);
  return match ? match[1] : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.NOTION_API_KEY) {
    return res.status(200).json({ ok: false, skipped: true, reason: 'NOTION_API_KEY missing' });
  }
  const credentials = getCloudinaryCredentials();
  if (!credentials) {
    return res.status(200).json({ ok: false, skipped: true, reason: 'Cloudinary credentials missing' });
  }

  if (Date.now() - lastRunAt < COOLDOWN_MS) {
    return res.status(200).json({ ok: true, skipped: true, reason: 'cooldown' });
  }
  lastRunAt = Date.now();

  try {
    /* 1) DB 스키마에서 대상 속성 이름/타입 확인 (없으면 스키마를 만들지 않고 건너뜀) */
    const database = await notionFetch(`/databases/${NOTEBOOK_DB_ID}`);
    const schema = database?.properties || {};
    const schemaByNormalizedKey = new Map(
      Object.entries(schema).map(([key, value]) => [normalizeKey(key), { key, ...value }])
    );
    const folderUrlProp = schemaByNormalizedKey.get('pdffolderurl');
    const pageCountProp = schemaByNormalizedKey.get('pagecount');
    const pdfUrlProp = schemaByNormalizedKey.get('pdfurl');
    if (!folderUrlProp || !['url', 'rich_text'].includes(folderUrlProp.type)) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        reason: 'Notion DB에 pdf_folder_url(URL 타입) 속성이 없습니다. 속성을 먼저 추가해주세요.'
      });
    }

    /* 2) 채울 것이 있는 노트북 찾기 */
    const pages = await queryAllNotionPages(NOTEBOOK_DB_ID);
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
    const needsFill = notebooks.filter(
      (n) => !n.folderUrl || (pageCountProp && !n.pageCount)
    );
    if (needsFill.length === 0) {
      return res.status(200).json({ ok: true, updated: 0, reason: 'nothing-to-fill' });
    }

    /* 3) Cloudinary에서 page-000001이 있는 폴더 수집 */
    const firstPageAssets = await cloudinarySearchAll(
      credentials,
      'resource_type:image AND filename=page-000001'
    );
    const folders = firstPageAssets.map((asset) => {
      const path = getAssetFolderPath(asset);
      return {
        path,
        lastSegment: path.split('/').filter(Boolean).pop() || '',
        baseUrl: buildFolderBaseUrl(asset.secure_url),
        usesAssetFolder: Boolean(asset.asset_folder)
      };
    });

    /* 4) 이름 매칭 (유일 매칭만 인정) */
    const findMatches = (notebook) => {
      const candidates = [normalizeName(notebook.title), normalizeName(extractUrlStem(notebook.pdfUrl))]
        .filter(Boolean);
      return folders.filter((folder) =>
        candidates.includes(normalizeName(folder.lastSegment)) ||
        candidates.includes(normalizeName(folder.path))
      );
    };

    const summary = { ok: true, updated: 0, matched: [], ambiguous: [], unmatched: [] };

    for (const notebook of needsFill) {
      if (summary.updated >= MAX_UPDATES_PER_RUN) break;
      const matches = findMatches(notebook);
      if (matches.length === 0) {
        summary.unmatched.push(notebook.title);
        continue;
      }
      if (matches.length > 1) {
        summary.ambiguous.push({ title: notebook.title, folders: matches.map((m) => m.path) });
        continue;
      }
      const folder = matches[0];

      /* 5) page_count 계산 (필요할 때만 폴더 내 page-* 자산 나열) */
      let pageCount = null;
      if (pageCountProp && !notebook.pageCount) {
        const scopeField = folder.usesAssetFolder ? 'asset_folder' : 'folder';
        const pageAssets = await cloudinarySearchAll(
          credentials,
          `resource_type:image AND ${scopeField}="${folder.path}" AND filename=page-*`
        );
        const pageNumbers = pageAssets
          .map((asset) => String(asset.filename || '').match(/^page-(\d{6})$/))
          .filter(Boolean)
          .map((m) => Number(m[1]));
        if (pageNumbers.length > 0) pageCount = Math.max(...pageNumbers);
      }

      /* 6) 비어 있는 필드만 채움 */
      const propertiesPayload = {};
      if (!notebook.folderUrl) {
        propertiesPayload[folderUrlProp.key] = buildPropertyPayload(folderUrlProp, folder.baseUrl);
      }
      if (pageCountProp && !notebook.pageCount && pageCount) {
        propertiesPayload[pageCountProp.key] = buildPropertyPayload(pageCountProp, pageCount);
      }
      if (Object.keys(propertiesPayload).length === 0) continue;

      await notionFetch(`/pages/${notebook.id}`, {
        method: 'PATCH',
        body: { properties: propertiesPayload }
      });
      summary.updated += 1;
      summary.matched.push({ title: notebook.title, folder: folder.path, pageCount });
    }

    return res.status(200).json(summary);
  } catch (error) {
    console.error('syncPdfFolders error:', error);
    return res.status(500).json({ ok: false, error: error?.message || 'Unknown error' });
  }
}
