/**
 * Foundation 페이지. 색·간격·둥글기·글자·그림자·아이콘·브레이크포인트.
 */

import { renderLabPage } from './labDocs.js';
import { renderIconGrid, renderRamp, renderSwatchGroup, renderTokenSpecimens } from './labStage.js';

const STEPS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const STEPS_6 = [1, 2, 3, 4, 5, 6];

const ATOMIC_RAMPS = [
  {
    title: 'Grey · Light',
    desc: '라이트 테마 전용 12단계. 1이 가장 밝고 12가 본문 텍스트다.',
    names: STEPS_12.map((n) => `--grey-light-${n}`),
    labels: STEPS_12
  },
  {
    title: 'Grey · Dark',
    desc: '다크 테마 전용 12단계. 1이 가장 어둡고 12가 본문 텍스트다.',
    names: STEPS_12.map((n) => `--grey-dark-${n}`),
    labels: STEPS_12
  },
  {
    title: 'Primary · yellow',
    desc: '브랜드 6단계. 다크는 2단계, 라이트는 4단계를 --color-primary로 쓴다.',
    names: STEPS_6.map((n) => `--primary-${n}`),
    labels: STEPS_6
  },
  {
    title: 'Red · status',
    desc: '경고·오류 6단계. 다크는 3단계, 라이트는 5단계를 --color-error-text로 쓴다.',
    names: STEPS_6.map((n) => `--red-${n}`),
    labels: STEPS_6
  }
];

const SEMANTIC_GROUPS = [
  {
    title: 'Surface',
    names: ['--color-bg', '--color-bg-alt', '--color-surface-hover', '--color-surface-active', '--color-surface-selected']
  },
  {
    title: 'Text',
    names: ['--color-text', '--color-text-muted', '--color-text-dim', '--color-on-light']
  },
  {
    title: 'Brand',
    names: ['--color-primary', '--color-primary-hover', '--color-primary-on', '--color-status-done']
  },
  {
    title: 'Line · Overlay',
    names: ['--color-border', '--color-border-light', '--color-overlay', '--color-chrome', '--color-chrome-on']
  },
  {
    title: 'Status',
    names: ['--color-error', '--color-error-bg', '--color-error-text']
  }
];

const SPACE_STEPS = [
  { name: '--space-1', rem: '0.25rem', px: '4px' },
  { name: '--space-2', rem: '0.5rem', px: '8px' },
  { name: '--space-3', rem: '0.75rem', px: '12px' },
  { name: '--space-4', rem: '1rem', px: '16px' },
  { name: '--space-5', rem: '1.25rem', px: '20px' },
  { name: '--space-6', rem: '1.5rem', px: '24px' },
  { name: '--space-8', rem: '2rem', px: '32px' },
  { name: '--space-10', rem: '2.5rem', px: '40px' },
  { name: '--space-12', rem: '3rem', px: '48px' },
  { name: '--space-16', rem: '4rem', px: '64px' }
];

const RADIUS_STEPS = [
  { name: '--radius-none', px: '0' },
  { name: '--radius-sm', px: '4px' },
  { name: '--radius-md', px: '8px' },
  { name: '--radius-lg', px: '12px' },
  { name: '--radius-xl', px: '16px' },
  { name: '--radius-pill', px: '999px' },
  { name: '--radius-circle', px: '50%' }
];

const TYPE_STEPS = [
  { name: '--text-2xs', rem: '0.55rem', weight: '--font-regular', weightLabel: 'regular' },
  { name: '--text-xs', rem: '0.75rem', weight: '--font-regular', weightLabel: 'regular' },
  { name: '--text-sm', rem: '0.85rem', weight: '--font-regular', weightLabel: 'regular' },
  { name: '--text-base', rem: '1rem', weight: '--font-regular', weightLabel: 'regular' },
  { name: '--text-md', rem: '1.1rem', weight: '--font-medium', weightLabel: 'medium' },
  { name: '--text-lg', rem: '1.25rem', weight: '--font-medium', weightLabel: 'medium' },
  { name: '--text-xl', rem: '1.5rem', weight: '--font-semibold', weightLabel: 'semibold' },
  { name: '--text-2xl', rem: '2rem', weight: '--font-bold', weightLabel: 'bold' },
  { name: '--text-3xl', rem: '2.5rem', weight: '--font-bold', weightLabel: 'bold' }
];

