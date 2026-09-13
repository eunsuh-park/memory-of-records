/**
 * 반응형 구간. CSS @media 숫자와 같아야 한다.
 *
 * Mobile  ≤768px 너비
 * Tablet  769–1024px 너비 (아이패드 에어/프로 세로 유지)
 * Desktop ≥1025px 너비
 *
 * 헤더 햄버거(컴팩트): 너비 ≤768px 또는 높이 ≤640px
 * 높이 768이면 13인치 맥북 창모드(~700px)까지 탭이 햄버거로 들어간다.
 */
export const MOBILE_MAX_PX = 768;
export const TABLET_MAX_PX = 1024;
export const COMPACT_HEIGHT_MAX_PX = 640;

export const COMPACT_HEADER_MQ = `(max-height: ${COMPACT_HEIGHT_MAX_PX}px), (max-width: ${MOBILE_MAX_PX}px)`;
export const TABLET_OR_SHORT_MQ = `(max-width: ${TABLET_MAX_PX}px), (max-height: ${COMPACT_HEIGHT_MAX_PX}px)`;
