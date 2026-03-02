/**
 * Vercel Serverless Function: Notion Notebook DB Proxy
 *
 * GET /api/notebooks/notion
 * Notion DB에서 노트북 목록을 가져옵니다.
 *
 * 필요 환경 변수:
 * - NOTION_API_KEY: Notion API 토큰
 * - NOTION_DATABASE_ID 또는 NOTION_DB_ID: 노션 데이터베이스 ID
 */

/** Notion DB ID: 환경 변수 우선, 없으면 기본값 사용 */
const NOTEBOOK_DB_ID = process.env.NOTION_DATABASE_ID || process.env.NOTION_DB_ID || '18dfb9c7066e4df99962c5fed616b3db';

/**
 * Vercel Serverless 함수 핸들러
 * - GET만 허용, Notion DB 쿼리 후 페이지 목록 반환
 * - period_start 기준 오름차순 정렬
 * - 페이지네이션(100건 초과 시) 처리
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  // 1) GET 이외 요청 거부
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2) Notion API 키 확인
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

    // 3) Notion API 페이지네이션 루프 (100건 제한 대응)
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

    // 4) 전체 결과 반환
    return res.status(200).json({ results });
  } catch (error) {
    console.error('Notion notebooks API error:', error);
    return res.status(500).json({
      error: 'Notion API error',
      message: error?.message || 'Unknown error'
    });
  }
}
