import { v2 as cloudinary } from 'cloudinary';

// Cloudinary 설정을 매 요청 전에 적용해도 무방합니다.
// (Vercel Function은 요청마다 실행될 수 있으므로 안전한 방식)
export function configureCloudinary() {
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

export async function listNotebookFolders() {
  return cloudinary.api.sub_folders('Notebooks');
}

export async function listResources({
  prefix,
  maxResults = 20,
  nextCursor = null,
  resourceType = 'image'
}) {
  const normalizedMaxResults =
    Number.isFinite(maxResults) && maxResults > 0 ? Math.min(maxResults, 500) : 20;

  return cloudinary.api.resources({
    type: 'upload',
    prefix,
    resource_type: resourceType,
    max_results: normalizedMaxResults,
    ...(nextCursor ? { next_cursor: nextCursor } : {})
  });
}
