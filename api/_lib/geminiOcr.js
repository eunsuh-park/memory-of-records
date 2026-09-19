/**
 * Gemini 이미지 OCR — 글자만 읽는다. 날짜 해석은 src/utils/entryDate.js 가 한다.
 *
 * Env: GEMINI_API_KEY (또는 GOOGLE_API_KEY), GEMINI_MODEL (선택)
 */
import { stripCloudinaryTransforms } from './ogImage.js';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
export const OCR_TRANSFORM = 'w_2400,c_limit,q_90,f_jpg';
export const OCR_SYSTEM =
  '당신은 한국어 일기 페이지를 그대로 옮기는 OCR이다. ' +
  '기본 언어는 한글이다. 영어 단어·고유명사는 가끔 나온다. ' +
  '한글과 영어 이외의 언어로 읽거나 번역하지 않는다.';
export const OCR_PROMPT =
  '이 일기 페이지의 보이는 글자를 처음부터 끝까지 그대로 옮겨 적으세요. ' +
  '날짜·제목만이 아니라 본문 전체를 빠짐없이 적습니다. 한 줄도 건너뛰지 마세요. ' +
  '인쇄·손글씨·숫자·날짜·영문 고유명사를 보이는 대로 둡니다. ' +
  '설명, 요약, 추측, 다른 언어 번역, 마크다운 제목은 쓰지 마세요. ' +
  '글자가 없으면 빈 응답만 보내세요.';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function getGeminiConfig() {
  const apiKey = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (!apiKey) return null;
  const model = String(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim() || DEFAULT_GEMINI_MODEL;
  return { apiKey, model };
}

/**
 * Cloudinary 장은 OCR용으로 장변을 줄인다. 그 외 URL은 그대로 둔다.
 * @param {string} url
 * @returns {string}
 */
export function withOcrTransform(url) {
  const raw = String(url || '').trim();
  const match = raw.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i);
  if (!match) return raw;
  const source = stripCloudinaryTransforms(match[2]);
  if (!source) return raw;
  return `${match[1]}${OCR_TRANSFORM}/${source}`;
}

export function normalizeOcrText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function textFromGeminiResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return normalizeOcrText(
    parts
      .map((part) => (part && typeof part.text === 'string' ? part.text : ''))
      .join('\n')
  );
}

export function parseDataUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
  if (match) return { mime: match[1], base64: match[2] };
  return null;
}

function mimeFromResponse(contentType, fallback = 'image/jpeg') {
  const mime = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) {
    return mime === 'image/jpg' ? 'image/jpeg' : mime;
  }
  return fallback;
}

/**
 * @param {{ imageUrl?: string, file?: string }} source
 * @returns {Promise<{ mime: string, base64: string }>}
 */
export async function loadImageForOcr(source = {}) {
  const parsed = parseDataUrl(source.file);
  if (parsed?.base64) {
    const approxBytes = Math.floor((parsed.base64.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      const error = new Error(`OCR 이미지는 ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB 이하여야 합니다`);
      error.status = 400;
      throw error;
    }
    return { mime: mimeFromResponse(parsed.mime), base64: parsed.base64 };
  }

  const imageUrl = withOcrTransform(source.imageUrl);
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    const error = new Error('imageUrl 또는 file(data URL)이 필요합니다');
    error.status = 400;
    throw error;
  }

  const response = await fetch(imageUrl, { redirect: 'follow' });
  if (!response.ok) {
    const error = new Error(`페이지 이미지를 불러오지 못했습니다 (${response.status})`);
    error.status = 400;
    throw error;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) {
    const error = new Error(`OCR 이미지는 ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))}MB 이하여야 합니다`);
    error.status = 400;
    throw error;
  }
  return {
    mime: mimeFromResponse(response.headers.get('content-type')),
    base64: buffer.toString('base64')
  };
}

/**
 * @param {{ imageUrl?: string, file?: string, apiKey?: string, model?: string }} options
 * @returns {Promise<string>}
 */
export async function recognizeImageWithGemini(options = {}) {
  const config = options.apiKey
    ? { apiKey: options.apiKey, model: options.model || DEFAULT_GEMINI_MODEL }
    : getGeminiConfig();
  if (!config?.apiKey) {
    const error = new Error('GEMINI_API_KEY 환경 변수가 필요합니다');
    error.status = 500;
    throw error;
  }

  const image = await loadImageForOcr(options);
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: OCR_SYSTEM }]
      },
      contents: [
        {
          parts: [
            { inline_data: { mime_type: image.mime, data: image.base64 } },
            { text: OCR_PROMPT }
          ]
        }
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Gemini OCR에 실패했습니다');
    error.status = response.status >= 400 && response.status < 600 ? response.status : 502;
    error.details = data;
    throw error;
  }
  return textFromGeminiResponse(data);
}
