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
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  if ((!cloudName || !apiKey || !apiSecret) && !cloudinaryUrl) {
    return { ok: false, message: 'Cloudinary 환경 변수가 누락되었습니다.' };
  }

  if (cloudinaryUrl) {
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

  const configResult = configureCloudinary();
  if (!configResult.ok) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: configResult.message
    });
  }

  try {
    const folderConfig = {
      front: ['Notebooks/Cover/Front', 'Front'],
      back: ['Notebooks/Cover/Back', 'Back'],
      contents: ['Notebooks/Contents', 'Contents']
    };

    const normalizeKey = (baseName) => {
      return baseName.replace(/_[A-Za-z0-9]{6}$/, '');
    };

    const parseFileNameMeta = (baseName) => {
      const normalized = normalizeKey(baseName);
      const [yearLabel = '', typeRaw = ''] = normalized.split('-', 2);
      const match = typeRaw.match(/^(.*?)(\d+)?$/);
      const recordType = (match?.[1] || '').trim();
      const recordOrder = match?.[2] ? Number(match[2]) : null;
      return {
        normalized_key: normalized,
        year_label: yearLabel,
        record_type: recordType,
        record_order: recordOrder
      };
    };

    const normalizeAsset = (asset) => {
      const baseName = asset.public_id.split('/').pop() || asset.public_id;
      const fileName = asset.format ? `${baseName}.${asset.format}` : baseName;
      const normalizedKey = normalizeKey(baseName);
      return {
        normalized_key: normalizedKey,
        public_id: asset.public_id,
        file_name: fileName,
        url: asset.secure_url,
        bytes: asset.bytes,
        format: asset.format,
        pages: typeof asset.pages === 'number' ? asset.pages : null,
        created_at: asset.created_at
      };
    };

    const toAssetMap = (resources) => {
      return (resources || []).reduce((acc, asset) => {
        const normalized = normalizeAsset(asset);
        const key = normalized.normalized_key || normalized.file_name || normalized.public_id;
        acc[key] = normalized;
        return acc;
      }, {});
    };

    const deliveryTypes = ['upload', 'authenticated'];

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
      fetchResources({ prefixes: folderConfig.front, resource_type: 'image' }),
      fetchResources({ prefixes: folderConfig.front, resource_type: 'raw' }),
      fetchResources({ prefixes: folderConfig.back, resource_type: 'image' }),
      fetchResources({ prefixes: folderConfig.back, resource_type: 'raw' }),
      fetchResources({ prefixes: folderConfig.contents, resource_type: 'raw' }),
      fetchResources({ prefixes: folderConfig.contents, resource_type: 'image' })
    ]);

    const frontImageMap = toAssetMap(frontImageResources);
    const frontRawMap = toAssetMap(frontRawResources);
    const backImageMap = toAssetMap(backImageResources);
    const backRawMap = toAssetMap(backRawResources);
    const frontMap = { ...frontRawMap, ...frontImageMap };
    const backMap = { ...backRawMap, ...backImageMap };
    const rawContents = (contentsRawResources || []).filter((asset) => {
      const isPdfFormat = asset.format === 'pdf';
      const isPdfUrl =
        typeof asset.secure_url === 'string' &&
        asset.secure_url.toLowerCase().endsWith('.pdf');
      return isPdfFormat || isPdfUrl;
    });
    const imageContents = (contentsImageResources || []).filter((asset) => {
      const isPdfFormat = asset.format === 'pdf';
      const isPdfUrl =
        typeof asset.secure_url === 'string' &&
        asset.secure_url.toLowerCase().endsWith('.pdf');
      return isPdfFormat || isPdfUrl;
    });
    const contentsRawMap = toAssetMap(rawContents);
    const contentsImageMap = toAssetMap(imageContents);
    const contentsMap = {
      ...contentsImageMap,
      ...contentsRawMap
    };

    const allKeys = new Set([
      ...Object.keys(frontMap),
      ...Object.keys(backMap),
      ...Object.keys(contentsMap)
    ]);

    const notes = Array.from(allKeys)
      .sort((a, b) => a.localeCompare(b, 'ko'))
      .map((key) => {
        const contentsAsset = contentsRawMap[key] || contentsImageMap[key] || null;
        return {
          key,
          ...parseFileNameMeta(key),
          front: frontMap[key]?.url || null,
          back: backMap[key]?.url || null,
          contents: contentsAsset?.url || null,
          front_asset: frontMap[key] || null,
          back_asset: backMap[key] || null,
          contents_asset: contentsAsset,
          contents_resource_type: contentsRawMap[key] ? 'raw' : contentsImageMap[key] ? 'image' : null
        };
      });

    const contentsItems = [
      ...Object.values(contentsRawMap),
      ...Object.values(contentsImageMap)
    ];

    return res.status(200).json({
      count: notes.length,
      notes,
      items: contentsItems,
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
