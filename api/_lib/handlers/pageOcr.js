/**
 * POST /api/writePages  op=ocr
 * Gemini로 페이지 이미지 글자만 읽는다. 날짜 정규화는 클라이언트가 한다.
 */
import { getSessionFromRequest } from '../session.js';
import { getGeminiConfig, recognizeImageWithGemini } from '../geminiOcr.js';

export async function handlePageOcr(req, res, body) {
  if (!getSessionFromRequest(req)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: '로그인 후 OCR을 실행할 수 있습니다'
    });
  }

  if (!getGeminiConfig()) {
    return res.status(500).json({
      error: 'Gemini configuration missing',
      message: 'GEMINI_API_KEY 환경 변수가 필요합니다'
    });
  }

  try {
    const text = await recognizeImageWithGemini({
      imageUrl: body.imageUrl,
      file: body.file
    });
    return res.status(200).json({ ok: true, text });
  } catch (error) {
    return res.status(error.status || 502).json({
      error: 'Gemini OCR failed',
      message: error.message || 'Gemini OCR에 실패했습니다',
      details: error.details || undefined
    });
  }
}
