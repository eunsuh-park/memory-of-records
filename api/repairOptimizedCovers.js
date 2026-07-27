/**
 * POST /api/repairOptimizedCovers
 *
 * 노트 수정 버그로 Notion에 저장된 f_auto/q_auto 표지 URL을 원본으로 복구합니다.
 * - cover_front_url / cover_back_url / page cover 에서 변환 파라미터 제거
 * - 404면 Cloudinary 랜덤 접미사(_xxxxxx)를 제거해 재시도
 *
 * Body(optional): { dryRun?: boolean, pageId?: string }
 */
import {
  NOTEBOOK_DB_ID,
  findSchemaProperty,
  notionFetch
} from './_lib/notionDb.js';

function trimOrEmpty(value) {
  if (value == null) return '';
  return String(value).trim();
}

function getTitle(page) {
  const props = page?.properties || {};
  for (const value of Object.values(props)) {
    if (value?.type === 'title') {
      return (value.title || []).map((t) => t.plain_text || '').join('').trim();
    }
  }
  return '';
}

function getUrlProp(prop) {
  if (!prop) return '';
  if (prop.type === 'url') return trimOrEmpty(prop.url);
  if (prop.type === 'rich_text') {
    return trimOrEmpty((prop.rich_text || []).map((t) => t.plain_text || '').join(''));
  }
  return '';
}

/** Cloudinary delivery URL에서 f_auto/q_auto 등 변환 세그먼트 제거 */
function stripCloudinaryTransforms(url) {
  const trimmed = trimOrEmpty(url);
  if (!trimmed) return '';
  const match = trimmed.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i
  );
  if (!match) return trimmed;
  const [, prefix, rest] = match;
  const parts = rest.split('/');
  /* 앞쪽 transformation 세그먼트만 제거 (버전 v123 / public_id 경로는 유지) */
  while (parts.length > 1) {
    const seg = parts[0];
    if (/^v\d+$/i.test(seg)) break;
    if (
      /^(f_|q_|c_|w_|h_|e_|dpr_|fl_|b_|r_|a_|g_|l_|t_|x_|y_|z_|u_|o_|p_|s_)/i.test(seg) ||
      /,/.test(seg)
    ) {
      parts.shift();
      continue;
    }
    break;
  }
  return prefix + parts.join('/');
}

/** public_id 끝의 Cloudinary 랜덤 접미사 제거 후보 생성 */
function withoutRandomSuffix(url) {
  return url.replace(/(_[a-zA-Z0-9]{4,10})(\.[a-zA-Z0-9]+)(\?.*)?$/i, '$2$3');
}

async function urlExists(url) {
  if (!url) return false;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) return true;
    /* 일부 CDN은 HEAD 거부 → GET range */
    const getRes = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' }
    });
    return getRes.ok || getRes.status === 206;
  } catch {
    return false;
  }
}

async function resolveWorkingCoverUrl(originalUrl) {
  const stripped = stripCloudinaryTransforms(originalUrl);
  const candidates = [stripped];
  const noSuffix = withoutRandomSuffix(stripped);
  if (noSuffix && noSuffix !== stripped) candidates.push(noSuffix);
  /* 원본도 후보에 포함 (이미 정상인 경우) */
  if (originalUrl && !candidates.includes(originalUrl)) candidates.push(originalUrl);

  for (const candidate of candidates) {
    if (await urlExists(candidate)) {
      return { url: stripCloudinaryTransforms(candidate), tried: candidates };
    }
  }
  return { url: stripped || originalUrl, tried: candidates, unresolved: true };
}

async function queryAllPages() {
  const results = [];
  let hasMore = true;
  let nextCursor = null;
  while (hasMore) {
    const data = await notionFetch(`/databases/${NOTEBOOK_DB_ID}/query`, {
      method: 'POST',
      body: {
        ...(nextCursor ? { start_cursor: nextCursor } : {}),
        page_size: 100
      }
    });
    results.push(...(data.results || []));
    hasMore = Boolean(data.has_more);
    nextCursor = data.next_cursor || null;
  }
  return results;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const dryRun = body.dryRun === true || req.query?.dryRun === '1';
    const pageIdFilter = trimOrEmpty(body.pageId || req.query?.pageId).replace(/-/g, '');

    const database = await notionFetch(`/databases/${NOTEBOOK_DB_ID}`);
    const schema = database?.properties || {};
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

    const pages = await queryAllPages();
    const repaired = [];
    const skipped = [];

    for (const page of pages) {
      const idNorm = String(page.id || '').replace(/-/g, '');
      if (pageIdFilter && idNorm !== pageIdFilter) continue;

      const title = getTitle(page);
      const frontRaw = getUrlProp(page.properties?.[frontProp?.key]);
      const backRaw = getUrlProp(page.properties?.[backProp?.key]);
      const coverRaw = page.cover?.external?.url || page.cover?.file?.url || '';

      const needsFront = /f_auto|q_auto/i.test(frontRaw);
      const needsBack = /f_auto|q_auto/i.test(backRaw);
      const needsCover = /f_auto|q_auto/i.test(coverRaw);

      if (!needsFront && !needsBack && !needsCover) {
        skipped.push({ id: page.id, title, reason: 'clean' });
        continue;
      }

      const frontResolved = needsFront
        ? await resolveWorkingCoverUrl(frontRaw)
        : { url: frontRaw };
      const backResolved = needsBack
        ? await resolveWorkingCoverUrl(backRaw)
        : { url: backRaw };
      const coverResolved = needsCover
        ? await resolveWorkingCoverUrl(coverRaw)
        : { url: coverRaw };

      const properties = {};
      if (needsFront && frontProp?.type === 'url' && frontResolved.url) {
        properties[frontProp.key] = { url: frontResolved.url };
      }
      if (needsBack && backProp?.type === 'url' && backResolved.url) {
        properties[backProp.key] = { url: backResolved.url };
      }

      const patchBody = {};
      if (Object.keys(properties).length) patchBody.properties = properties;
      if (needsCover && coverResolved.url) {
        patchBody.cover = {
          type: 'external',
          external: { url: coverResolved.url }
        };
      }

      const entry = {
        id: page.id,
        title,
        dryRun,
        before: { front: frontRaw, back: backRaw, cover: coverRaw },
        after: {
          front: frontResolved.url,
          back: backResolved.url,
          cover: coverResolved.url
        },
        unresolved: Boolean(frontResolved.unresolved || backResolved.unresolved)
      };

      if (!dryRun && Object.keys(patchBody).length) {
        await notionFetch(`/pages/${idNorm}`, {
          method: 'PATCH',
          body: patchBody
        });
      }

      repaired.push(entry);
    }

    return res.status(200).json({
      ok: true,
      dryRun,
      repairedCount: repaired.length,
      repaired,
      skippedCount: skipped.length
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: 'Failed to repair covers',
      message: error.message,
      details: error.details
    });
  }
}
