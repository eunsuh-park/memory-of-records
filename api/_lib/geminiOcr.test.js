import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_GEMINI_MODEL,
  OCR_PROMPT,
  OCR_SYSTEM,
  normalizeOcrText,
  textFromGeminiResponse,
  withOcrTransform
} from './geminiOcr.js';

test('withOcrTransform은 Cloudinary 장에 OCR용 리사이즈를 끼운다', () => {
  assert.equal(
    withOcrTransform(
      'https://res.cloudinary.com/demo/image/upload/v1/notebooks/DIRY-2025-0001/pages/page-000003.jpg'
    ),
    'https://res.cloudinary.com/demo/image/upload/w_2400,c_limit,q_90,f_jpg/v1/notebooks/DIRY-2025-0001/pages/page-000003.jpg'
  );
});

test('withOcrTransform은 이미 있는 변환을 걷어 낸 뒤 OCR 변환만 남긴다', () => {
  assert.equal(
    withOcrTransform(
      'https://res.cloudinary.com/demo/image/upload/w_800,f_auto/notebooks/DIRY-2025-0001/pages/page-000003.jpg'
    ),
    'https://res.cloudinary.com/demo/image/upload/w_2400,c_limit,q_90,f_jpg/notebooks/DIRY-2025-0001/pages/page-000003.jpg'
  );
});

test('withOcrTransform은 Cloudinary가 아니면 URL을 그대로 둔다', () => {
  assert.equal(withOcrTransform('https://files.example/page.jpg'), 'https://files.example/page.jpg');
});

test('textFromGeminiResponse는 candidates 텍스트만 모은다', () => {
  assert.equal(
    textFromGeminiResponse({
      candidates: [
        {
          content: {
            parts: [{ text: '2025. 7. 14' }, { text: '맑음' }]
          }
        }
      ]
    }),
    '2025. 7. 14\n맑음'
  );
  assert.equal(textFromGeminiResponse({}), '');
});

test('normalizeOcrText는 빈 줄과 줄 끝 공백을 정리한다', () => {
  assert.equal(normalizeOcrText('안녕  \n\n\n세계\r\n'), '안녕\n\n세계');
});

test('기본 Gemini 모델은 신규 키에서 쓰는 3.6 flash다', () => {
  assert.equal(DEFAULT_GEMINI_MODEL, 'gemini-3.6-flash');
});

test('OCR 프롬프트는 한글 기본·본문 전체·다른 언어 번역 금지를 넣는다', () => {
  assert.match(OCR_SYSTEM, /한글/);
  assert.match(OCR_SYSTEM, /영어/);
  assert.match(OCR_SYSTEM, /이외의 언어/);
  assert.match(OCR_PROMPT, /본문 전체/);
});
