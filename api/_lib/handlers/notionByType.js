/**
 * GET /api/readNotebooks?view=type
 * Notion DB에서 타입별 이미지 목록을 가져옵니다.
 *
 * 필요 환경 변수:
 * - NOTION_API_KEY: Notion API 토큰
 * - NOTION_BY_TYPE_DB_ID: By type 데이터베이스 ID
 */
import { isNotionPageVisible } from '../visibility.js';

const BY_TYPE_DB_ID =
  process.env.NOTION_DATABASE_ID || process.env.NOTION_BY_TYPE_DB_ID || '18dfb9c7066e4df99962c5fed616b3db';

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export async function handleNotionByType(req, res) {
  if (req.method !== 'GET') {
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

    /* visibility 쿼리: public(기본) | private | all */
    const visibility = String(req.query?.visibility || 'public').toLowerCase();
    let filtered = results;
    if (visibility === 'private') {
      filtered = results.filter((page) => !isNotionPageVisible(page));
    } else if (visibility === 'all') {
      filtered = results;
    } else {
      filtered = results.filter(isNotionPageVisible);
    }

    return res.status(200).json({ results: filtered });
  } catch (error) {
    console.error('Notion by type API error:', error);
    return res.status(500).json({
      error: 'Notion API error',
      message: error?.message || 'Unknown error'
    });
  }
}
