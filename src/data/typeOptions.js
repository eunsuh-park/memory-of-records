/**
 * By Type 사이드 메뉴용 타입 옵션 정의
 *
 * Notion DB notebook_type 태그와 1:1 매칭 (순서 동일):
 *   1. 다이어리
 *   2. 플래너
 *   3. 메모장
 *   4. 스케치북
 *   5. 학습/공부 노트
 *   6. 업무용 노트
 *   7. 일반 노트
 *   8. 여행 기록
 *   9. 스크랩
 *  10. 컬렉션
 *  11. 기타
 *
 * - value: URL 경로용 슬러그 (/by-type/:value)
 * - label: 사이드 메뉴 표시 텍스트 (영문)
 * - labelKr: Notion 태그명과 동일
 * - labelMobile: 모바일 짧은 라벨 (영문)
 * - aliases: 개편 전 태그·슬러그 (옛 URL·잔여 값 매칭)
 */
export const typeOptions = [
  {
    value: 'diary',
    label: 'Diary',
    labelKr: '다이어리',
    labelMobile: 'Diary',
    aliases: ['다이어리(일기장)', 'Diary & Journal']
  },
  {
    value: 'planner',
    label: 'Planner',
    labelKr: '플래너',
    labelMobile: 'Planner',
    aliases: ['scheduler', '스케줄러', 'Scheduler']
  },
  {
    value: 'memo',
    label: 'Memo',
    labelKr: '메모장',
    labelMobile: 'Memo',
    aliases: ['notebook-memo', '수첩/메모지', 'Handy Notebook']
  },
  {
    value: 'sketchbook',
    label: 'Sketchbook',
    labelKr: '스케치북',
    labelMobile: 'Sketchbook'
  },
  {
    value: 'study',
    label: 'Study',
    labelKr: '학습/공부 노트',
    labelMobile: 'Study'
  },
  {
    value: 'work',
    label: 'Work',
    labelKr: '업무용 노트',
    labelMobile: 'Work'
  },
  {
    value: 'general',
    label: 'General',
    labelKr: '일반 노트',
    labelMobile: 'General',
    aliases: ['lined-notebook', '줄공책', 'Lined-notebook']
  },
  {
    value: 'travel',
    label: 'Travel',
    labelKr: '여행 기록',
    labelMobile: 'Travel'
  },
  {
    value: 'scrap',
    label: 'Scrap',
    labelKr: '스크랩',
    labelMobile: 'Scrap'
  },
  {
    value: 'collection',
    label: 'Collection',
    labelKr: '컬렉션',
    labelMobile: 'Collection'
  },
  {
    value: 'others',
    label: 'Others',
    labelKr: '기타',
    labelMobile: 'Others'
  }
];

/**
 * Notion notebook_type · URL 슬러그 → typeOptions.value
 * @param {string|string[]} notebookType
 * @returns {string|null}
 */
export function resolveTypeKey(notebookType) {
  let raw = notebookType;
  if (Array.isArray(raw)) raw = raw[0] ?? '';
  const normalized = String(raw || '').trim().toLowerCase();
  if (!normalized) return null;
  const match = typeOptions.find((opt) => {
    const keys = [opt.value, opt.label, opt.labelKr, opt.labelMobile, ...(opt.aliases || [])];
    return keys.some((key) => String(key || '').toLowerCase() === normalized);
  });
  return match?.value ?? null;
}
