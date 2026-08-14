import assert from 'node:assert/strict';
import test from 'node:test';
import {
  UNKNOWN_YEAR,
  assignPublicIdsToNotes,
  linedNotebookPrefix,
  prefixFromNotebook,
  publicIdForNote,
  selectPublicIdYear
} from '../api/_lib/publicId.js';

test('시작·종료가 모두 없으면 9999', () => {
  assert.equal(selectPublicIdYear('', ''), UNKNOWN_YEAR);
  assert.equal(selectPublicIdYear(null, null), UNKNOWN_YEAR);
});

test('종료일이 없으면 시작연도', () => {
  assert.equal(selectPublicIdYear('2026-01-15', ''), 2026);
  assert.equal(selectPublicIdYear('2026-01-15', null), 2026);
});

test('사용 기간이 2년 이상이면 시작연도 (윤년 최다일수여도)', () => {
  assert.equal(selectPublicIdYear('2022-01-01', '2024-12-31'), 2022);
  assert.equal(selectPublicIdYear('2018-01-01', '2021-12-31'), 2018);
  assert.equal(selectPublicIdYear('2010-01-01', '2016-12-31'), 2010);
  assert.equal(selectPublicIdYear('2019-01-01', '2020-12-31'), 2019);
});

test('두 해 일수가 같으면 시작연도 (최신연도 아님)', () => {
  assert.equal(selectPublicIdYear('2022-01-01', '2023-12-31'), 2022);
});

test('2년 미만이면 겹친 일수가 많은 연도', () => {
  assert.equal(selectPublicIdYear('2025-12-01', '2026-03-11'), 2026);
  assert.equal(selectPublicIdYear('2009-05-15', '2010-01-26'), 2009);
  assert.equal(selectPublicIdYear('2008-08-12', '2009-01-28'), 2008);
});

test('날짜가 뒤집혀 있으면 시작연도', () => {
  assert.equal(selectPublicIdYear('2010-12-18', '2010-03-28'), 2010);
});

test('줄공책 접두사', () => {
  assert.equal(linedNotebookPrefix('2025-2026_해빗트래커'), 'NOTE');
  assert.equal(linedNotebookPrefix('04_2025_학습노트_구글PM'), 'STDY');
  assert.equal(linedNotebookPrefix('2010-2016_독서록'), 'STDY');
  assert.equal(linedNotebookPrefix('2007_독후감'), 'STDY');
  assert.equal(linedNotebookPrefix('2006_받아쓰기'), 'STDY');
  assert.equal(linedNotebookPrefix('04_2023_업무일지_1'), 'WORK');
  assert.equal(prefixFromNotebook('줄공책', '04_2024-25_학습노트_JLPT__1'), 'STDY');
  assert.equal(prefixFromNotebook('다이어리(일기장)', '2024_일기장_1'), 'DIRY');
  assert.equal(prefixFromNotebook('스케줄러', '2026_스케줄러'), 'PLNR');
});

test('새 노트는 같은 prefix-year의 다음 번호', () => {
  assert.equal(
    publicIdForNote({
      notebookType: '다이어리(일기장)',
      name: '새 일기',
      periodStart: '2026-01-01',
      existingIds: ['DIRY-2026-0001', 'DIRY-2025-0004']
    }),
    'DIRY-2026-0002'
  );
  assert.equal(
    publicIdForNote({
      notebookType: '스케치북',
      name: '연습장',
      existingIds: []
    }),
    'SKTC-9999-0001'
  );
});

