/**
 * 노트 표지/칩용 한글 색상명 → 선명한 페인트
 * (테마 토큰이 아님 — 실제 노트 색 흉내)
 */

export const NOTE_COLOR_PAINT = {
  파랑: '#2F6BFF',
  노랑: '#FFCC00',
  빨강: '#FF3B30',
  초록: '#34C759',
  분홍: '#FF5CA8',
  주황: '#FF9500',
  보라: '#AF52DE',
  하늘: '#5AC8FA',
  연두: '#A8E010',
  갈색: '#A05A2C',
  남색: '#1B3A8A',
  회색: '#8E8E93',
  무지개:
    'linear-gradient(135deg,#FF3B30 0%,#FF9500 20%,#FFCC00 40%,#34C759 60%,#2F6BFF 80%,#AF52DE 100%)',
  흰색: '#F7F7F5',
  검정: '#141414',
  자주: '#C2185B'
};

/** 파일명/슬러그용 */
export const NOTE_COLOR_SLUG = {
  파랑: 'blue',
  노랑: 'yellow',
  빨강: 'red',
  초록: 'green',
  분홍: 'pink',
  주황: 'orange',
  보라: 'purple',
  하늘: 'sky',
  연두: 'lime',
  갈색: 'brown',
  남색: 'navy',
  회색: 'gray',
  무지개: 'rainbow',
  흰색: 'white',
  검정: 'black',
  자주: 'wine'
};

export const NOTE_COLOR_NAMES = Object.keys(NOTE_COLOR_PAINT);

export const LIGHT_NOTE_COLORS = new Set(['흰색', '노랑', '연두', '하늘']);

export function resolveNoteColorPaint(colorName, fallback = '보라') {
  const key = String(colorName || '').trim();
  if (NOTE_COLOR_PAINT[key]) return { name: key, paint: NOTE_COLOR_PAINT[key] };
  const fb = NOTE_COLOR_PAINT[fallback] ? fallback : '보라';
  return { name: fb, paint: NOTE_COLOR_PAINT[fb] };
}

export function isLightNoteColor(colorName) {
  return LIGHT_NOTE_COLORS.has(String(colorName || '').trim());
}

export function darkenHex(hex, amount = 0.22) {
  const raw = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return hex;
  const n = (i) => Math.max(0, Math.min(255, Math.round(parseInt(raw.slice(i, i + 2), 16) * (1 - amount))));
  return `#${[0, 2, 4].map((i) => n(i).toString(16).padStart(2, '0')).join('')}`;
}
