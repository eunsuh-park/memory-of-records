/**
 * Vercel Serverless Function: Notion By Type DB title cleanup
 *
 * POST /api/by-type/cleanup-titles
 * 페이지 제목의 끝 7자 제거
 *
 * 필요 환경 변수:
 * - NOTION_API_KEY: Notion API 토큰
 * - NOTION_BY_TYPE_DB_ID: By type 데이터베이스 ID (없으면 기본값 사용)
 */
const BY_TYPE_DB_ID =
  process.env.NOTION_BY_TYPE_DB_ID || '2f2c337eb8b08146bd64e1be25c4114b';

function getTitlePropertyKey(properties) {
  if (!properties) return null;
  const entry = Object.entries(properties).find(([, value]) => value?.type === 'title');
  return entry ? entry[0] : null;
}

function extractTitleText(property) {
  if (!property || property.type !== 'title') return '';
  return property.title?.map((item) => item.plain_text || '').join('') || '';
}

async function updatePageTitle(notionApiKey, pageId, titlePropertyKey, newTitle) {
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        [titlePropertyKey]: {
          title: [
            {
              type: 'text',
              text: { content: newTitle }
            }
          ]
        }
      }
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data?.message || data?.error || 'Notion API error';
    throw new Error(message);
  }

  return response.json();
}

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const notionApiKey = process.env.NOTION_API_KEY;

  if (!notionApiKey || !BY_TYPE_DB_ID) {
    return res.status(500).json({
      error: 'Notion configuration missing',
      message: 'NOTION_API_KEY and NOTION_BY_TYPE_DB_ID are required'
    });
  }

  try {
    const queryUrl = `https://api.notion.com/v1/databases/${BY_TYPE_DB_ID}/query`;
    const results = [];
    let hasMore = true;
    let nextCursor = null;

    while (hasMore) {
      const body = {
        ...(nextCursor ? { start_cursor: nextCursor } : {})
      };

      const response = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: 'Notion API error',
          message: data?.message || data?.error || 'Notion API error',
          details: data
        });
      }

      const pageResults = Array.isArray(data?.results) ? data.results : [];
      results.push(...pageResults);
      hasMore = Boolean(data?.has_more);
      nextCursor = data?.next_cursor || null;
    }

    if (results.length === 0) {
      return res.status(200).json({ updated: 0 });
    }

    const titlePropertyKey = getTitlePropertyKey(results[0]?.properties);
    if (!titlePropertyKey) {
      return res.status(400).json({
        error: 'Title property not found',
        message: 'Could not detect title property in the database'
      });
    }

    let updatedCount = 0;
    const failures = [];

    for (const page of results) {
      const titleProperty = page?.properties?.[titlePropertyKey];
      const rawTitle = extractTitleText(titleProperty);
      const cleanedTitle = rawTitle.length > 7 ? rawTitle.slice(0, -7).trim() : rawTitle;
      if (!rawTitle || rawTitle === cleanedTitle) {
        continue;
      }

      try {
        await updatePageTitle(notionApiKey, page.id, titlePropertyKey, cleanedTitle);
        updatedCount += 1;
      } catch (error) {
        failures.push({
          id: page.id,
          title: rawTitle,
          message: error?.message || 'Update failed'
        });
      }
    }

    return res.status(200).json({
      updated: updatedCount,
      failed: failures.length,
      failures
    });
  } catch (error) {
    console.error('Notion cleanup titles API error:', error);
    return res.status(500).json({
      error: 'Notion API error',
      message: error?.message || 'Unknown error'
    });
  }
}

