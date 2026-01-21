/**
 * Vercel Serverless Function: Cloudinary Admin API 프록시
 *
 * 목적:
 * - Cloudinary Admin API는 서버에서만 호출해야 안전합니다.
 * - 이 함수는 /api/cloudinary 엔드포인트로 접근합니다.
 *
 * 필요한 환경 변수:
 * - CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 */

import { v2 as cloudinary } from 'cloudinary';

// Cloudinary 설정을 매 요청 전에 적용해도 무방합니다.
// (Vercel Function은 요청마다 실행될 수 있으므로 안전한 방식)
function configureCloudinary() {
  // 우선순위:
  // 1) CLOUDINARY_URL이 있으면 그 값을 파싱해서 설정
  // 2) 없으면 개별 환경 변수(CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET) 사용
  // 둘 중 하나라도 누락되면 에러를 반환
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  if ((!cloudName || !apiKey || !apiSecret) && !cloudinaryUrl) {
    return { ok: false, message: 'Cloudinary 환경 변수가 누락되었습니다.' };
  }

  if (cloudinaryUrl) {
    // cloudinary://<api_key>:<api_secret>@<cloud_name> 형식을 URL로 파싱
    try {
      const parsed = new URL(cloudinaryUrl);
      const urlCloudName = parsed.hostname;
      const urlApiKey = decodeURIComponent(parsed.username || '');
      const urlApiSecret = decodeURIComponent(parsed.password || '');
      if (!urlCloudName || !urlApiKey || !urlApiSecret) {
        return { ok: false, message: 'CLOUDINARY_URL 형식이 올바르지 않습니다.' };
      }
      cloudinary.config({
        cloud_name: urlCloudName,
        api_key: urlApiKey,
        api_secret: urlApiSecret,
        secure: true
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: 'CLOUDINARY_URL 파싱에 실패했습니다.' };
    }
  }

  // CLOUDINARY_URL이 없을 때는 개별 환경 변수로 설정
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });

  return { ok: true };
}

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  // GET 요청만 허용합니다.
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Cloudinary 인증 설정 확인 (누락 시 500 응답)
  const configResult = configureCloudinary();
  if (!configResult.ok) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: configResult.message
    });
  }

  try {
    // 조회할 폴더 프리픽스 목록
    // 실제 public_id 경로가 다양할 수 있어 복수 prefix를 허용
    const folderConfig = {
      front: ['Notebooks/Cover/Front', 'Front'],
      back: ['Notebooks/Cover/Back', 'Back'],
      contents: ['Notebooks/Contents', 'Contents']
    };

    // Cloudinary delivery type: upload / authenticated 둘 다 조회
    const deliveryTypes = ['upload', 'authenticated'];

    // 여러 prefix와 delivery type을 조합해서 리소스 목록을 모두 가져옴
    const fetchResources = async ({ prefixes, resource_type }) => {
      const results = await Promise.all(
        prefixes.flatMap((prefix) =>
          deliveryTypes.map((type) =>
            cloudinary.api.resources({
              type,
              prefix: `${prefix}/`,
              resource_type,
              max_results: 500
            })
          )
        )
      );
      return results.flatMap((result) => result.resources || []);
    };

    const [
      frontImageResources,
      frontRawResources,
      backImageResources,
      backRawResources,
      contentsRawResources,
      contentsImageResources
    ] = await Promise.all([
      // Front/Back은 image + raw 둘 다 조회
      // Contents는 pdf가 raw 또는 image로 올라갈 수 있어 둘 다 조회
      fetchResources({ prefixes: folderConfig.front, resource_type: 'image' }),
      fetchResources({ prefixes: folderConfig.front, resource_type: 'raw' }),
      fetchResources({ prefixes: folderConfig.back, resource_type: 'image' }),
      fetchResources({ prefixes: folderConfig.back, resource_type: 'raw' }),
      fetchResources({ prefixes: folderConfig.contents, resource_type: 'raw' }),
      fetchResources({ prefixes: folderConfig.contents, resource_type: 'image' })
    ]);

    const toAssetList = (resources) => {
      return (resources || []).map((asset) => ({
        public_id: asset.public_id || null,
        url: asset.secure_url || asset.url || null,
        bytes: asset.bytes ?? null,
        format: asset.format || null,
        resource_type: asset.resource_type || null,
        created_at: asset.created_at || null,
        width: asset.width ?? null,
        height: asset.height ?? null
      }));
    };

    // Cloudinary Admin API 원본 리소스를 최소 메타만 유지해서 반환
    const front_resources = toAssetList([...frontImageResources, ...frontRawResources]);
    const back_resources = toAssetList([...backImageResources, ...backRawResources]);
    const contents_resources = toAssetList([...contentsImageResources, ...contentsRawResources]);

    return res.status(200).json({
      // count는 프론트 이미지 개수 기준
      count: front_resources.length,
      front_resources,
      back_resources,
      contents_resources,
      next_cursor: null,
      folders: folderConfig
    });
  } catch (error) {
    console.error('Cloudinary API error:', error);
    return res.status(500).json({
      error: 'Cloudinary API error',
      message: error?.message || 'Unknown error'
    });
  }
}
