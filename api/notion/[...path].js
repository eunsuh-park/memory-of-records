/**
 * Vercel Serverless Function for Notion API Proxy (Dynamic Route)
 * CORS 문제를 해결하기 위한 프록시 API
 * 
 * 배포 방법:
 * 1. Vercel에 프로젝트를 배포
 * 2. Vercel 환경 변수에 NOTION_API_KEY 설정
 * 3. Vercel 배포 URL을 VITE_NOTION_PROXY_URL로 설정
 */

export default async function handler(req, res) {
  // 요청 본문 파싱 (POST 요청의 경우)
  let body = null;
  if (req.method === 'POST') {
    try {
      body = JSON.parse(req.body || '{}');
    } catch (e) {
      body = req.body;
    }
  }
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // OPTIONS 요청 처리 (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const NOTION_API_KEY = process.env.NOTION_API_KEY || process.env.VITE_NOTION_API_KEY;

  if (!NOTION_API_KEY) {
    return res.status(500).json({ error: 'Notion API key not configured' });
  }

  // 동적 경로 추출
  const pathSegments = req.query.path || [];
  const notionPath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;

  // Notion API URL 구성
  const notionUrl = `https://api.notion.com/v1/${notionPath}`;

  try {
    // Notion API 요청
    const response = await fetch(notionUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: req.method === 'POST' ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Notion API proxy error:', error);
    return res.status(500).json({ error: error.message });
  }
}

