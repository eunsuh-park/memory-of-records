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

export const NOTE_COLOR_NAMES = Object.keys(NOTE_COLOR_PAINT);

/** 스와치가 배경에 묻히는 밝은 색 (테두리 보정) */
export const LIGHT_NOTE_COLORS = new Set(['흰색', '노랑', '연두', '하늘']);
