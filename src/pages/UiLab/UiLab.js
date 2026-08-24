/**
 * UI Component Lab
 * 네비게이션에 노출하지 않는 내부 컴포넌트 리뷰 페이지 (/ui-lab)
 */

import { render as renderButton, renderIconButton } from '../../components/Button/Button.js';
import { render as renderThemeSwitch, bind as bindThemeSwitches } from '../../components/ThemeSwitch/ThemeSwitch.js';
import { render as renderChip } from '../../components/FilterChip/FilterChip.js';
import { render as renderDropdownChip } from '../../components/DropdownChip/DropdownChip.js';
import {
  bind as bindDropdown,
  render as renderDropdown,
  renderItem as renderDropdownMenuItem,
  renderPanel as renderDropdownMenu
} from '../../components/DropdownMenu/DropdownMenu.js';
import { renderViewerChrome } from '../../components/NoteImageViewer/ViewerChrome.js';
import { renderNoteImageViewer } from '../../components/NoteImageViewer/NoteImageViewer.js';
import { showToast } from '../../components/Toast/Toast.js';
import { openUploadResultDialog } from '../../components/Dialog/uploadResultDialog.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import { render as renderNoteInfoPanel, renderNoteIndicator } from '../../components/NoteInfoPanel/NoteInfoPanel.js';
import {
  DEMO_NOTE_ID,
  demoNoteViewerOptions,
  isLocalDemoEnabled
} from '../../utils/demoNote.js';
import '../../components/NoteInfoPanel/NoteInfoPanel.css';
import '../../components/NoteImageViewer/NoteImageViewer.css';
import './UiLab.css';

const STEPS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const STEPS_6 = [1, 2, 3, 4, 5, 6];

