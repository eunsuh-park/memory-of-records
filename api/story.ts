/**
 * Vercel Serverless Function for Story API
 * Notion API를 통해 Story 데이터를 제공하는 API
 *
 * Story 페이지 전용 DB (노트북/타임라인 DB와 별도)
 *
 * 환경 변수:
 * - NOTION_API_KEY: Notion API 토큰
 * - NOTION_STORY_DB_ID: Story 전용 Notion 데이터베이스 ID (권장)
 * - NOTION_DB_ID / NOTION_DATABASE_ID: (fallback, 노트북 DB와 동일할 수 있음)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // GET 요청만 허용
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  const NOTION_DB_ID =
    process.env.NOTION_STORY_DB_ID ||
    process.env.NOTION_DB_ID ||
    process.env.NOTION_DATABASE_ID ||
    null;

  if (!NOTION_API_KEY || !NOTION_DB_ID) {
    return res.status(500).json({
      error: 'Notion configuration missing',
      message:
        'NOTION_API_KEY and NOTION_STORY_DB_ID (or NOTION_DB_ID) environment variables are required for Story API'
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
          'Authorization': `Bearer ${NOTION_API_KEY}`,
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
        'Authorization': `Bearer ${NOTION_API_KEY}`,
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
    // TODO: Notion API pagination 처리 필요
    // Notion은 기본 100개 제한이 있으므로, 스토리가 많아지면 has_more와 next_cursor를 사용하여
    // 모든 페이지를 순회하여 결과를 수집해야 함
    // 참고: data.has_more, data.next_cursor
    return res.status(200).json({ results: data.results || [] });
  } catch (error: any) {
    console.error('Story API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
