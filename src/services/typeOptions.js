/**
 * By Type 사이드 메뉴용 타입 옵션 정의
 *
 * Notion DB notebook_type 태그와 1:1 매칭 (순서 동일):
 *   1. 다이어리(일기장)
 *   2. 스케줄러
 *   3. 수첩/메모지
 *   4. 스케치북
 *   5. 줄공책
 *
 * - value: URL 경로용 슬러그 (/by-type/:value)
 * - labelKr: 사이드 메뉴 표시 텍스트 한글 (Notion 태그명과 동일)
 * - labelMobile: 모바일 짧은 라벨 (영문, label과 동일)
 */
export const typeOptions = [
  {
    value: 'diary',
    label: 'Diary & Journal',
    labelKr: '다이어리(일기장)',
    labelMobile: 'Diary & Journal'
  },
  {
    value: 'scheduler',
    label: 'Scheduler',
    labelKr: '스케줄러',
    labelMobile: 'Scheduler'
  },
  {
    value: 'notebook-memo',
    label: 'Handy Notebook',
    labelKr: '수첩/메모지',
    labelMobile: 'Handy Notebook'
  },
  {
    value: 'sketchbook',
    label: 'Sketchbook',
    labelKr: '스케치북',
    labelMobile: 'Sketchbook'
  },
  {
    value: 'lined-notebook',
    label: 'Lined-notebook',
    labelKr: '줄공책',
    labelMobile: 'Lined-notebook'
  }
];

/*
 * listTitle, listBody: 타입별 리스트 왼쪽 설명 영역 (현재 미사용. 리스트 뷰 추가 시 사용)
 *
 * diary:      listTitle: '매일의 기록, 다이어리',
 *             listBody: '다이어리는 줄노트나 그리드...'
 * scheduler:  listTitle: '시간 관리를 위한 기록 도구, 스케줄러',
 *             listBody: '포켓에 들어가는 슬림한 사이즈의 주간 스케줄러를 씁니다...'
 * notebook-memo: listTitle: '기록의 부담을 덜어주는 작은 기록 도구, 수첩',
 *             listBody: '일기, 메모, 독서노트, 주간/일간 계획 등...'
 * sketchbook: listTitle: '그림을 그리는 데 특화된 기록 도구, 스케치북',
 *             listBody: '스케치북은 수채화가 가능한 것, 그렇지 않은 것으로...'
 * lined-notebook: listTitle: '공부와 연구를 위한 기록 도구, 줄공책',
 *             listBody: '줄공책은 가장 오래, 가장 많이 소비한 노트라고...'
 */