const ATOMIC_RAMPS = [
  {
    title: 'Grey · Light 전용',
    desc: '라이트 테마가 쓰는 12단계. 1이 가장 밝고 12가 본문 텍스트다.',
    names: STEPS_12.map((n) => `--grey-light-${n}`),
    labels: STEPS_12
  },
  {
    title: 'Grey · Dark 전용',
    desc: '다크 테마가 쓰는 12단계. 1이 가장 어둡고 12가 본문 텍스트다.',
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
    names: ['--color-primary', '--color-primary-hover', '--color-primary-on']
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

/* 뷰포트 구간 — 프로젝트 CSS가 실제로 쓰는 값 기준 */
const BANDS = [
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
      '.main-wrapper height calc(100vh - 80px)'
    ],
    tablet: ['데스크톱과 동일 (768px 규칙만 존재)'],
    desktop: ['.app-main padding-top 80px', '.main-wrapper height calc(100vh - 80px)']
  },
  {
    name: 'PageHeader',
    files: 'src/widgets/PageHeader/PageHeader.js · PageHeader.css',
    points: '1024 · 768px (높이·너비)',
    mobile: [
      '세로 스택, width 100% · 라운드 0 · 배경 #2c333f (라이트 #eceff3)',
      '로고 좌측 · 햄버거 2.5rem 우측(page-header__top 양끝), 데스크톱 우측 그룹 숨김',
      '우측 드로어 min(72vw, 300px): Notes 하위(Timeline·By type·Favorite), Intro, Logout 아래 테마 토글',
      '높이 ≤768px에서도 동일(햄버거 + 우측 드로어)'
    ],
    tablet: [
      '너비가 769–1024px이고 높이가 769px 이상이면 데스크톱 한 줄 레이아웃 유지',
      '≤1024px에서 「새 노트 추가」 라벨 숨김 · 44px + 아이콘만',
      '높이 ≤768px이면 너비와 무관하게 모바일과 같은 햄버거·우측 드로어'
    ],
    desktop: [
      'fixed · max-width 1200px · width calc(100% - 3rem) · padding 1rem 2rem',
      '하단 모서리 48px 라운드',
      '로고 | 테마·Login/Logout·(새 노트 추가, 로그인 시)',
      '새 노트 추가 높이 44px · 라벨 1줄',
      '우측 부모 열이 라벨 폭보다 좁으면(컨테이너) + 아이콘만',
      '햄버거·드로어 display none'
    ]
  },
  {
    name: 'FilterSubMenu',
    files: 'src/components/FilterSubMenu/FilterSubMenu.js · FilterSubMenu.css',
    points: '1024 · 768 · 480px',
    mobile: [
      '갤러리 레이어를 모바일 헤더(로고·햄버거) 바로 아래에 둔다',
      'top: padding-top + 44px + padding-bottom. 폭은 데스크톱과 같이 min(96vw, 920px)',
      '칩은 FilterChip 모바일 레이아웃, 정렬 select 숨김',
      '캐러셀 스크롤 시 자동 접힘(max-height 0 · opacity 0)'
    ],
    tablet: [
      '너비 769–1024px·높이 769px 이상은 데스크톱과 같고 칩이 넘치면 수평 스크롤',
      '칩 모양은 FilterChip PC(가로 pill)를 그대로 씀',
      '높이 ≤768px이면 필터를 햄버거 헤더 바로 아래로 내린다'
    ],
    desktop: [
      '#sub-menu.gallery-filter: fixed top 16px · left 50% · translateX(-50%)',
      '탭 가로 나열 · FilterChip PC 레이아웃',
      '정렬 select 표시, 접기 토글 숨김'
    ]
  },
  {
    name: 'Jukebox',
    files: 'src/pages/Notes/Jukebox.js · Jukebox.css',
    points: '1024 · 768 · 480px',
    mobile: [
      'padding-top 80px, 갤러리 padding 16vh 0 20vh',
      '카드 min(33.6vh, 256px) · 이미지 min(44.8vw, 176px) · 스케일 ×0.88',
      '바닥 반사 off, 포커스 정보(노트명 + 도구모음, 메모 숨김). 갤러리 min 18rem×16rem, info min 높이 제목+도구모음 · 너비 15.5rem, 겹치지 않음',
      '중앙 카드 탭 → 뷰어 모달 (데스크톱과 동일)',
      '≤480px에서 padding-top 70px, 카드 소폭 확대'
    ],
    tablet: [
      '.notes-container padding-top 90px',
      '필터 칩 수평 스크롤 · FilterChip PC 레이아웃 유지'
    ],
    desktop: [
      '갤러리 padding 40vh 0 · perspective 60em · scroll-snap x mandatory',
      '카드 max-height 38vh · 이미지 max-width 28vw · 바닥 반사 on',
      '데스크톱 포커스 정보 블록 표시(높이 139px · 노트명 · Icon Button 5 · 메모)',
      '네비 버튼 fixed 좌우 1rem, 중앙 카드 클릭 시 뷰어 모달'
    ]
  },
  {
    name: 'NoteImageViewer',
    files: 'src/components/NoteImageViewer/NoteImageViewer.js · NoteImageViewer.css',
    points: '768 · 640px',
    mobile: [
      '이미지 컨테이너 좌우 52px 여백 — 네비 버튼과 겹침 회피',
      '하단 시트 min(380px, 100% - 1.25rem) · 시트 버튼 2.15rem',
      '≤640px에서 zoom stage gap 12 → 8px'
    ],
    tablet: ['데스크톱과 동일'],
    desktop: [
      '이미지 컨테이너 padding 8px 8px 72px',
      '하단 시트 min(420px, 100% - 1.5rem) · 시트 버튼 2.35rem · 처음/마지막 1.85rem',
      'spread FAB 2.2rem'
    ]
  },
  {
    name: 'PdfModal',
    files: 'src/components/PdfModal/PdfModal.js · PdfModal.css',
    points: '768 · 640px',
    mobile: [
      '줌 컨트롤 display none — 핀치 줌으로 대체',
      '≤640px 캔버스 좌우 52px · min-height 50vh · 툴바 버튼 28px'
    ],
    tablet: ['데스크톱과 동일'],
    desktop: [
      '모달 min(1400px, 98vw) · max-height 95vh',
      '캔버스 min-height 70vh · padding 8px',
      '우하단 줌 컨트롤 32px, 하단 중앙 페이지 인디케이터'
    ]
  },
  {
    name: 'AddNoteFab',
    files: 'src/components/AddNoteFab/AddNoteFab.js · AddNoteFab.css',
    points: '640px (주크박스 한정 768px)',
    mobile: [
      '≤640px 패널 padding 1rem',
      '커버·입력 행 그리드가 모두 1열로 스택'
    ],
    tablet: ['데스크톱과 동일'],
    desktop: [
      '패널 min(600px, 100%) · max-height min(92vh, 920px)',
      '커버 2열, 입력 행 2~3열 그리드'
    ]
  },
  {
    name: 'AddPageModal · PageMetaModal',
    files: 'src/components/AddPageModal/AddPageModal.js · PageMetaModal.js · AddPageModal.css',
    points: '640px',
    mobile: ['≤640px 소스 선택·푸터·확인 액션이 모두 1열 세로 스택'],
    tablet: ['데스크톱과 동일'],
    desktop: [
      '패널 min(560px, 100%)',
      '소스 선택 2열 · 푸터 1fr 1.4fr · 액션 2열',
      '미리보기 auto-fill minmax(110px, 1fr)'
    ]
  },
  {
    name: 'Story',
    files: 'src/pages/Story/Story.js · Story.css',
    points: '1024 · 768px',
    mobile: ['본문 padding 1.5rem 1rem 2.5rem', '제목 1.6rem · 부제 1rem · 본문 1rem'],
    tablet: [
      '≤1024px에서 책 레이아웃 → 단일 열 문서형으로 전환',
      '테두리·종이 장식·슬라이드인 제거, width 100% · height auto',
      '이미지 aspect-ratio 16/10, 본문이 그 아래로 스택되고 페이지 스크롤 허용',
      '제목 2rem · 배경 var(--app-bg)'
    ],
    desktop: [
      'PageHeader 숨긴 풀스크린 책 — margin 24px 64px 240px · height 80% · 8px 테두리',
      '좌우 50px 종이 장식, 본문 좌 50% 이미지 / 우 50% 텍스트',
      'translateY(100vh) → 0 슬라이드인'
    ]
  },
  {
    name: 'Button',
    files: 'src/components/Button/Button.js · Button.css',
    points: '768px',
    mobile: [
      'back 44×44px + safe-area 오프셋 · 아이콘 22px',
      'nav·toolbar는 동일하지만 PdfModal ≤640px에서 nav padding 10/12px, toolbar 28px로 축소'
    ],
    tablet: ['데스크톱과 동일'],
    desktop: ['back 48×48px fixed · 아이콘 24px', 'nav padding 12px 원형', 'toolbar 32×32px · 아이콘 16px']
  },
  {
    name: 'FilterChip',
    files: 'src/components/FilterChip/FilterChip.js · FilterChip.css',
    points: '768px',
    mobile: [
      '세로 스택 · radius 8px · padding 12px 8px',
      '라벨 14px thin · 개수 10px · 기본 글자 50% 투명',
      '선택 시 라벨 primary semibold · 개수 text regular · 배경 surface-hover'
    ],
    tablet: ['데스크톱과 동일 (가로 pill)'],
    desktop: [
      '가로 pill · radius 999px · padding 6px 12px',
      '라벨 12px muted thin · 개수 ~9px 50% 투명',
      'hover/selected 배경 surface-hover, 선택은 라벨 primary'
    ]
  },
  {
    name: 'DropdownChip',
    files: 'src/components/DropdownChip/DropdownChip.js · DropdownChip.css',
    points: '없음',
    mobile: ['모든 폭에서 동일 (라벨 폭에 맞춘 pill)'],
    tablet: ['모든 폭에서 동일'],
    desktop: [
      '가로 pill · min-width 120px · padding 1px 4px 1px 12px · gap 8px · 아이콘 24px',
      'default/selected는 0.5px border, hover는 surface-hover, 열림은 surface-active',
      '열림·선택은 라벨 primary semibold'
    ]
  },
  {
    name: 'DropdownMenu',
    files: 'src/components/DropdownMenu/DropdownMenu.js · DropdownMenu.css',
    points: '없음',
    mobile: ['모든 폭에서 동일 (auto 패널 · 26px 항목)'],
    tablet: ['모든 폭에서 동일'],
    desktop: [
      '패널 fit-content · min-width 120px · padding/gap 4px · radius 13px · 0.5px border · --color-bg',
      '항목 width 100% · padding 7px 8px · radius 13px · hover만 surface-hover',
      '칩 아래 10px · 좌측 정렬 · 선택 시 칩 라벨 갱신 후 닫힘'
    ]
  },
  {
    name: 'ThemeSwitch',
    files: 'src/components/ThemeSwitch/ThemeSwitch.js · ThemeSwitch.css',
    points: '없음',
    mobile: ['모든 폭에서 동일 (헤더 대신 드로어)'],
    tablet: ['모든 폭에서 동일'],
    desktop: ['64×32 pill · 썸 24 · 트랙은 모드 bg와 같은 grey · hover는 핸들만']
  },
  {
    name: 'Toast',
    files: 'src/components/Toast/Toast.js · Toast.css',
    points: '없음',
    mobile: ['모든 폭에서 동일'],
    tablet: ['모든 폭에서 동일'],
    desktop: ['fixed bottom 3rem 중앙 · radius 999px · z-index 2000', '브레이크포인트 없이 내용 폭에 맞춰 늘어남']
  }
];

function readCssVar(name) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '—';
  } catch {
    return '—';
  }
}

function currentBandId() {
  const w = window.innerWidth;
  return BANDS.find((band) => w <= band.max)?.id || 'desktop';
}