const SHADOW_STEPS = [
  { name: '--shadow-sm', note: '0 2px 8px · --color-shadow-sm' },
  { name: '--shadow-md', note: '0 4px 16px · --color-shadow' },
  { name: '--shadow-lg', note: '0 16px 48px · --color-shadow-lg' }
];

const COLS = {
  map: ['역할', '토큰', 'Dark', 'Light'],
  token: ['토큰', '값', '쓸 곳'],
  band: ['구간', '범위', '기준']
};

export const BANDS = [
  { id: 'mobile', label: 'Mobile', range: '≤ 768px', max: 768 },
  { id: 'tablet', label: 'iPad', range: '769 – 1024px', max: 1024 },
  { id: 'desktop', label: 'Desktop', range: '≥ 1025px', max: Infinity }
];

const RESPONSIVE_MATRIX = [
  {
    name: 'App shell',
    files: 'src/App.css',
    points: '768px',
    mobile: [
      '헤더가 한 줄이라 .app-main padding-top 80px',
      '.main-wrapper height calc(var(--app-height) - 80px)',
      '전체 최저 360×768. 뷰포트가 더 작으면 페이지 스크롤'
    ],
    tablet: ['셸 높이는 --app-height. 주크박스 정보 패널은 768px이 아니라 1024px부터 접는다'],
    desktop: [
      '.app-main padding-top 80px',
      '.main-wrapper height calc(var(--app-height) - 80px)',
      '전체 최저 --app-min-width 360px · --app-min-height 768px',
      '--app-height 는 max(100dvh, 768px)'
    ]
  },
  {
    name: 'PageHeader',
    files: 'src/widgets/PageHeader/PageHeader.js · PageHeader.css',
    points: '1024 · 768px (높이·너비)',
    mobile: [
      '세로 스택, width 100% · radius none · 배경 --color-bg',
      '로고 좌측 · 햄버거 우측. 데스크톱 우측 그룹 숨김',
      '우측 드로어 min(72vw, 300px)'
    ],
    tablet: [
      '너비 769–1024px이고 높이 769px 이상이면 데스크톱 한 줄',
      '≤1024px에서 「새 노트 추가」 라벨 숨김',
      '높이 ≤768px이면 너비와 무관하게 햄버거·드로어'
    ],
    desktop: [
      'fixed · max-width 1200px · width calc(100% - --space-12)',
      '하단 모서리 48px. radius 토큰이 아니라 리터럴',
      '로고 | 뷰어 토글 · 테마 · Login/Logout · 새 노트 추가'
    ]
  },
  {
    name: 'FilterSubMenu',
    files: 'src/components/FilterSubMenu/FilterSubMenu.js · FilterSubMenu.css',
    points: '1024 · 768 · 480px',
    mobile: [
      '모바일 헤더 바로 아래',
      '칩은 FilterChip 모바일 레이아웃, 정렬 select 숨김',
      '캐러셀 스크롤 시 자동 접힘'
    ],
    tablet: [
      '너비 769–1024px·높이 769px 이상은 데스크톱과 같고 칩이 넘치면 수평 스크롤',
      '높이 ≤768px이면 필터를 햄버거 헤더 바로 아래로 내린다'
    ],
    desktop: [
      '#sub-menu.gallery-filter: fixed top --space-4 · 가로 중앙',
      '탭 가로 나열 · FilterChip PC',
      '정렬 드롭다운 표시'
    ]
  },
  {
    name: 'Jukebox',
    files: 'src/pages/Notes/Jukebox.js · Jukebox.css',
    points: '1024 · 768 · 480px',
    mobile: [
      'padding-top 80px. 포커스 정보 min-height를 먼저 잡고 갤러리는 남는 높이',
      '메모 숨김. 펼쳐 보기는 2열 + 카드 클릭 시 .grid-focus-info',
      '≤480px에서 padding-top 70px'
    ],
    tablet: [
      '너비 769–1024px이면 갤러리·정보 패널을 세로로 쌓고 메모를 숨긴다',
      '펼쳐 보기는 2열 + .grid-focus-info는 카드 클릭 시 표시'
    ],
    desktop: [
      'Cover Flow. 바닥 반사는 다크만',
      '포커스 정보: 제목 1줄 · 도구모음 · 메모 3줄',
      '펼쳐 보기: 태그별 한 줄. 호버 시 .grid-note-tooltip. 하단 정보 패널 숨김'
    ]
  },
  {
    name: 'NoteImageViewer',
    files: 'src/components/NoteImageViewer/NoteImageViewer.js · NoteImageViewer.css',
    points: '768 · 640px',
    mobile: ['이미지 좌우 52px', '하단 시트 + 우측 액션 열', '≤640px에서 zoom stage gap 12 → 8px'],
    tablet: ['데스크톱과 동일'],
    desktop: ['이미지 padding 8px 8px 72px', '하단 시트 · 우측 액션 열']
  },
  {
    name: 'PdfModal',
    files: 'src/components/PdfModal/PdfModal.js · PdfModal.css',
    points: '768 · 640px',
    mobile: ['줌 컨트롤 숨김', '≤640px 캔버스 좌우 52px · 툴바 버튼 28px'],
    tablet: ['데스크톱과 동일'],
    desktop: ['모달 min(1400px, 98vw)', '우하단 줌 32px, 하단 중앙 페이지 인디케이터']
  },
  {
    name: 'AddNote',
    files: 'src/components/AddNoteFab/AddNoteFab.js · AddNoteFab.css',
    points: '640px',
    mobile: ['패널 padding --space-4', '커버·입력·푸터 1열'],
    tablet: ['데스크톱과 동일'],
    desktop: ['패널 min(600px, 100%)', '3스텝: 표지 → 사용 정보 → 메모']
  },
  {
    name: 'AddBookmark',
    files: 'src/components/AddBookmarkNoteModal · BookmarkNotePicker',
    points: '640px',
    mobile: ['표지 미리보기 2열 축소', '저장 위치 목록 1열'],
    tablet: ['데스크톱과 동일'],
    desktop: ['이름 · 표지 · 메모 100자', '기본권과 만든 노트 중 저장 위치']
  },
  {
    name: 'AddPage',
    files: 'src/components/AddPageModal',
    points: '640px',
    mobile: ['소스 카드·푸터 1열'],
    tablet: ['데스크톱과 동일'],
    desktop: ['소스 선택 Confirm 레이아웃', 'PDF·이미지 공통 폼']
  },
  {
    name: 'Story',
    files: 'src/pages/Story/Story.js · Story.css',
    points: '1024 · 768px',
    mobile: ['본문 padding 1.5rem 1rem 2.5rem'],
    tablet: ['≤1024px 단일 열 문서형'],
    desktop: ['헤더 숨긴 풀스크린 책. 좌 이미지 / 우 텍스트']
  },
  {
    name: 'Button',
    files: 'src/components/Button/Button.js · Button.css',
    points: '768px',
    mobile: ['back 44×44px + safe-area', 'nav·toolbar 크기는 데스크톱과 같음'],
    tablet: ['데스크톱과 동일'],
    desktop: ['back 48×48px', 'toolbar 32×32 · 아이콘 16px']
  },
  {
    name: 'FilterChip',
    files: 'src/components/FilterChip/FilterChip.css',
    points: '768px',
    mobile: ['세로 스택 · --radius-md · padding --space-3 --space-2', '선택 라벨 --color-text semibold'],
    tablet: ['데스크톱과 동일 (가로 pill)'],
    desktop: ['가로 pill · --radius-pill · padding 6px --space-3', '선택 라벨 --color-text semibold']
  },
  {
    name: 'DropdownChip · DropdownMenu',
    files: 'src/components/DropdownChip · DropdownMenu',
    points: '없음',
    mobile: ['모든 폭에서 동일'],
    tablet: ['모든 폭에서 동일'],
    desktop: ['칩 pill · 메뉴 padding --space-1 · radius 13px(토큰 없음)']
  },
  {
    name: 'ThemeSwitch · ViewerSwitch · Toast',
    files: 'ThemeSwitch.css · ViewerSwitch.css · Toast.css',
    points: '없음',
    mobile: ['스위치는 드로어 안. 토스트는 모든 폭에서 동일'],
    tablet: ['모든 폭에서 동일'],
    desktop: ['스위치 64×32. 토스트 bottom --space-12 · --radius-pill']
  }
];