const CATALOG = [
  { name: '2025-2026_해빗트래커', notebookType: '줄공책', periodStart: '2025-12-01', periodEnd: '2026-03-11' },
  { name: '01_2025_일기_10-11월', notebookType: '다이어리(일기장)', periodStart: '2025-10-01', periodEnd: '2025-11-30' },
  { name: '01_2025_다이어리', notebookType: '다이어리(일기장)', periodStart: '2025-01-01', periodEnd: '2025-12-31' },
  { name: '03_2025_카툰연습장_1', notebookType: '스케치북', periodStart: '2025-01-01', periodEnd: '2025-12-31' },
  { name: '04_2025_학습노트_구글PM', notebookType: '줄공책', periodStart: '2025-01-01', periodEnd: '2025-12-31' },
  { name: '2024_모닝저널', notebookType: '다이어리(일기장)', periodStart: '2024-06-10', periodEnd: '2024-12-04' },
  { name: '2024_일기장_1', notebookType: '다이어리(일기장)', periodStart: '2024-01-01', periodEnd: '2024-12-31' },
  { name: '2022-2024_기타(위클리)', notebookType: '다이어리(일기장)', periodStart: '2022-01-01', periodEnd: '2024-12-31' },
  { name: '01_2024_스케줄러', notebookType: '스케줄러', periodStart: '2024-01-01', periodEnd: '2024-12-31' },
  { name: '2024_기타(스케줄러)', notebookType: '스케줄러', periodStart: '2024-01-01', periodEnd: '2024-12-31' },
  { name: '03_2024-25_카툰연습장', notebookType: '스케치북', periodStart: '2024-01-01', periodEnd: '2025-12-31' },
  { name: '04_2024-25_학습노트_JLPT__1', notebookType: '줄공책', periodStart: '2024-01-01', periodEnd: '2025-12-31' },
  { name: '04_2024_학습노트_노마드코더', notebookType: '줄공책', periodStart: '2024-01-01', periodEnd: '2024-12-31' },
  { name: '04_2024-25_학습노트_JLPT__3', notebookType: '줄공책', periodStart: '2024-01-01', periodEnd: '2025-12-31' },
  { name: '04_2024-25_학습노트_JLPT__2', notebookType: '줄공책', periodStart: '2024-01-01', periodEnd: '2025-12-31' },
  { name: '2023_기타(먼슬리)', notebookType: '다이어리(일기장)', periodStart: '2023-01-01', periodEnd: '2023-12-31' },
  { name: '2022-2023_일기장', notebookType: '다이어리(일기장)', periodStart: '2022-01-01', periodEnd: '2023-12-31' },
  { name: '2022-2023_기타', notebookType: '다이어리(일기장)', periodStart: '2022-01-01', periodEnd: '2023-12-31' },
  { name: '04_2022-23_다이어리', notebookType: '다이어리(일기장)', periodStart: '2022-01-01', periodEnd: '2023-12-31' },
  { name: '02_2023_수첩', notebookType: '수첩/메모지', periodStart: '2023-01-01', periodEnd: '2023-12-31' },
  { name: '04_2023_업무일지_2', notebookType: '줄공책', periodStart: '2023-01-01', periodEnd: '2023-12-31' },
  { name: '04_2023_업무일지_1', notebookType: '줄공책', periodStart: '2023-01-01', periodEnd: '2023-12-31' },
  { name: '2021-2022_기타(데일리 로그)', notebookType: '다이어리(일기장)', periodStart: '2021-01-01', periodEnd: '2022-12-31' },
  { name: '2021_일기장', notebookType: '다이어리(일기장)', periodStart: '2021-12-23', periodEnd: '2021-12-31' },
  { name: '03_2021_하상범교수님수업_스케치', notebookType: '스케치북', periodStart: '2021-01-01', periodEnd: '2021-12-31' },
  { name: '01_2019-20_다이어리', notebookType: '다이어리(일기장)', periodStart: '2019-01-01', periodEnd: '2020-12-31' },
  { name: '2019-2020_일기장', notebookType: '다이어리(일기장)', periodStart: '2019-01-01', periodEnd: '2020-12-31' },
  { name: '02_2018-21_다이어리', notebookType: '다이어리(일기장)', periodStart: '2018-01-01', periodEnd: '2021-12-31' },
  { name: '2017-2020_일기장', notebookType: '다이어리(일기장)', periodStart: '2017-01-01', periodEnd: '2020-12-31' },
  { name: '02_2020_수첩', notebookType: '수첩/메모지', periodStart: '2020-01-01', periodEnd: '2020-12-31' },
  { name: '02_2020_연습장', notebookType: '스케치북', periodStart: '2020-01-01', periodEnd: '2020-12-31' },
  { name: '04_2020_학습노트_디지털모션스튜디오2_3D제작도구2', notebookType: '줄공책', periodStart: '2020-01-01', periodEnd: '2020-12-31' },
  { name: '01_2018-19_다이어리', notebookType: '다이어리(일기장)', periodStart: '2018-01-01', periodEnd: '2019-12-31' },
  { name: '03_2019_이면지연습장_2', notebookType: '스케치북', periodStart: '2019-01-01', periodEnd: '2019-12-31' },
  { name: '03_2019_이면지연습장_1', notebookType: '스케치북', periodStart: '2019-01-01', periodEnd: '2019-12-31' },
  { name: '04_2017_다이어리', notebookType: '다이어리(일기장)', periodStart: '2017-01-01', periodEnd: '2017-12-31' },
  { name: '2017_수첩(학습노트)', notebookType: '수첩/메모지', periodStart: '2017-01-01', periodEnd: '2017-12-31' },
  { name: '2010-2016_일기장', notebookType: '다이어리(일기장)', periodStart: '2010-01-01', periodEnd: '2016-12-31' },
  { name: '2010-2016_수첩(스케줄러)_2', notebookType: '수첩/메모지', periodStart: '2010-01-01', periodEnd: '2016-12-31' },
  { name: '2010-2016_수첩(스케줄러)_4', notebookType: '수첩/메모지', periodStart: '2010-01-01', periodEnd: '2016-12-31' },
  { name: '2010-2016_수첩(스케줄러)_1', notebookType: '수첩/메모지', periodStart: '2010-01-01', periodEnd: '2016-12-31' },
  { name: '2010-2016_수첩(스케줄러)_3', notebookType: '수첩/메모지', periodStart: '2010-01-01', periodEnd: '2016-12-31' },
  { name: '2010-2016_수첩(기타)', notebookType: '수첩/메모지', periodStart: '2010-01-01', periodEnd: '2016-12-31' },
  { name: '04_2015-18_스크랩북', notebookType: '스케치북', periodStart: '2015-01-01', periodEnd: '2018-12-31' },
  { name: '2010-2016_독서록', notebookType: '줄공책', periodStart: '2010-01-01', periodEnd: '2016-12-31' },
  { name: '2010_씨앗장(일기장)', notebookType: '다이어리(일기장)', periodStart: '2010-12-18', periodEnd: '2010-03-28' },
  { name: '02_2010_교환일기', notebookType: '수첩/메모지', periodStart: '2010-01-01', periodEnd: '2010-12-31' },
  { name: '2009_독후감', notebookType: '줄공책', periodStart: '2009-05-15', periodEnd: '2010-01-26' },
  { name: '2008_일기장_1', notebookType: '다이어리(일기장)', periodStart: '2008-08-12', periodEnd: '2009-01-28' },
  { name: '2008_종합장(효도일기)', notebookType: '다이어리(일기장)', periodStart: '2008-03-09', periodEnd: '2008-09-17' },
  { name: '2007-2008_일기장', notebookType: '다이어리(일기장)', periodStart: '2007-09-02', periodEnd: '2008-01-30' },
  { name: '2007_환경일기장', notebookType: '다이어리(일기장)', periodStart: '2007-05-15', periodEnd: '2007-06-24' },
  { name: '2007_일기장', notebookType: '다이어리(일기장)', periodStart: '2007-03-10', periodEnd: '2007-08-28' },
  { name: '2007_독후감', notebookType: '줄공책', periodStart: '2007-03-23', periodEnd: '2008-01-29' },
  { name: '2006-2007_일기장', notebookType: '다이어리(일기장)', periodStart: '2006-10-29', periodEnd: '2007-02-12' },
  { name: '2006_환경일기장', notebookType: '다이어리(일기장)', periodStart: '2006-09-09', periodEnd: '2006-12-02' },
  { name: '2006_일기장_2', notebookType: '다이어리(일기장)', periodStart: '2006-05-27', periodEnd: '2006-10-28' },
  { name: '2006_일기장_1', notebookType: '다이어리(일기장)', periodStart: '2006-01-02', periodEnd: '2006-05-14' },
  { name: '2006_받아쓰기', notebookType: '줄공책', periodStart: '2006-03-30', periodEnd: '2006-12-21' },
  { name: '2006-2007_독서록', notebookType: '줄공책', periodStart: '2006-03-17', periodEnd: '2007-02-03' },
  { name: '2005_그림일기', notebookType: '다이어리(일기장)', periodStart: '2005-08-02', periodEnd: '2005-12-11' },
  { name: '2005-2006_독서록', notebookType: '줄공책', periodStart: '2005-08-18', periodEnd: '2006-02-14' },
  { name: '2005_받아쓰기', notebookType: '줄공책', periodStart: '2005-05-12', periodEnd: '2005-12-22' },
  { name: '2026_스케줄러', notebookType: '스케줄러' },
  { name: '03_연도미상_연습장_노란색', notebookType: '스케치북' },
  { name: '03_연도미상_크로키북_검정B5하드커버', notebookType: '스케치북' },
  { name: '04_연도미상_학습노트_1', notebookType: '줄공책' },
  { name: '04_연도미상_다이어리_SMARX', notebookType: '다이어리(일기장)' },
  { name: '03_연도미상_연습장_마티세그림', notebookType: '스케치북' }
];

