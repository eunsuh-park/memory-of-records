/**
 * Vercel Serverless Function: Notion Notebook DB Proxy
 *
 * GET /api/notebooks/notion
 * Notion DB에서 노트북 목록을 가져옵니다.
 *
 * 필요 환경 변수:
 * - NOTION_API_KEY: Notion API 토큰
 */
const NOTEBOOK_DB_ID = process.env.NOTION_DATABASE_ID || process.env.NOTION_DB_ID || '18dfb9c7066e4df99962c5fed616b3db';

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const notionApiKey = process.env.NOTION_API_KEY;

  if (!notionApiKey) {
    return res.status(500).json({
      error: 'Notion configuration missing',
      message: 'NOTION_API_KEY environment variable is required'
    });
  }

  try {
    const queryUrl = `https://api.notion.com/v1/databases/${NOTEBOOK_DB_ID}/query`;
    const results = [];
    let hasMore = true;
    let nextCursor = null;

    while (hasMore) {
      const body = {
        ...(nextCursor ? { start_cursor: nextCursor } : {}),
        sorts: [
          { property: 'period_start', direction: 'ascending' }
        ]
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
          details: data
        });
      }

      const pageResults = Array.isArray(data?.results) ? data.results : [];
      results.push(...pageResults);
      hasMore = Boolean(data?.has_more);
      nextCursor = data?.next_cursor || null;
    }

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Notion notebooks API error:', error);
    return res.status(500).json({
      error: 'Notion API error',
      message: error?.message || 'Unknown error'
    });
  }
}