function renderBandColumn(entry, band) {
  const items = entry[band.id] || [];
  return `
    <div class="ui-lab__bp-col" data-band="${band.id}">
      <p class="ui-lab__bp-col-title">${band.label}<span>${band.range}</span></p>
      <ul class="ui-lab__bp-items">${items.map((line) => `<li>${line}</li>`).join('')}</ul>
    </div>`;
}

function renderResponsiveMatrix() {
  return RESPONSIVE_MATRIX.map(
    (entry) => `
    <article class="ui-lab__bp">
      <header class="ui-lab__bp-head">
        <h3 class="ui-lab__bp-name">${entry.name}</h3>
        <p class="ui-lab__bp-points">브레이크포인트 ${entry.points}</p>
        <p class="ui-lab__files"><code>${entry.files}</code></p>
      </header>
      <div class="ui-lab__bp-cols">
        ${BANDS.map((band) => renderBandColumn(entry, band)).join('')}
      </div>
    </article>`
  ).join('');
}

function colorPage() {
  return renderLabPage({
    group: 'Foundation',
    title: 'Color',
    lede: 'Atomic은 테마와 무관한 원시 스케일이고, Semantic은 역할 이름입니다. 컴포넌트는 Semantic만 쓰고, 새 색은 Atomic을 늘린 뒤 Semantic에 연결합니다.',
    files: '<code>src/styles/colors.css</code>',
    demo: `
      ${ATOMIC_RAMPS.map(renderRamp).join('')}
      ${renderSwatchGroup({
        title: '그 밖의 Atomic',
        names: ['--white', '--black', '--teal-400', '--teal-500']
      })}
      ${SEMANTIC_GROUPS.map(renderSwatchGroup).join('')}
    `,
    tables: [
      {
        title: 'Atomic 단계',
        columns: COLS.token,
        rows: [
          ['--grey-light-1…3 / --grey-dark-1…3', '배경에 가까운 단계', '페이지·면의 가장 낮은 층'],
          ['4…6', '서피스', '패널·인접 면'],
          ['7…9', '라인·구분', '보더·비활성'],
          ['10…12', '텍스트', '12가 본문'],
          ['--primary-1…6', '노랑. 1 밝음 → 6 어두움', '브랜드'],
          ['--red-1…6', '빨강. 1 밝음 → 6 어두움', '오류'],
          ['--teal-400 / --teal-500', '#2ec4b6 / #1a9e92', '완료 상태. grey·primary에 없는 색'],
          ['--white / --black', '#ffffff / #000000', '극단값']
        ]
      },
      {
        title: 'Semantic → Atomic',
        columns: COLS.map,
        rows: [
          ['배경', '--color-bg', '--grey-dark-5', '--grey-light-4'],
          ['인접 배경', '--color-bg-alt', '--grey-dark-6', '--grey-light-5'],
          ['본문', '--color-text', '--grey-dark-12', '--grey-light-12'],
          ['보조 글자', '--color-text-muted', '--grey-dark-11', '--grey-light-11'],
          ['약한 글자', '--color-text-dim', '--grey-dark-10', '--grey-light-10'],
          ['브랜드', '--color-primary', '--primary-2', '--primary-4'],
          ['브랜드 hover 면', '--color-primary-hover', '--grey-dark-9', '--grey-light-12'],
          ['브랜드 위 글자', '--color-primary-on', '--grey-dark-3', '--grey-dark-3'],
          ['완료', '--color-status-done', '--teal-400', '--teal-500'],
          ['완료 위 글자', '--color-status-done-on', '--white', '--white'],
          ['보더', '--color-border', '--grey-dark-8', '--grey-light-8'],
          ['오류 글자', '--color-error-text', '--red-3', '--red-5'],
          ['밝은 면 위 글자', '--color-on-light', '--grey-light-12', '--grey-light-12'],
          ['밝은 면 위 배경', '--color-on-light-bg', 'rgba(255,255,255,0.95)', '--grey-light-1'],
          ['크롬 위 글자', '--color-chrome-on', '--white', '--white']
        ]
      }
    ],
    notes: [
      '이미지·모달 위에 겹치는 역할은 단색 Atomic이 아닙니다. <code>--color-surface-hover</code> · <code>active</code> · <code>selected</code>, <code>--color-overlay*</code>, <code>--color-chrome*</code>, <code>--color-glass*</code>, <code>--color-shadow*</code>, <code>--color-error</code> · <code>--color-error-bg</code>는 알파 합성입니다.',
      '다크 surface는 흰 8% / 15% / 20%. 라이트 surface는 rgb(28,36,44)의 6% / 10% / 14%입니다.',
      '<code>--color-chrome</code> · <code>--color-chrome-strong</code> · <code>--color-chrome-on</code>은 테마가 바뀌어도 어두운 크롬을 유지합니다. 토스트, 뷰어 화살표, toolbar 버튼이 이 층을 씁니다.',
      '책 그림자(<code>--color-book-shadow</code>)와 주크박스 바닥 반사(<code>--color-reflect*</code>)는 테마 무관 예외입니다. 라이트 반사는 투명 그라데이션으로 끕니다.',
      '컴포넌트 CSS에 <code>--grey-*</code> · <code>--primary-*</code>를 직접 쓰는 곳은 ThemeSwitch뿐입니다. 나머지는 Semantic을 씁니다.'
    ]
  });
}