const EXPECTED = {
  '2025-2026_해빗트래커': 'NOTE-2026-0001',
  '01_2025_일기_10-11월': 'DIRY-2025-0001',
  '01_2025_다이어리': 'DIRY-2025-0002',
  '03_2025_카툰연습장_1': 'SKTC-2025-0001',
  '04_2025_학습노트_구글PM': 'STDY-2025-0001',
  '2024_모닝저널': 'DIRY-2024-0001',
  '2024_일기장_1': 'DIRY-2024-0002',
  '2022-2024_기타(위클리)': 'DIRY-2022-0004',
  '01_2024_스케줄러': 'PLNR-2024-0001',
  '2024_기타(스케줄러)': 'PLNR-2024-0002',
  '03_2024-25_카툰연습장': 'SKTC-2024-0001',
  '04_2024-25_학습노트_JLPT__1': 'STDY-2024-0001',
  '04_2024_학습노트_노마드코더': 'STDY-2024-0004',
  '04_2024-25_학습노트_JLPT__3': 'STDY-2024-0003',
  '04_2024-25_학습노트_JLPT__2': 'STDY-2024-0002',
  '2023_기타(먼슬리)': 'DIRY-2023-0001',
  '2022-2023_일기장': 'DIRY-2022-0003',
  '2022-2023_기타': 'DIRY-2022-0002',
  '04_2022-23_다이어리': 'DIRY-2022-0001',
  '02_2023_수첩': 'MEMO-2023-0001',
  '04_2023_업무일지_2': 'WORK-2023-0002',
  '04_2023_업무일지_1': 'WORK-2023-0001',
  '2021-2022_기타(데일리 로그)': 'DIRY-2021-0002',
  '2021_일기장': 'DIRY-2021-0001',
  '03_2021_하상범교수님수업_스케치': 'SKTC-2021-0001',
  '01_2019-20_다이어리': 'DIRY-2019-0001',
  '2019-2020_일기장': 'DIRY-2019-0002',
  '02_2018-21_다이어리': 'DIRY-2018-0002',
  '2017-2020_일기장': 'DIRY-2017-0002',
  '02_2020_수첩': 'MEMO-2020-0001',
  '02_2020_연습장': 'SKTC-2020-0001',
  '04_2020_학습노트_디지털모션스튜디오2_3D제작도구2': 'STDY-2020-0001',
  '01_2018-19_다이어리': 'DIRY-2018-0001',
  '03_2019_이면지연습장_2': 'SKTC-2019-0002',
  '03_2019_이면지연습장_1': 'SKTC-2019-0001',
  '04_2017_다이어리': 'DIRY-2017-0001',
  '2017_수첩(학습노트)': 'MEMO-2017-0001',
  '2010-2016_일기장': 'DIRY-2010-0002',
  '2010-2016_수첩(스케줄러)_2': 'MEMO-2010-0004',
  '2010-2016_수첩(스케줄러)_4': 'MEMO-2010-0006',
  '2010-2016_수첩(스케줄러)_1': 'MEMO-2010-0003',
  '2010-2016_수첩(스케줄러)_3': 'MEMO-2010-0005',
  '2010-2016_수첩(기타)': 'MEMO-2010-0002',
  '04_2015-18_스크랩북': 'SKTC-2015-0001',
  '2010-2016_독서록': 'STDY-2010-0001',
  '2010_씨앗장(일기장)': 'DIRY-2010-0001',
  '02_2010_교환일기': 'MEMO-2010-0001',
  '2009_독후감': 'STDY-2009-0001',
  '2008_일기장_1': 'DIRY-2008-0001',
  '2008_종합장(효도일기)': 'DIRY-2008-0002',
  '2007-2008_일기장': 'DIRY-2007-0001',
  '2007_환경일기장': 'DIRY-2007-0002',
  '2007_일기장': 'DIRY-2007-0003',
  '2007_독후감': 'STDY-2007-0001',
  '2006-2007_일기장': 'DIRY-2006-0001',
  '2006_환경일기장': 'DIRY-2006-0002',
  '2006_일기장_2': 'DIRY-2006-0003',
  '2006_일기장_1': 'DIRY-2006-0004',
  '2006_받아쓰기': 'STDY-2006-0001',
  '2006-2007_독서록': 'STDY-2006-0002',
  '2005_그림일기': 'DIRY-2005-0001',
  '2005-2006_독서록': 'STDY-2005-0001',
  '2005_받아쓰기': 'STDY-2005-0002',
  '2026_스케줄러': 'PLNR-9999-0001',
  '03_연도미상_연습장_노란색': 'SKTC-9999-0001',
  '03_연도미상_크로키북_검정B5하드커버': 'SKTC-9999-0003',
  '04_연도미상_학습노트_1': 'STDY-9999-0001',
  '04_연도미상_다이어리_SMARX': 'DIRY-9999-0001',
  '03_연도미상_연습장_마티세그림': 'SKTC-9999-0002'
};

test('69개 초안 카탈로그에 수정 규칙을 적용한다', () => {
  assert.equal(CATALOG.length, 69);
  const assigned = assignPublicIdsToNotes(CATALOG);
  const byName = Object.fromEntries(assigned.map((row) => [row.name, row.publicId]));
  for (const [name, publicId] of Object.entries(EXPECTED)) {
    assert.equal(byName[name], publicId, name);
  }
});