function renderRamp({ title, desc, names, labels }) {
  const cells = names
    .map(
      (varName, i) => `
      <div class="ui-lab__ramp-cell">
        <div class="ui-lab__ramp-chip" style="background: var(${varName})" title="${varName}"></div>
        <p class="ui-lab__ramp-step">${labels[i]}</p>
        <p class="ui-lab__ramp-value" data-token="${varName}">…</p>
      </div>`
    )
    .join('');

  return `
    <div class="ui-lab__ramp-group">
      <p class="ui-lab__ramp-title">${title}</p>
      <p class="ui-lab__section-desc">${desc}</p>
      <div class="ui-lab__ramp">${cells}</div>
    </div>`;
}

function renderSwatchGroup({ title, names }) {
  const swatches = names
    .map(
      (varName) => `
      <div class="ui-lab__swatch">
        <div class="ui-lab__swatch-chip" style="background: var(${varName})"></div>
        <p class="ui-lab__swatch-name">${varName}</p>
        <p class="ui-lab__swatch-value" data-token="${varName}">…</p>
      </div>`
    )
    .join('');

  return `
    <div class="ui-lab__ramp-group">
      <p class="ui-lab__ramp-title">${title}</p>
      <div class="ui-lab__swatches">${swatches}</div>
    </div>`;
}

/**
 * 버튼에 넣을 수 있는 아이콘 목록. 여기 없는 아이콘이 필요하면 세트에 먼저 추가한다.
 * @returns {string}
 */
function renderIconGrid() {
  return Object.entries(MINGCUTE)
    .map(
      ([name, svg]) => `
      <div class="ui-lab__icon-cell">
        <span class="ui-lab__icon-preview">${svg}</span>
        <p class="ui-lab__icon-name">${name}</p>
      </div>`
    )
    .join('');
}

/**
 * 라벨 + 데모 스테이지 한 줄. flow는 fixed·absolute role을 흐름대로 눕혀 보여준다.
 * @param {string} label
 * @param {string} demoHtml
 * @param {{ flow?: boolean, stageClass?: string }} [options]
 * @returns {string}
 */
function renderVariantRow(label, demoHtml, options = {}) {
  const { flow = true, stageClass = '' } = options;
  const classes = ['ui-lab__demo-stage'];
  if (flow) classes.push('ui-lab__demo-stage--flow');
  if (stageClass) classes.push(stageClass);
  return `
    <div class="ui-lab__variant">
      <p class="ui-lab__variant-label">${label}</p>
      <div class="${classes.join(' ')}">${demoHtml}</div>
    </div>`;
}

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

/**
 * 토큰 값 표시를 현재 계산값으로 채운다. 테마 토글 시 다시 호출한다.
 * @param {HTMLElement} root
 * @returns {void}
 */
function fillTokenValues(root) {
  root.querySelectorAll('[data-token]').forEach((el) => {
    const name = el.getAttribute('data-token');
    el.textContent = readCssVar(name);
  });
}

/**
 * 현재 뷰포트 구간을 표시하고, 해당 열을 강조한다.
 * 라우터에 언마운트 훅이 없어 노드가 사라지면 스스로 리스너를 해제한다.
 * @param {HTMLElement} root
 * @returns {void}
 */
function attachViewportReadout(root) {
  const readout = root.querySelector('[data-lab="viewport"]');
  const update = () => {
    if (!root.isConnected) {
      window.removeEventListener('resize', update);
      return;
    }
    const bandId = currentBandId();
    const band = BANDS.find((b) => b.id === bandId);
    root.setAttribute('data-active-band', bandId);
    if (readout) readout.textContent = `${window.innerWidth}px · ${band.label} (${band.range})`;
  };

  update();
  window.addEventListener('resize', update);
}

/**
 * Lab FilterChip 데모: 같은 그룹에서 하나만 선택.
 * @param {HTMLElement|null} root
 * @returns {void}
 */
function bindLabChips(root) {
  if (!root) return;
  const groups = new Map();
  root.querySelectorAll('.chip[data-lab-chip]').forEach((chip) => {
    const key = chip.getAttribute('data-lab-chip') || 'default';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(chip);
  });
  groups.forEach((chips) => {
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((other) => {
          const on = other === chip;
          other.classList.toggle('is-active', on);
          other.setAttribute('aria-pressed', String(on));
        });
      });
    });
  });
}

/**
 * Lab DropdownChip 데모: 눌러서 열림(active)을 토글.
 * @param {HTMLElement|null} root
 * @returns {void}
 */
function bindLabDropdownChips(root) {
  if (!root) return;
  root.querySelectorAll('.dropdown-chip[data-lab-dropdown]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const open = chip.getAttribute('aria-expanded') !== 'true';
      chip.classList.toggle('is-open', open);
      chip.setAttribute('aria-expanded', String(open));
    });
  });
}

/**
 * Lab DropdownMenu 데모: 묶인 드롭다운 bind + 패널 안 항목 선택.
 * @param {HTMLElement|null} root
 * @returns {void}
 */
function bindLabDropdownMenu(root) {
  if (!root) return;
  root.querySelectorAll('.dropdown').forEach((el) => bindDropdown(el));
  root.querySelectorAll('[data-lab-menu]').forEach((panel) => {
    const items = [...panel.querySelectorAll('.dropdown-menu__item')];
    items.forEach((item) => {
      item.addEventListener('click', () => {
        items.forEach((other) => {
          const on = other === item;
          other.classList.toggle('is-selected', on);
          other.setAttribute('aria-selected', String(on));
        });
      });
    });
  });
}

/**
 * 테마 토글에 맞춰 semantic 토큰 값 표시를 갱신한다.
 * @param {HTMLElement} root
 * @returns {void}
 */