function spacePage() {
  return renderLabPage({
    group: 'Foundation',
    title: 'Space',
    lede: '4px 그리드입니다. rem이라 루트 글자 크기를 바꾸면 여백이 함께 줄어듭니다. 막대 너비가 토큰 크기입니다.',
    files: '<code>src/styles/sizes.css</code>',
    demo: `<div class="ui-lab__token-list">${renderTokenSpecimens(SPACE_STEPS, 'space')}</div>`,
    tables: [
      {
        title: '간격 스케일',
        columns: ['토큰', 'rem', 'px', '대표 사용'],
        rows: [
          ['--space-1', '0.25rem', '4px', '칩 내용 gap, 메뉴 padding, 스위치 inset'],
          ['--space-2', '0.5rem', '8px', '드롭다운 칩 gap, 폼 필드 사이'],
          ['--space-3', '0.75rem', '12px', '칩 inline padding, 다이얼로그 액션 gap, 토스트 세로 padding'],
          ['--space-4', '1rem', '16px', '패널 gap, solid 버튼 가로 padding, 필터 top'],
          ['--space-5', '1.25rem', '20px', '다이얼로그 바깥 padding, FAB inset, circle 기본 아이콘'],
          ['--space-6', '1.5rem', '24px', '다이얼로그 패널 padding, 드롭다운 칩 아이콘 박스'],
          ['--space-8', '2rem', '32px', 'circle S · toolbar · 스위치 높이'],
          ['--space-10', '2.5rem', '40px', '스케일에만 있음. 버튼 크기로 쓰지 않음'],
          ['--space-12', '3rem', '48px', 'circle M, 토스트 bottom, 정보 패널 데스크톱 margin'],
          ['--space-16', '4rem', '64px', '페이지 하단 여백. 헤더 80px와는 다름']
        ]
      }
    ],
    notes: [
      '토큰에 없는 간격이 컴포넌트에 남아 있습니다. FilterChip PC 세로 padding 6px(0.375rem), DropdownChip padding의 1px, DropdownMenu 항목 세로 7px, 메뉴 offset 10px, 헤더 높이 80px, 헤더 하단 둥글기 48px(숫자는 --space-12와 같지만 radius로 쓴 리터럴)입니다.',
      'circle L은 3.25rem(52px)이라 --space-12(48px)와 --space-16(64px) 사이입니다.',
      '앱 최저 크기는 <code>--app-min-width: 22.5rem</code>(360px), <code>--app-min-height: 48rem</code>(768px)입니다.'
    ]
  });
}

