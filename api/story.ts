/**
 * Vercel Serverless Function for Story API
 * Notion API를 통해 Story 데이터를 제공하는 API
 * 
 * 환경 변수:
 * - NOTION_TOKEN: Notion API 토큰
 * - NOTION_DB_ID: Notion 데이터베이스 ID
 */

export default async function handler(req: any, res: any) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET 요청만 허용
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_DB_ID = process.env.NOTION_DB_ID;

  if (!NOTION_TOKEN || !NOTION_DB_ID) {
    return res.status(500).json({ 
      error: 'Notion configuration missing',
      message: 'NOTION_TOKEN and NOTION_DB_ID environment variables are required'
    });
  }

  try {
    const { id } = req.query;

    // 특정 스토리 상세 내용 가져오기
    if (id) {
      // 페이지 내용 가져오기
      const blocksUrl = `https://api.notion.com/v1/blocks/${id}/children`;
      const blocksResponse = await fetch(blocksUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
      });

      if (!blocksResponse.ok) {
        const errorData = await blocksResponse.json();
        return res.status(blocksResponse.status).json({ error: errorData });
      }

      const blocksData = await blocksResponse.json();
      return res.status(200).json({ blocks: blocksData.results || [] });
    }

    // 모든 스토리 목록 가져오기
    const queryUrl = `https://api.notion.com/v1/databases/${NOTION_DB_ID}/query`;
    const response = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sorts: [
          {
            property: 'Date',
            direction: 'descending'
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData });
    }

    const data = await response.json();
    return res.status(200).json({ results: data.results || [] });
  } catch (error: any) {
    console.error('Story API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
