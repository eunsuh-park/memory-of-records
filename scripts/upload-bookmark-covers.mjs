/**
 * 로컬 표지 PNG를 Cloudinary "Bookmark Note" 폴더에 front/back으로 업로드한다.
 *
 * 필요 환경변수: CLOUDINARY_URL 또는 CLOUDINARY_* 조합
 * Usage: node scripts/upload-bookmark-covers.mjs
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const FOLDER = process.env.BOOKMARK_NOTE_FOLDER || 'Bookmark Note';

function getCredentials() {
  const fromUrl = String(process.env.CLOUDINARY_URL || '').match(
    /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/
  );
  if (fromUrl) return { apiKey: fromUrl[1], apiSecret: fromUrl[2], cloudName: fromUrl[3] };
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (cloudName && apiKey && apiSecret) return { cloudName, apiKey, apiSecret };
  return null;
}

async function uploadPng({ credentials, filePath, publicId, folder }) {
  const bytes = fs.readFileSync(filePath);
  const base64 = bytes.toString('base64');
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    folder,
    invalidate: 'true',
    overwrite: 'true',
    public_id: publicId,
    timestamp: String(timestamp)
  };
  const toSign = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join('&');
  const signature = crypto
    .createHash('sha1')
    .update(toSign + credentials.apiSecret)
    .digest('hex');

  const body = new URLSearchParams({
    file: `data:image/png;base64,${base64}`,
    api_key: credentials.apiKey,
    timestamp: String(timestamp),
    signature,
    folder,
    public_id: publicId,
    overwrite: 'true',
    invalidate: 'true'
  });

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/upload`,
    { method: 'POST', body }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || JSON.stringify(data));
  }
  return data;
}

const credentials = getCredentials();
if (!credentials) {
  console.error('CLOUDINARY_URL 또는 CLOUDINARY_* 환경변수가 필요합니다.');
  process.exit(1);
}

const jobs = [
  {
    file: path.join(root, 'src/assets/bookmarks-cover-front.png'),
    publicId: 'front'
  },
  {
    file: path.join(root, 'src/assets/bookmarks-cover-back.png'),
    publicId: 'back'
  }
];

for (const job of jobs) {
  if (!fs.existsSync(job.file)) {
    console.error('missing', job.file);
    process.exit(1);
  }
  const result = await uploadPng({
    credentials,
    filePath: job.file,
    publicId: job.publicId,
    folder: FOLDER
  });
  console.log(`uploaded ${job.publicId} → ${result.public_id}`);
  console.log(`  ${result.secure_url}`);
}

console.log(`Done. Folder: ${FOLDER}`);
