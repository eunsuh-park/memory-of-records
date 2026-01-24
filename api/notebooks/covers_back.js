/**
 * Vercel Serverless Function: Cloudinary Admin API 프록시
 *
 * GET /api/notebooks/covers_back
 * Cloudinary Admin API에서 뒷면 표지 이미지 목록을 가져옵니다.
 *
 * 필요 환경 변수:
 * - CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 */

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: 'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET are required'
    });
  }

  try {
    const allParam = String(req.query?.all || '').toLowerCase() === 'true';
    const fields = 'asset_id,public_id,asset_folder,secure_url,url';
    const maxPages = 20;
    const perPage = 500;

    const buildUrl = (nextCursor) => {
      const params = new URLSearchParams({
        asset_folder: 'Notebooks/Cover/Back',
        fields,
        ...(allParam ? { max_results: String(perPage) } : {}),
        ...(nextCursor ? { next_cursor: nextCursor } : {})
      });
      return `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?${params.toString()}`;
    };

    const authToken = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    if (!allParam) {
      const response = await fetch(buildUrl(), {
        method: 'GET',
        headers: {
          Authorization: `Basic ${authToken}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: 'Cloudinary API error',
          details: data
        });
      }

      return res.status(200).json(data);
    }

    let allResources = [];
    let nextCursor = null;
    let pageCount = 0;

    do {
      const response = await fetch(buildUrl(nextCursor), {
        method: 'GET',
        headers: {
          Authorization: `Basic ${authToken}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: 'Cloudinary API error',
          details: data
        });
      }

      const resources = Array.isArray(data?.resources) ? data.resources : [];
      allResources = allResources.concat(resources);
      nextCursor = data?.next_cursor || null;
      pageCount += 1;
    } while (nextCursor && pageCount < maxPages);

    return res.status(200).json({
      resources: allResources,
      next_cursor: nextCursor,
      truncated: Boolean(nextCursor)
    });
  } catch (error) {
    console.error('Cloudinary API error:', error);
    return res.status(500).json({
      error: 'Cloudinary API error',
      message: error?.message || 'Unknown error'
    });
  }
}
