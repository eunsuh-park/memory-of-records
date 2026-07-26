/**
 * Cloudinary 자격증명 공통 헬퍼
 * CLOUDINARY_URL 또는 CLOUDINARY_CLOUD_NAME + API_KEY + API_SECRET
 */

export function getCloudinaryCredentials() {
  const fromUrl = process.env.CLOUDINARY_URL;
  if (fromUrl) {
    const match = String(fromUrl).match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };
  return null;
}