function radiusPage() {
  return renderLabPage({
    group: 'Foundation',
    title: 'Radius',
    lede: '둥글기는 px를 유지합니다. 글자 크기와 같이 줄이면 모서리가 어색해지기 때문입니다.',
    files: '<code>src/styles/sizes.css</code>',
    demo: `<div class="ui-lab__token-list">${renderTokenSpecimens(RADIUS_STEPS, 'radius')}</div>`,
    tables: [
      {
        title: '둥글기 스케일',
        columns: ['토큰', '값', '대표 사용'],
        rows: [
          ['--radius-none', '0', '모바일 헤더, 전체 화면 뷰어'],
          ['--radius-sm', '4px', 'text 버튼, 뷰어 페이지 자리'],
          ['--radius-md', '8px', 'solid 버튼, 입력, 다이얼로그 아닌 카드, 모바일 FilterChip'],
          ['--radius-lg', '12px', '다이얼로그 패널, 데모 스테이지, 뷰어 액션 열'],
          ['--radius-xl', '16px', '스케일. 현재 주요 컴포넌트는 lg를 더 많이 씀'],
          ['--radius-pill', '999px', 'FilterChip PC, DropdownChip, 토스트, 스위치, 뷰 모드 탭'],
          ['--radius-circle', '50%', 'Button circle, 스위치 썸']
        ]
      }
    ],
    notes: [
      'DropdownMenu 패널과 항목 radius는 13px 리터럴입니다. 가장 가까운 토큰은 <code>--radius-lg</code>(12px)지만 코드는 1px 더 큽니다. Figma에서 12로 맞추면 구현과 달라집니다.',
      'PageHeader 하단 모서리는 48px 리터럴입니다. radius 토큰이 아닙니다.'
    ]
  });
}

