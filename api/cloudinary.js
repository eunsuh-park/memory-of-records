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

  if (!cloudName || !apiKey || !apiSecret) {
    return { ok: false, message: 'Cloudinary 환경 변수가 누락되었습니다.' };
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
      front: 'Notebooks/Cover/Front',
      back: 'Notebooks/Cover/Back',
      contents: 'Notebooks/Contents'
    };

    const parseFileNameMeta = (baseName) => {
      const [yearLabel = '', typeRaw = ''] = baseName.split('-', 2);
      const match = typeRaw.match(/^(.*?)(\d+)?$/);
      const recordType = (match?.[1] || '').trim();
      const recordOrder = match?.[2] ? Number(match[2]) : null;
      return {
        year_label: yearLabel,
        record_type: recordType,
        record_order: recordOrder
      };
    };

    const normalizeAsset = (asset) => {
      const baseName = asset.public_id.split('/').pop() || asset.public_id;
      const fileName = asset.format ? `${baseName}.${asset.format}` : baseName;
      return {
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
        const key = asset.public_id.split('/').pop() || asset.public_id;
        acc[key] = normalizeAsset(asset);
        return acc;
      }, {});
    };

    const [
      frontImageResult,
      frontRawResult,
      backImageResult,
      backRawResult,
      contentsRawResult,
      contentsImageResult
    ] = await Promise.all([
      cloudinary.api.resources({
        type: 'upload',
        prefix: `${folderConfig.front}/`,
        resource_type: 'image',
        max_results: 500
      }),
      cloudinary.api.resources({
        type: 'upload',
        prefix: `${folderConfig.front}/`,
        resource_type: 'raw',
        max_results: 500
      }),
      cloudinary.api.resources({
        type: 'upload',
        prefix: `${folderConfig.back}/`,
        resource_type: 'image',
        max_results: 500
      }),
      cloudinary.api.resources({
        type: 'upload',
        prefix: `${folderConfig.back}/`,
        resource_type: 'raw',
        max_results: 500
      }),
      cloudinary.api.resources({
        type: 'upload',
        prefix: `${folderConfig.contents}/`,
        resource_type: 'raw',
        max_results: 500
      }),
      cloudinary.api.resources({
        type: 'upload',
        prefix: `${folderConfig.contents}/`,
        resource_type: 'image',
        max_results: 500
      })
    ]);

    const frontImageMap = toAssetMap(frontImageResult.resources);
    const frontRawMap = toAssetMap(frontRawResult.resources);
    const backImageMap = toAssetMap(backImageResult.resources);
    const backRawMap = toAssetMap(backRawResult.resources);
    const frontMap = { ...frontRawMap, ...frontImageMap };
    const backMap = { ...backRawMap, ...backImageMap };
    const rawContents = (contentsRawResult.resources || []).filter((asset) => {
      const isPdfFormat = asset.format === 'pdf';
      const isPdfUrl =
        typeof asset.secure_url === 'string' &&
        asset.secure_url.toLowerCase().endsWith('.pdf');
      return isPdfFormat || isPdfUrl;
    });
    const imageContents = (contentsImageResult.resources || []).filter((asset) => {
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
      next_cursor:
        contentsRawResult.next_cursor ||
        contentsImageResult.next_cursor ||
        null,
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
