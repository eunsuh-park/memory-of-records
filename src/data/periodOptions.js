/**
 * Timeline 사이드 메뉴용 시기별 옵션 정의
 *
 * Notion DB period_name 태그와 1:1 매칭 (순서 동일, 연대기 순):
 *   Elementary School, Middle & High School, University, After School
 *
 * - value: URL 경로용 슬러그 (/timeline/:value)
 * - label: 사이드 메뉴 표시 텍스트 (Notion 태그명과 동일)
 * - labelMobile: 모바일 해상도(768px 이하)에서 표시할 짧은 라벨 (HTML 허용)
 */
export const periodOptions = [
  {
    value: 'elementary',
    label: 'Elementary School',
    labelMobile: 'Elementary<br>School'
  },
  {
    value: 'middle-high',
    label: 'Middle & High School',
    labelMobile: 'Mid & High<br>School'
  },
  {
    value: 'university',
    label: 'University',
    labelMobile: 'Univ'
  },
  {
    value: 'after-school',
    label: 'After School',
    labelMobile: 'After'
  }
];