function typePage() {
  return renderLabPage({
    group: 'Foundation',
    title: 'Type',
    lede: '산세리프는 Pretendard, 코드는 mono입니다. 2xs는 마이크로 라벨(칩 개수, 푸터)에만 쓰고 본문은 xs 이상입니다.',
    files: '<code>src/styles/sizes.css</code>',
    demo: `
      <p class="ui-lab__section-desc" style="font-family: var(--font-sans)">Sans — Pretendard Variable</p>
      <p class="ui-lab__section-desc" style="font-family: var(--font-mono)">Mono — ui-monospace</p>
      <div class="ui-lab__token-list">${renderTokenSpecimens(TYPE_STEPS, 'type')}</div>
    `,
    tables: [
      {
        title: '크기',
        columns: ['토큰', 'rem', '대략 px', '대표 사용'],
        rows: [
          ['--text-2xs', '0.55rem', '약 9px', 'FilterChip PC 개수, Lab 토큰 값'],
          ['--text-xs', '0.75rem', '12px', 'FilterChip PC 라벨, 정보 메모, Dropdown 글자(12px 리터럴과 같음)'],
          ['--text-sm', '0.85rem', '약 14px', 'text 버튼, 토스트, 폼 라벨, 뷰어 진행 글자'],
          ['--text-base', '1rem', '16px', 'solid 버튼, 본문 입력, 다이얼로그 본문'],
          ['--text-md', '1.1rem', '약 18px', '섹션 제목'],
          ['--text-lg', '1.25rem', '20px', '그리드 툴팁 제목'],
          ['--text-xl', '1.5rem', '24px', '다이얼로그 제목, 노트 제목'],
          ['--text-2xl', '2rem', '32px', 'Lab 타이틀 상한'],
          ['--text-3xl', '2.5rem', '40px', 'PDF 폴백 제목']
        ]
      },
      {
        title: '굵기',
        columns: ['토큰', '값', '대표 사용'],
        rows: [
          ['--font-thin', '100', 'FilterChip 기본 라벨'],
          ['--font-regular', '400', '본문, Dropdown 기본, 선택 칩 개수'],
          ['--font-medium', '500', '뷰 모드 탭, 토스트, text block 버튼, 스위치'],
          ['--font-semibold', '600', '선택 칩 라벨, solid 버튼, 노트 제목, 열린 드롭다운'],
          ['--font-bold', '700', '다이얼로그 제목, 활성 뷰 모드 탭']
        ]
      }
    ],
    notes: [
      'FilterChip 모바일 라벨은 0.875rem(14px), 개수는 0.625rem(10px) 리터럴입니다. <code>--text-sm</code>(0.85rem) · <code>--text-xs</code>(0.75rem)와 같지 않습니다.',
      '노트 제목 letter-spacing은 -2px, 다이얼로그 제목은 -0.02em입니다. 타입 토큰에는 자간이 없습니다.',
      '정보 메모 line-height 1.5, 노트 제목 1.2, 다이얼로그 제목 1.25. 라인하이트 토큰은 없습니다.'
    ]
  });
}

function shadowPage() {
  return renderLabPage({
    group: 'Foundation',
    title: 'Shadow',
    lede: 'offset과 blur는 px이고, 색은 Color의 --color-shadow*를 다시 씁니다. 테마가 바뀌면 그림자 색만 바뀝니다.',
    files: '<code>src/styles/sizes.css</code> · <code>src/styles/colors.css</code>',
    demo: `<div class="ui-lab__token-list">${renderTokenSpecimens(SHADOW_STEPS, 'shadow')}</div>`,
    tables: [
      {
        title: '그림자',
        columns: ['토큰', '형태', '색', '대표 사용'],
        rows: [
          ['--shadow-sm', '0 2px 8px', '--color-shadow-sm', 'PDF 폴백 카드'],
          ['--shadow-md', '0 4px 16px', '--color-shadow', 'FAB, 토스트, 그리드 툴팁'],
          ['--shadow-lg', '0 16px 48px', '--color-shadow-lg', 'Dialog 패널'],
          ['--color-drop-shadow', 'drop-shadow 필터', '다크 0 10px 24px / 라이트 0 3px 8px', '뷰어 페이지 이미지']
        ]
      }
    ],
    notes: [
      '다크 그림자 알파: sm 0.12 · md 0.2 · lg 0.28 (검정). 라이트: sm 0.04 · md 0.08 · lg 0.12 (rgb 20,28,36).',
      '스위치 트랙에는 box-shadow를 두지 않습니다.',
      'Story 책 그림자는 <code>--color-book-shadow</code>로 따로 둡니다. 이 스케일에 넣지 않습니다.'
    ]
  });
}