function watchThemeChange(root) {
  const observer = new MutationObserver(() => {
    if (!root.isConnected) {
      observer.disconnect();
      return;
    }
    fillTokenValues(root);
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

/**
 * @returns {void}
 */
export function renderUiLab() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="ui-lab">
      <div class="ui-lab__inner">
        <header class="ui-lab__hero">
          <p class="ui-lab__eyebrow">Internal</p>
          <h1 class="ui-lab__title">UI Component Lab</h1>
          <p class="ui-lab__lede">
            Memory of Records에서 쓰는 UI 조각을 한곳에 모아 리뷰하는 내부 페이지입니다.
            메인 네비게이션에는 두지 않았으며, <code>/ui-lab</code> 링크로만 들어올 수 있습니다.
            파일·역할·토큰의 문장형 설명은 저장소 루트의 <code>Design.md</code>를 참고하세요.
          </p>
          <p class="ui-lab__meta">경로: <code>/ui-lab</code> · 문서: <code>Design.md</code> · 현재 뷰포트: <code data-lab="viewport">…</code></p>
        </header>

        <section class="ui-lab__section" id="tokens-atomic">
          <h2 class="ui-lab__section-title">Atomic tokens</h2>
          <p class="ui-lab__section-desc">
            테마와 무관한 원시 스케일입니다. grey는 라이트·다크가 서로 다른 색을 쓰므로 12단계 스케일을 각각 두었고,
            primary와 red는 6단계를 두 테마가 나눠 씁니다. 모두 <code>:root</code>에 있어 어떤 테마에서도 값을 읽을 수 있습니다.
          </p>
          <p class="ui-lab__section-desc">
            단계는 1–3 배경, 4–6 서피스, 7–9 라인·구분, 10–12 텍스트 순으로 쓰면 됩니다.
          </p>
          <p class="ui-lab__files">참조: <code>src/styles/colors.css</code> (Atomic 섹션)</p>
          ${ATOMIC_RAMPS.map(renderRamp).join('')}
        </section>

        <section class="ui-lab__section" id="tokens-semantic">
          <h2 class="ui-lab__section-title">Semantic tokens</h2>
          <p class="ui-lab__section-desc">
            역할 이름(<code>--color-*</code>)입니다. 테마별로 atomic 중 어느 단계를 쓸지만 고르므로 컴포넌트는 이 층만 쓰면 됩니다.
            헤더의 테마 토글을 누르면 아래 값이 즉시 바뀝니다.
          </p>
          <p class="ui-lab__section-desc">
            단, 이미지·모달 위에 겹쳐 깔리는 역할(<code>surface-hover</code>, <code>overlay</code>, <code>shadow</code>, <code>chrome</code>)은
            합성이 목적이라 단색 대신 알파 값을 그대로 둡니다.
          </p>
          <p class="ui-lab__files">참조: <code>src/styles/colors.css</code>, <code>src/utils/theme.js</code></p>
          ${SEMANTIC_GROUPS.map(renderSwatchGroup).join('')}
        </section>

        <section class="ui-lab__section" id="responsive">
          <h2 class="ui-lab__section-title">Responsive · 해상도별 표시 형식</h2>
          <p class="ui-lab__section-desc">
            서비스 안의 컴포넌트가 뷰포트 폭에 따라 어떻게 보이는지 정리했습니다.
            구간은 실제 CSS가 쓰는 값을 기준으로 Mobile ≤768px, iPad 769–1024px, Desktop ≥1025px로 나눴고,
            현재 창에 해당하는 열을 강조합니다.
          </p>
          <p class="ui-lab__section-desc">
            iPad 구간에 전용 규칙이 있는 것은 <strong>FilterSubMenu · Jukebox · Story</strong> 세 개뿐이고,
            나머지는 데스크톱 레이아웃을 그대로 씁니다. 모바일 안에서는 640 · 600 · 480px 하위 단계가 추가로 쓰입니다.
          </p>
          <div class="ui-lab__bp-list">${renderResponsiveMatrix()}</div>
        </section>

        <section class="ui-lab__section" id="icons">
          <h2 class="ui-lab__section-title">Icons · MingCute</h2>
          <p class="ui-lab__section-desc">
            버튼·툴바에 쓰는 아이콘은 전부 이 세트에서 가져옵니다. 컴포넌트 파일에 SVG를 직접 적지 않고,
            필요한 아이콘이 없으면 <code>mingcuteIcons.js</code>에 먼저 추가한 뒤 이름으로 참조합니다.
            <code>fill</code>은 <code>currentColor</code>라 버튼 색을 그대로 따릅니다.
          </p>
          <p class="ui-lab__files">참조: <code>src/assets/mingcuteIcons.js</code>, <code>.cursor/rules/ui-buttons.mdc</code></p>
          <div class="ui-lab__icon-grid">${renderIconGrid()}</div>
        </section>

        <section class="ui-lab__section" id="button">
          <h2 class="ui-lab__section-title">Button</h2>
          <p class="ui-lab__section-desc">
            공통 버튼 팩토리입니다. 형태(shape)로 <code>circle</code> · <code>solid</code> · <code>text</code> 세 갈래를 두고,
            circle은 size(L·M·S)와 role(fab·back·navPrev·navNext·toolbar·close·icon)로 조합합니다.
            아이콘 버튼의 내용은 항상 <code>MINGCUTE</code> 세트에서 가져오고, 컴포넌트 파일에 SVG를 직접 적지 않습니다.
            정보 패널의 32px 투명 버튼은 <code>renderIconButton()</code> (role <code>icon</code>)입니다.
          </p>
          <p class="ui-lab__files">참조: <code>src/components/Button/Button.js</code>, <code>src/components/Button/Button.css</code></p>
          ${renderVariantRow(
            'circle · size — L 52px / M 48px / S 32px (role toolbar)',
            [
              renderButton({ shape: 'circle', size: 'l', role: 'toolbar', ariaLabel: 'circle L 데모', content: MINGCUTE.addFill }),
              renderButton({ shape: 'circle', size: 'm', role: 'toolbar', ariaLabel: 'circle M 데모', content: MINGCUTE.addFill }),
              renderButton({ shape: 'circle', size: 's', role: 'toolbar', ariaLabel: 'circle S 데모', content: MINGCUTE.addFill })
            ].join('')
          )}
          ${renderVariantRow(
            'circle · role — fab(실사용은 fixed) / back inline / toolbar / close ghost',
            [
              renderButton({ shape: 'circle', role: 'fab', ariaLabel: '새 노트 추가 데모', content: MINGCUTE.fileNewFill }),
              renderButton({ shape: 'circle', role: 'back', inline: true, ariaLabel: '뒤로가기 데모' }),
              renderButton({ shape: 'circle', role: 'toolbar', ariaLabel: '툴바 버튼 데모', content: MINGCUTE.edit2Fill }),
              renderButton({
                shape: 'circle',
                role: 'close',
                tone: 'ghost',
                ariaLabel: '닫기 버튼 데모',
                content: MINGCUTE.closeLine,
                className: 'ui-lab-demo-icon'
              })
            ].join('')
          )}
          ${renderVariantRow(
            'circle · role icon (Icon Button) — 32px 투명 · 아이콘 16px, 노트 정보 패널 액션',
            [
              renderIconButton({ ariaLabel: '공유 데모', content: MINGCUTE.share2Fill }),
              renderIconButton({ ariaLabel: '즐겨찾기 데모', content: MINGCUTE.starLine }),
              renderIconButton({ ariaLabel: '노트 정보 수정 데모', content: MINGCUTE.edit2Fill }),
              renderIconButton({ ariaLabel: '페이지 추가 데모', content: MINGCUTE.fileNewFill }),
              renderIconButton({ ariaLabel: '삭제 데모', content: MINGCUTE.delete2Fill })
            ].join(''),
            { stageClass: 'ui-lab__demo-stage--icons' }
          )}
          ${renderVariantRow(
            'circle · role navPrev / navNext — 부모 기준 absolute 좌우 중앙 (next는 CSS로 좌우 반전)',
            [
              renderButton({ shape: 'circle', size: 'm', role: 'navPrev', ariaLabel: '이전 (데모)', content: MINGCUTE.leftLine }),
              renderButton({ shape: 'circle', size: 'm', role: 'navNext', ariaLabel: '다음 (데모)', content: MINGCUTE.leftLine })
            ].join(''),
            { flow: false, stageClass: 'ui-lab__demo-stage--nav' }
          )}
          ${renderVariantRow(
            'circle · tone — toolbar filled / toolbar ghost (배경만 지우고 나머지는 role 그대로)',
            [
              renderButton({ shape: 'circle', role: 'toolbar', ariaLabel: 'filled 데모', content: MINGCUTE.eye2Fill }),
              renderButton({ shape: 'circle', role: 'toolbar', tone: 'ghost', ariaLabel: 'ghost 데모', content: MINGCUTE.eye2Line })
            ].join('')
          )}
          ${renderVariantRow(
            '즐겨찾기 토글 — desktop star-fill(회색/primary) · mobile off=star-line(white 50%) / on=star-fill(primary)',
            [
              renderButton({
                shape: 'circle',
                size: 's',
                role: 'toolbar',
                tone: 'ghost',
                ariaLabel: '즐겨찾기 추가',
                title: '즐겨찾기 추가',
                ariaPressed: false,
                content: MINGCUTE.starFill,
                className: 'jukebox-focus-info__favorite jukebox-focus-info__favorite--desktop'
              }),
              renderButton({
                shape: 'circle',
                size: 's',
                role: 'toolbar',
                tone: 'ghost',
                ariaLabel: '즐겨찾기 해제',
                title: '즐겨찾기 해제',
                ariaPressed: true,
                content: MINGCUTE.starFill,
                className: 'jukebox-focus-info__favorite jukebox-focus-info__favorite--desktop is-favorite'
              }),
              renderButton({
                shape: 'circle',
                size: 's',
                role: 'toolbar',
                tone: 'ghost',
                ariaLabel: '즐겨찾기 추가',
                title: '즐겨찾기 추가 (모바일 off)',
                ariaPressed: false,
                content: MINGCUTE.starLine,
                className: 'jukebox-focus-info__favorite jukebox-focus-info__favorite--mobile'
              }),
              renderButton({
                shape: 'circle',
                size: 's',
                role: 'toolbar',
                tone: 'ghost',
                ariaLabel: '즐겨찾기 해제',
                title: '즐겨찾기 해제 (모바일 on)',
                ariaPressed: true,
                content: MINGCUTE.starFill,
                className: 'jukebox-focus-info__favorite jukebox-focus-info__favorite--mobile is-favorite'
              })
            ].join('')
          )}
          ${renderVariantRow(
            '노트 공유 — ghost toolbar · share-2-fill (주크박스 정보 패널) / share-2-line (뷰어 시트)',
            [
              renderButton({
                shape: 'circle',
                size: 's',
                role: 'toolbar',
                tone: 'ghost',
                ariaLabel: '공유 링크 복사',
                title: '공유 링크 복사',
                content: MINGCUTE.share2Fill,
                className: 'jukebox-focus-info__share jukebox-focus-info__share--desktop'
              })
            ].join('')
          )}
          ${renderVariantRow(
            '주크박스 포커스 액션 — 삭제 (수정·페이지 추가와 같은 primary 원형)',
            [
              renderButton({
                shape: 'circle',
                size: 's',
                role: 'toolbar',
                ariaLabel: '노트 삭제',
                title: '노트 삭제',
                content: MINGCUTE.delete2Fill,
                className: 'jukebox-focus-info__delete'
              })
            ].join('')
          )}
          ${renderVariantRow(
            '노트 인디케이터 — focused 항상 중앙 · 거리 1 짧은 캡슐 · 2+ 원형 페이드 (시작/중간/끝)',
            [
              renderNoteIndicator(0, 12),
              renderNoteIndicator(5, 12),
              renderNoteIndicator(11, 12)
            ].join(''),
            { flow: false, stageClass: 'ui-lab__demo-stage--note-indicator' }
          )}
          ${renderVariantRow(
            '페이지 북마크 토글 — desktop bookmark-fill · mobile off=bookmark-line / on=bookmark-fill (is_bookmarked)',
            [
              renderButton({
                shape: 'circle',
                size: 's',
                role: 'toolbar',
                tone: 'ghost',
                ariaLabel: '북마크 추가',
                title: '북마크 추가',
                ariaPressed: false,
                content: MINGCUTE.bookmarkFill,
                className: 'niv-bookmark niv-bookmark--desktop niv-sheet-btn'
              }),
              renderButton({
                shape: 'circle',
                size: 's',
                role: 'toolbar',
                tone: 'ghost',
                ariaLabel: '북마크 해제',
                title: '북마크 해제',
                ariaPressed: true,
                content: MINGCUTE.bookmarkFill,
                className: 'niv-bookmark niv-bookmark--desktop niv-sheet-btn is-bookmarked'
              }),
              renderButton({
                shape: 'circle',
                size: 's',
                role: 'toolbar',
                ariaLabel: '북마크 추가',
                title: '북마크 추가 (모바일 off)',
                ariaPressed: false,
                content: MINGCUTE.bookmarkLine,
                className: 'niv-bookmark niv-bookmark--mobile is-lab-static'
              }),
              renderButton({
                shape: 'circle',
                size: 's',
                role: 'toolbar',
                ariaLabel: '북마크 해제',
                title: '북마크 해제 (모바일 on)',
                ariaPressed: true,
                content: MINGCUTE.bookmarkFill,
                className: 'niv-bookmark niv-bookmark--mobile is-bookmarked is-lab-static'
              })
            ].join('')
          )}
          ${renderVariantRow(
            'shape — solid / text',
            [
              renderButton({ shape: 'solid', content: 'solid 버튼', className: 'ui-lab-demo-solid' }),
              renderButton({ shape: 'text', content: 'text 버튼' })
            ].join('')
          )}
          ${renderVariantRow(
            'state — disabled / nav is-at-end (마지막 페이지 시각 처리)',
            [
              renderButton({ shape: 'circle', role: 'toolbar', ariaLabel: 'disabled 데모', content: MINGCUTE.downLine, disabled: true }),
              renderButton({ shape: 'solid', content: 'solid disabled', className: 'ui-lab-demo-solid', disabled: true }),
              renderButton({ shape: 'text', content: 'text disabled', disabled: true }),
              renderButton({
                shape: 'circle',
                size: 'm',
                role: 'navNext',
                ariaLabel: 'is-at-end 데모',
                content: MINGCUTE.leftLine,
                className: 'is-at-end'
              })
            ].join('')
          )}
        </section>

        <section class="ui-lab__section" id="filter-chip">
          <h2 class="ui-lab__section-title">FilterChip</h2>
          <p class="ui-lab__section-desc">
            Timeline / By type에서 시기·유형을 나누는 칩입니다. 라벨 + 개수이고 상태는 default · hover · selected 셋입니다.
            PC는 가로 pill, 모바일(≤768px)은 세로 스택입니다. Button과 목적이 달라 별도 컴포넌트입니다.
            아래 PC/모바일 행은 뷰포트와 무관하게 레이아웃을 고정한 프리뷰이고, 마지막 행은 창 폭을 따릅니다.
          </p>
          <p class="ui-lab__files">참조: <code>src/components/FilterChip/FilterChip.js</code>, <code>src/components/FilterChip/FilterChip.css</code></p>
          ${renderVariantRow(
            'PC · default / hover / selected',
            [
              renderChip({ label: '플래너', count: 19, device: 'pc' }),
              renderChip({ label: '플래너', count: 19, device: 'pc', className: 'is-hover' }),
              renderChip({ label: '일반 노트', count: 19, device: 'pc', active: true })
            ].join(''),
            { stageClass: 'ui-lab__demo-stage--chips' }
          )}
          ${renderVariantRow(
            'Mobile · default / hover / selected',
            [
              renderChip({ label: '다이어리', count: 19, device: 'mobile' }),
              renderChip({ label: '다이어리', count: 19, device: 'mobile', className: 'is-hover' }),
              renderChip({ label: '플래너', count: 19, device: 'mobile', active: true })
            ].join(''),
            { stageClass: 'ui-lab__demo-stage--chips' }
          )}
          ${renderVariantRow(
            'auto · 뷰포트에 따라 PC/모바일 전환 (눌러서 선택)',
            [
              renderChip({ label: '다이어리', count: 19, dataset: { labChip: '1' } }),
              renderChip({ label: '플래너', count: 19, active: true, dataset: { labChip: '1' } }),
              renderChip({ label: '일반 노트', count: 8, dataset: { labChip: '1' } })
            ].join(''),
            { stageClass: 'ui-lab__demo-stage--chips ui-lab__demo-stage--chips-row' }
          )}
        </section>

        <section class="ui-lab__section" id="dropdown-chip">
          <h2 class="ui-lab__section-title">DropdownChip</h2>
          <p class="ui-lab__section-desc">
            커스텀 드롭다운의 트리거 칩입니다. 라벨 + 아래 화살표이고, 상태는 default · hover · active(열림) · selected(값 선택, 닫힘) · active-hover 다섯입니다.
            FilterChip과 달리 개수 없이 화살표만 붙고, 폭은 라벨에 맞춥니다. 열리면 화살표가 위로 뒤집히고 아래에 DropdownMenu가 붙습니다.
          </p>
          <p class="ui-lab__files">참조: <code>src/components/DropdownChip/DropdownChip.js</code>, <code>src/components/DropdownChip/DropdownChip.css</code></p>
          ${renderVariantRow(
            'state — default / hover / active / selected / active-hover',
            [
              renderDropdownChip({ label: 'Tab Name' }),
              renderDropdownChip({ label: 'Tab Name', className: 'is-hover' }),
              renderDropdownChip({ label: 'Tab Name', open: true }),
              renderDropdownChip({ label: 'Tab Name', selected: true }),
              renderDropdownChip({ label: 'Tab Name', open: true, className: 'is-hover' })
            ].join(''),
            { stageClass: 'ui-lab__demo-stage--chips ui-lab__demo-stage--chips-row' }
          )}
        </section>

        <section class="ui-lab__section" id="dropdown-menu">
          <h2 class="ui-lab__section-title">DropdownMenu</h2>
          <p class="ui-lab__section-desc">
            칩 아래에 붙는 드롭박스입니다. 상하좌우 padding 4px, 항목 간격 4px, radius 13px, 0.5px 보더입니다.
            항목 상태는 default · hover · selected · active-hover이고, 칩을 누르면 목록이 열리며 고르면 닫힙니다.
          </p>
          <p class="ui-lab__files">참조: <code>src/components/DropdownMenu/DropdownMenu.js</code>, <code>src/components/DropdownMenu/DropdownMenu.css</code></p>
          ${renderVariantRow(
            'dropbox — default / hover / selected / active-hover',
            renderDropdownMenu({
              ariaLabel: '드롭다운 항목 상태',
              content: [
                renderDropdownMenuItem({ label: 'Tab Name' }),
                renderDropdownMenuItem({ label: 'Tab Name', className: 'is-hover' }),
                renderDropdownMenuItem({ label: 'Tab Name', selected: true }),
                renderDropdownMenuItem({ label: 'Tab Name', selected: true, className: 'is-hover' })
              ].join('')
            }),
            { stageClass: 'ui-lab__demo-stage--menu' }
          )}
          ${renderVariantRow(
            '칩 + 목록 (눌러서 열고 고르기)',
            renderDropdown({
              id: 'lab-dropdown',
              label: 'Tab Name',
              value: 'tab-1',
              open: true,
              options: [
                { value: 'tab-1', label: 'Tab Name' },
                { value: 'tab-2', label: 'Planner' },
                { value: 'tab-3', label: 'Diary' },
                { value: 'tab-4', label: 'Notes' }
              ]
            }),
            { stageClass: 'ui-lab__demo-stage--dropdown' }
          )}
        </section>

        <section class="ui-lab__section" id="theme-switch">
          <h2 class="ui-lab__section-title">ThemeSwitch</h2>
          <p class="ui-lab__section-desc">
            헤더·드로어의 라이트/다크 pill 토글입니다. Button 세 갈래와 목적이 달라 별도 컴포넌트이고,
            트랙(surface)은 각 모드 <code>--color-bg</code>와 같은 grey 단계, 아이콘은 primary입니다.
            전환 시 썸이 좌(태양)·우(달)로 미끄러지고 트랙·아이콘이 교차 페이드됩니다. hover는 핸들만 밝아집니다.
            아래 데모는 앱 테마를 바꾸지 않고 스위치만 뒤집습니다. 실제 전환은 헤더 토글을 쓰면 됩니다.
          </p>
          <p class="ui-lab__files">
            참조:
            <code>src/components/ThemeSwitch/ThemeSwitch.js</code>,
            <code>src/components/ThemeSwitch/ThemeSwitch.css</code>
          </p>
          ${renderVariantRow(
            '다크 (달 활성)',
            renderThemeSwitch({ theme: 'dark' })
          )}
          ${renderVariantRow(
            '라이트 (태양 활성)',
            renderThemeSwitch({ theme: 'light' })
          )}
        </section>

        <section class="ui-lab__section" id="note-info">
          <h2 class="ui-lab__section-title">NoteInfoPanel</h2>
          <p class="ui-lab__section-desc">
            주크박스 하단 정보 패널입니다. 노트명, Icon Button 다섯 개(공유 · 즐겨찾기 · 수정 · 페이지 추가 · 삭제),
            노션 memo(최대 3줄 · 70자)를 세로로 쌓습니다. 데스크톱 패널 높이는 139px로 고정되고 내용은 상단부터 쌓입니다.
            모바일에서는 + 토글 없이 도구모음을 기본으로 보여 주고, 메모는 숨깁니다(표시 위치는 Backlog).
            패널 최소 높이는 제목+도구모음이며 그 아래로 줄지 않습니다. 패널 <code>margin-bottom</code>은 데스크톱 48px, 모바일 12px입니다.
          </p>
          <p class="ui-lab__files">참조: <code>src/components/NoteInfoPanel/NoteInfoPanel.js</code>, <code>src/components/NoteInfoPanel/NoteInfoPanel.css</code></p>
          ${renderVariantRow(
            '모바일 (도구모음 기본 노출, 메모 숨김)',
            renderNoteInfoPanel(
              {
                id: 'ui-lab-demo-note',
                title: '03_2024-25_카툰연습장',
                description:
                  '여기에는 노트에 대한 메모가 들어갑니다.\n들여쓰기를 허용하며, 최대 세 줄이 들어가고\n글자수로는 공백포함 70자까지.'
              },
              'period',
              { canEdit: true, compact: true }
            ),
            { stageClass: 'ui-lab__demo-stage--info' }
          )}
          <div class="ui-lab__demo-stage ui-lab__demo-stage--info">
            ${renderNoteInfoPanel(
              {
                id: 'ui-lab-demo-note-desktop',
                title: '03_2024-25_카툰연습장',
                description:
                  '여기에는 노트에 대한 메모가 들어갑니다.\n들여쓰기를 허용하며, 최대 세 줄이 들어가고\n글자수로는 공백포함 70자까지.'
              },
              'period',
              { canEdit: true }
            )}
          </div>
        </section>

        <section class="ui-lab__section" id="viewer-chrome">
          <h2 class="ui-lab__section-title">NoteImageViewer · 뷰어 크롬</h2>
          <p class="ui-lab__section-desc">
            뷰어 버튼은 좌우 페이지 이동(circle M · navPrev/navNext), 하단 시트(circle S · ghost),
            양면 토글(circle S · toolbar) 세 묶음이고 모두 공통 Button 컴포넌트로 만듭니다.
            아래는 실제 뷰어와 같은 마크업(<code>renderViewerChrome()</code>)을 그대로 얹은 정적 데모라 눌러도 동작하지 않습니다.
          </p>
          <p class="ui-lab__files">
            참조:
            <code>src/components/NoteImageViewer/ViewerChrome.js</code>,
            <code>src/components/NoteImageViewer/NoteImageViewer.css</code>
          </p>
          <div class="ui-lab__viewer-stage note-image-viewer" data-lab="viewer-chrome">
            <div class="ui-lab__viewer-page" aria-hidden="true">페이지 이미지</div>
            ${renderViewerChrome()}
          </div>
          <ul class="ui-lab__list">
            <li>하단 시트: 페이지 정보 · 페이지 추가 · 북마크 · 현재 페이지 링크 복사 · (처음 · 현재/전체 · 마지막) · 뷰 원상복구</li>
            <li>모바일 북마크는 양면 토글 위 FAB로 표시되고, 시트 안 북마크는 숨깁니다</li>
            <li>북마크는 Cloudinary <code>is_bookmarked</code>와 연결되며, 변경 시 토스트를 띄웁니다</li>
            <li>양면 토글(2페이지로 보기)을 누르면 3D 책장(BookFlip3D)으로 바뀝니다. 기본은 1페이지 보기이고, WebGL을 쓸 수 없으면 기존 2D 양면 붙이기를 씁니다</li>
            <li>로컬(<code>npm run dev</code>)에서는 주크박스에 Demo Note(흰 페이지 9장, 홀수 장이라 뒷표지 안쪽에 회색 가상 페이지)가 붙습니다</li>
            <li>공유 버튼은 보고 있는 장의 <code>/note/{slug}?p=N</code> 링크를 복사합니다. 주크박스 포커스 공유는 노트 전체 링크입니다</li>
            <li>다음 버튼은 마지막 페이지에서 <code>is-at-end</code>만 붙고 클릭 시 토스트를 띄웁니다</li>
            <li>공유 링크로 연 전체 페이지 뷰어는 오른쪽 위 닫기(X)·ESC·여백 클릭으로 주크박스에 돌아갑니다</li>
            <li>키보드: ←/→ 페이지 이동 · S 양면 · +/− 확대·축소 · 0 원상복구 · Esc 닫기</li>
          </ul>
        </section>

        <section class="ui-lab__section" id="toast">
          <h2 class="ui-lab__section-title">Toast</h2>
          <p class="ui-lab__section-desc">짧은 상태 메시지를 화면 하단에 잠깐 띄웁니다.</p>
          <p class="ui-lab__files">참조: <code>src/components/Toast/Toast.js</code>, <code>src/components/Toast/Toast.css</code></p>
          <div class="ui-lab__row">
            ${renderButton({
              shape: 'solid',
              content: '토스트 보기',
              className: 'ui-lab-demo-solid',
              dataset: { lab: 'toast' }
            })}
          </div>
        </section>

        <section class="ui-lab__section" id="shell">
          <h2 class="ui-lab__section-title">Shell · PageHeader · Login</h2>
          <p class="ui-lab__section-desc">
            앱 셸은 상단 PageHeader로 감쌉니다. 헤더의 Login/Logout과
            <a href="/login" data-link>/login</a> 페이지로 편집 권한 세션을 다룹니다.
          </p>
          <p class="ui-lab__files">
            참조:
            <code>src/widgets/PageHeader/PageHeader.js</code>,
            <code>src/widgets/PageHeader/PageHeader.css</code>,
            <code>src/pages/Login/Login.js</code>,
            <code>src/services/auth.js</code>,
            <code>api/auth.js</code>
          </p>
        </section>

        <section class="ui-lab__section" id="filter">
          <h2 class="ui-lab__section-title">FilterSubMenu</h2>
          <p class="ui-lab__section-desc">
            Timeline / By type 필터 탭과 정렬 UI입니다. Notes 갤러리 페이지에서만
            <code>#sub-menu.gallery-filter</code>에 주입됩니다. 데스크톱은 화면 상단 중앙(top 16px),
            모바일(너비 ≤768px)과 낮은 화면(높이 ≤768px)에서는 page-header(로고·햄버거) 바로 아래에 고정됩니다.
            Timeline / By type / Favorite 전환은 모바일 우측 드로어 Notes 하위에 있습니다.
          </p>
          <p class="ui-lab__files">참조: <code>src/components/FilterSubMenu/FilterSubMenu.js</code>, <code>src/components/FilterSubMenu/FilterSubMenu.css</code></p>
          <ul class="ui-lab__list">
            <li><a href="/timeline" data-link>Timeline에서 필터 확인</a></li>
            <li><a href="/by-type" data-link>By type에서 필터 확인</a></li>
          </ul>
        </section>

        <section class="ui-lab__section" id="note-forms">
          <h2 class="ui-lab__section-title">AddNoteFab · AddPageModal · PageMetaModal</h2>
          <p class="ui-lab__section-desc">
            노트 추가/수정 모달, 페이지 추가 모달, 페이지 정보(보기·수정) 모달입니다.
            실제 Cloudinary·Notion 호출이 있으므로 Lab에서는 진입 경로만 안내합니다.
          </p>
          <p class="ui-lab__files">
            참조:
            <code>src/components/AddNoteFab/AddNoteFab.js</code>,
            <code>src/components/AddNoteFab/AddNoteFab.css</code>,
            <code>src/components/AddPageModal/AddPageModal.js</code>,
            <code>src/components/AddPageModal/AddPageModal.css</code>,
            <code>src/components/AddPageModal/PageMetaModal.js</code>
          </p>
          <ul class="ui-lab__list">
            <li>노트 추가/수정: 헤더 우측(데스크톱) · 모바일 드로어 「새 노트 추가」</li>
            <li>페이지 추가: 뷰어 하단 시트의 + 버튼</li>
            <li>페이지 정보: 뷰어 하단 시트 정보 버튼</li>
          </ul>
          ${renderVariantRow(
            '업로드 결과 Dialog — 성공 / 일부만 저장 / 실패(표지만 됨)',
            [
              renderButton({
                shape: 'solid',
                content: '성공',
                className: 'ui-lab-demo-solid',
                dataset: { lab: 'upload-ok' }
              }),
              renderButton({
                shape: 'solid',
                content: '일부만 저장',
                className: 'ui-lab-demo-solid',
                dataset: { lab: 'upload-partial' }
              }),
              renderButton({
                shape: 'solid',
                content: '실패',
                className: 'ui-lab-demo-solid',
                dataset: { lab: 'upload-fail' }
              })
            ].join('')
          )}
        </section>

        <section class="ui-lab__section" id="viewers">
          <h2 class="ui-lab__section-title">NoteImageViewer · PdfModal</h2>
          <p class="ui-lab__section-desc">
            페이지 이미지 뷰어와 PDF 폴백 뷰어입니다. 모달·전체 페이지 모드, 하단 시트, 줌/패닝이 여기에 있습니다.
            버튼 구성은 위 <a href="#viewer-chrome">뷰어 크롬</a> 데모에서 확인할 수 있습니다.
          </p>
          <p class="ui-lab__files">
            참조:
            <code>src/components/NoteImageViewer/NoteImageViewer.js</code>,
            <code>src/components/NoteImageViewer/ViewerChrome.js</code>,
            <code>src/components/NoteImageViewer/NoteImageViewer.css</code>,
            <code>src/components/NoteDetailPage/NoteDetailPage.js</code>,
            <code>src/components/PdfModal/PdfModal.js</code>,
            <code>src/components/PdfModal/PdfModal.css</code>
          </p>
          <ul class="ui-lab__list">
            <li><a href="/" data-link>주크박스에서 노트 열어 뷰어 확인</a></li>
            ${
              isLocalDemoEnabled()
                ? `<li><a href="/note/${DEMO_NOTE_ID}" data-link>Demo Note 전체 페이지 뷰어</a> — Bookmark Note 표지 + 흰 페이지 9장</li>`
                : '<li>Demo Note는 <code>npm run dev</code> 로컬에서만 주크박스에 붙습니다</li>'
            }
          </ul>
          ${
            isLocalDemoEnabled()
              ? `<div class="ui-lab__live-viewer note-image-viewer" data-lab="demo-note-viewer"></div>`
              : ''
          }
        </section>

        <section class="ui-lab__section" id="pages">
          <h2 class="ui-lab__section-title">Pages · composition</h2>
          <p class="ui-lab__section-desc">
            라우트 단위 페이지는 위 컴포넌트를 조합합니다. Jukebox는 Timeline/By type의 갤러리 본체이고, Story는 카드 레이아웃 정적 페이지입니다.
          </p>
          <p class="ui-lab__files">
            참조:
            <code>src/pages/Notes/Jukebox.js</code>,
            <code>src/pages/Notes/Jukebox.css</code>,
            <code>src/pages/Notes/Timeline.js</code>,
            <code>src/pages/Notes/ByType.js</code>,
            <code>src/pages/Story/Story.js</code>,
            <code>src/pages/Story/Story.css</code>,
            <code>src/router.js</code>
          </p>
        </section>
      </div>
    </div>
  `;

  const root = mainContent.querySelector('.ui-lab');
  if (!root) return;

  fillTokenValues(root);
  watchThemeChange(root);
  attachViewportReadout(root);
  bindThemeSwitches(root.querySelector('#theme-switch'), { persist: false });
  bindLabChips(root.querySelector('#filter-chip'));
  bindLabDropdownChips(root.querySelector('#dropdown-chip'));
  bindLabDropdownMenu(root.querySelector('#dropdown-menu'));

  root.querySelector('[data-lab="toast"]')?.addEventListener('click', () => {
    showToast('UI Component Lab · Toast 데모');
  });

  root.querySelector('[data-lab="upload-ok"]')?.addEventListener('click', () => {
    openUploadResultDialog({
      title: '업로드 완료',
      message: '5페이지가 추가되었습니다.'
    });
  });
  root.querySelector('[data-lab="upload-partial"]')?.addEventListener('click', () => {
    openUploadResultDialog({
      title: '일부만 저장됨',
      message: '5장 중 3장만 올렸습니다.',
      detail: '4장째부터 실패했습니다.'
    });
  });
  root.querySelector('[data-lab="upload-fail"]')?.addEventListener('click', () => {
    openUploadResultDialog({
      title: '페이지 업로드 실패',
      message: '표지는 저장됐지만 본문 페이지는 올리지 못했습니다.',
      detail: '이미지 저장에 실패했습니다.'
    });
  });

  /* 정적 데모라 실제 페이지 수가 없으니 표시용 값만 채운다 */
  const chromeDemo = root.querySelector('[data-lab="viewer-chrome"]');
  if (chromeDemo) {
    const totalEl = chromeDemo.querySelector('.niv-total-pages');
    if (totalEl) totalEl.textContent = '12';
  }

  const liveViewer = root.querySelector('[data-lab="demo-note-viewer"]');
  if (liveViewer && isLocalDemoEnabled()) {
    const cleanup = renderNoteImageViewer(liveViewer, DEMO_NOTE_ID, {
      mode: 'modal',
      ...demoNoteViewerOptions()
    });
    const main = document.getElementById('main-content');
    if (main) {
      const prev = main._routeCleanup;
      main._routeCleanup = () => {
        cleanup?.();
        if (typeof prev === 'function') prev();
      };
    }
  }
}