function iconPage() {
  return renderLabPage({
    group: 'Foundation',
    title: 'Icon',
    lede: '버튼과 툴바 아이콘은 MingCute 세트만 씁니다. fill은 currentColor라 버튼 글자색을 따릅니다.',
    files: '<code>src/assets/mingcuteIcons.js</code> · <code>scripts/generate-mingcute-icons.mjs</code>',
    demo: `<div class="ui-lab__icon-grid">${renderIconGrid()}</div>`,
    tables: [
      {
        title: '크기 · 색',
        columns: ['자리', '크기', 'Foundation', '색'],
        rows: [
          ['circle 기본', '1.25rem', '--space-5', 'currentColor'],
          ['toolbar · icon', '16px', '--space-4', 'currentColor'],
          ['FAB', '1.35rem', '토큰 없음', '--color-primary-on'],
          ['스위치', '1rem', '--text-base와 같은 길이', '비활성 grey, 활성 primary 단계'],
          ['DropdownChip 화살표 박스', '24px', '--space-6', '칩 글자색'],
          ['화살표 벡터', '8.19 × 10.01px', '토큰 없음', 'currentColor']
        ]
      }
    ],
    notes: [
      '컴포넌트 파일에 SVG 문자열을 적지 않습니다. 없는 아이콘은 <code>scripts/generate-mingcute-icons.mjs</code>의 ICONS에 넣고 <code>npm run icons</code>로 생성합니다.',
      'navNext는 같은 left 아이콘을 CSS로 좌우 반전합니다.',
      '즐겨찾기 모바일 off는 star-line, on은 star-fill. 북마크도 line / fill로 나눕니다.',
      '정확한 MingCute 이름이 없으면 가장 가까운 기존 아이콘을 임시로 쓰고 주석에 임시라고 남깁니다.'
    ]
  });
}

function breakpointPage() {
  return renderLabPage({
    group: 'Foundation',
    title: 'Breakpoint',
    lede: '구간은 CSS가 실제로 쓰는 값입니다. 현재 창에 해당하는 열이 강조됩니다. iPad 전용 규칙은 FilterSubMenu · Jukebox · Story이고, 나머지는 데스크톱 레이아웃을 그대로 씁니다.',
    files: '<code>src/styles/sizes.css</code>의 --app-min-width · --app-min-height',
    demo: `<div class="ui-lab__bp-list">${renderResponsiveMatrix()}</div>`,
    tables: [
      {
        title: '구간',
        columns: COLS.band,
        rows: [
          ['Mobile', '≤ 768px', 'max-width: 768px'],
          ['iPad', '769 – 1024px', '그 사이. 높이 ≤768px이면 모바일 헤더로 떨어짐'],
          ['Desktop', '≥ 1025px', '기본'],
          ['하위', '640 · 600 · 480px', '모바일 안 추가 단계. 앱 최저 너비는 360px']
        ]
      }
    ],
    notes: [
      '위의 구간 열이 컴포넌트별 상세입니다. 표 한 칸에 넣으면 문장이 잘리므로 메모 대신 열로 남겨 두었습니다.',
      '높이 ≤768px는 너비가 데스크톱이어도 PageHeader를 햄버거로 바꿉니다.',
      '80px 헤더 높이와 70px(≤480 주크박스 padding)은 space 토큰이 아닙니다.'
    ]
  });
}

const PAGES = {
  color: colorPage,
  space: spacePage,
  radius: radiusPage,
  type: typePage,
  shadow: shadowPage,
  icon: iconPage,
  breakpoint: breakpointPage
};

/**
 * @param {string} id
 * @returns {string}
 */
export function renderFoundationPage(id) {
  const render = PAGES[id];
  return render ? render() : '';
}
