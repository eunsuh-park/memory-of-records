/**
 * UI Component Lab
 * 네비게이션에 노출하지 않는 내부 컴포넌트 리뷰 페이지 (/ui-lab)
 */

import { render as renderButton } from '../../components/Button/Button.js';
import { showToast } from '../../components/Toast/Toast.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import './UiLab.css';

const ICON_CHEVRON =
  "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' aria-hidden='true'><path stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' d='M15 6 9 12l6 6'/></svg>";
const ICON_CLOSE =
  "<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' aria-hidden='true'><path stroke='currentColor' stroke-width='1.8' stroke-linecap='round' d='M6 6l12 12M18 6 6 18'/></svg>";

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
    desc: '브랜드 6단계. 다크는 3단계, 라이트는 5단계를 --color-primary로 쓴다.',
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
      '헤더가 2줄이라 .app-main padding-top 7rem',
      '.main-wrapper height calc(100vh - 7rem)'
    ],
    tablet: ['데스크톱과 동일 (768px 규칙만 존재)'],
    desktop: ['.app-main padding-top 80px', '.main-wrapper height calc(100vh - 80px)', '푸터 48px 고정']
  },
  {
    name: 'PageHeader',
    files: 'src/widgets/PageHeader/PageHeader.js · PageHeader.css',
    points: '768px',
    mobile: [
      '세로 스택, width 100% · 라운드 0 · 배경 #2c333f (라이트 #eceff3)',
      '로고 중앙, 햄버거 2.5rem 우측 절대배치, 데스크톱 우측 그룹 숨김',
      '필터 슬롯이 아랫줄(order 2, max-height 6rem) — 접으면 max-height 0',
      '우측 드로어 min(72vw, 300px) 슬라이드'
    ],
    tablet: ['데스크톱 한 줄 레이아웃 유지'],
    desktop: [
      'fixed · max-width 1200px · width calc(100% - 3rem) · padding 1rem 2rem',
      '하단 모서리 48px 라운드',
      '로고 | 필터 슬롯(flex 1) | 테마·Login·Story 한 줄',
      '햄버거·드로어 display none'
    ]
  },
  {
    name: 'FilterSubMenu',
    files: 'src/components/FilterSubMenu/FilterSubMenu.js · FilterSubMenu.css',
    points: '1024 · 768 · 600 · 480px',
    mobile: [
      'top 7rem, 탭 목록 nowrap + 가로 스크롤, font 0.75rem',
      '주크박스에서는 2줄 고정 그리드(탭 80×28px, 라벨 0.55rem)로 바뀌고 정렬 select 숨김',
      '캐러셀 스크롤 시 자동 접힘(max-height 0 · opacity 0)',
      '≤600px 축약 라벨로 교체, ≤480px 추가 축소'
    ],
    tablet: [
      '구조는 데스크톱과 같고 치수만 축소',
      '탭 padding 0.4rem 0.6rem · font 0.8rem · gap 0.35rem'
    ],
    desktop: [
      '헤더 중앙에 static으로 주입 (단독 사용 시 fixed top 80px 중앙, radius 999px)',
      '탭 가로 나열 · 라벨 0.85rem',
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
      '바닥 반사 off, 모바일 포커스 정보(제목 + 1/N)로 교체',
      '중앙 카드 탭 → 72px 원형 보기/채우기 오버레이 (데스크톱은 바로 뷰어)',
      'FAB는 필터가 열렸을 때만 노출 · ≤480px에서 padding-top 70px, 카드 소폭 확대'
    ],
    tablet: ['.notes-container padding-top 90px', '갤러리·카드·포커스 UI는 데스크톱과 동일'],
    desktop: [
      '갤러리 padding 40vh 0 · perspective 60em · scroll-snap x mandatory',
      '카드 max-height 38vh · 이미지 max-width 28vw · 바닥 반사 on',
      '데스크톱 포커스 정보 블록 표시, 카드 액션 오버레이 숨김',
      '네비 버튼 fixed 좌우 1rem, 중앙 카드 클릭 시 뷰어 모달'
    ]
  },
  {
    name: 'NoteImageViewer',
    files: 'src/components/NoteImageViewer/NoteImageViewer.js · NoteImageViewer.css',
    points: '768 · 640px',
    mobile: [
      '이미지 컨테이너 좌우 52px 여백 — 네비 버튼과 겹침 회피',
      '하단 시트 min(380px, 100% - 1.25rem) · 버튼 2.15rem',
      '부채꼴 메뉴 아이템 5rem · ≤640px에서 zoom stage gap 12 → 8px'
    ],
    tablet: ['데스크톱과 동일'],
    desktop: [
      '이미지 컨테이너 padding 8px 8px 72px',
      '하단 시트 min(420px, 100% - 1.5rem) · 버튼 2.35rem',
      'spread FAB 2.2rem · 부채꼴 아이템 5.4rem'
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
      '≤640px FAB right/bottom 1rem · 패널 padding 1rem',
      '커버·입력 행 그리드가 모두 1열로 스택',
      '주크박스 모바일에서는 기본 숨김, 필터가 열렸을 때만 3rem 원형으로 노출'
    ],
    tablet: ['데스크톱과 동일'],
    desktop: [
      'FAB fixed right/bottom 1.25rem · 3.25rem 원형',
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
    name: 'Toast',
    files: 'src/components/Toast/Toast.js · Toast.css',
    points: '없음',
    mobile: ['모든 폭에서 동일'],
    tablet: ['모든 폭에서 동일'],
    desktop: ['fixed bottom 3rem 중앙 · radius 999px · z-index 2000', '브레이크포인트 없이 내용 폭에 맞춰 늘어남']
  },
  {
    name: 'Footer',
    files: 'src/components/Footer/Footer.js · Footer.css',
    points: '없음',
    mobile: ['모든 폭에서 동일'],
    tablet: ['모든 폭에서 동일'],
    desktop: ['fixed bottom · height 48px · 컨테이너 max-width 1200px · 폰트 0.6rem']
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

        <section class="ui-lab__section" id="button">
          <h2 class="ui-lab__section-title">Button</h2>
          <p class="ui-lab__section-desc">
            공통 버튼 팩토리입니다. 형태(shape)로 <code>circle</code> · <code>solid</code> · <code>text</code> 세 갈래를 두고,
            circle은 size(L·M·S)와 role(fab·back·navPrev·navNext·toolbar·close)로 조합합니다.
          </p>
          <p class="ui-lab__files">참조: <code>src/components/Button/Button.js</code>, <code>src/components/Button/Button.css</code></p>
          <div class="ui-lab__demo-stage ui-lab__demo-stage--nav">
            ${renderButton({ shape: 'circle', size: 'm', role: 'navPrev', ariaLabel: '이전 (데모)', content: ICON_CHEVRON })}
            ${renderButton({ shape: 'circle', size: 'm', role: 'navNext', ariaLabel: '다음 (데모)', content: ICON_CHEVRON })}
          </div>
          <div class="ui-lab__demo-stage ui-lab__demo-stage--icons">
            ${renderButton({
              shape: 'circle',
              size: 's',
              role: 'close',
              tone: 'ghost',
              ariaLabel: '닫기 버튼 데모',
              content: ICON_CLOSE,
              className: 'ui-lab-demo-icon'
            })}
            ${renderButton({
              shape: 'circle',
              size: 's',
              role: 'toolbar',
              ariaLabel: '툴바 버튼 데모',
              content: MINGCUTE.edit2Fill
            })}
            <span class="ui-lab__section-desc">circle S: close(ghost) / toolbar (fixed 위치 스타일은 실사용 맥락에서 확인)</span>
          </div>
          <div class="ui-lab__demo-stage ui-lab__demo-stage--icons">
            ${renderButton({ shape: 'solid', content: 'solid 버튼', className: 'ui-lab-demo-solid' })}
            ${renderButton({ shape: 'text', content: 'text 버튼' })}
            <span class="ui-lab__section-desc">solid / text</span>
          </div>
        </section>

        <section class="ui-lab__section" id="toast">
          <h2 class="ui-lab__section-title">Toast</h2>
          <p class="ui-lab__section-desc">짧은 상태 메시지를 화면 하단에 잠깐 띄웁니다.</p>
          <p class="ui-lab__files">참조: <code>src/components/Toast/Toast.js</code>, <code>src/components/Toast/Toast.css</code></p>
          <div class="ui-lab__row">
            <button type="button" class="ui-lab__primary-btn" data-lab="toast">토스트 보기</button>
          </div>
        </section>

        <section class="ui-lab__section" id="shell">
          <h2 class="ui-lab__section-title">Shell · PageHeader · Footer · Login</h2>
          <p class="ui-lab__section-desc">
            앱 셸은 상단 PageHeader와 하단 Footer로 감쌉니다. 헤더의 Login/Logout과
            <a href="/login" data-link>/login</a> 페이지로 편집 권한 세션을 다룹니다.
          </p>
          <p class="ui-lab__files">
            참조:
            <code>src/widgets/PageHeader/PageHeader.js</code>,
            <code>src/widgets/PageHeader/PageHeader.css</code>,
            <code>src/components/Footer/Footer.js</code>,
            <code>src/components/Footer/Footer.css</code>,
            <code>src/pages/Login/Login.js</code>,
            <code>src/services/auth.js</code>,
            <code>api/auth.js</code>
          </p>
        </section>

        <section class="ui-lab__section" id="filter">
          <h2 class="ui-lab__section-title">FilterSubMenu</h2>
          <p class="ui-lab__section-desc">
            Timeline / By type 필터 탭과 정렬 UI입니다. Notes 갤러리 페이지에서만 헤더 중앙에 주입되며,
            모바일에서는 접이식 상단 네비로 동작합니다. 실데이터 연동 데모는 Timeline·By type에서 확인하세요.
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
            <li>노트 추가/수정: Notes 주크박스 하단·카드 액션</li>
            <li>페이지 추가: 뷰어에서 페이지 번호 롱프레스 → 페이지 추가</li>
            <li>페이지 정보: 뷰어 하단 시트 정보 버튼</li>
          </ul>
        </section>

        <section class="ui-lab__section" id="viewers">
          <h2 class="ui-lab__section-title">NoteImageViewer · PdfModal</h2>
          <p class="ui-lab__section-desc">
            페이지 이미지 뷰어와 PDF 폴백 뷰어입니다. 모달·전체 페이지 모드, 하단 시트, 부채꼴 메뉴, 줌/패닝이 여기에 있습니다.
          </p>
          <p class="ui-lab__files">
            참조:
            <code>src/components/NoteImageViewer/NoteImageViewer.js</code>,
            <code>src/components/NoteImageViewer/NoteImageViewer.css</code>,
            <code>src/components/PdfModal/PdfModal.js</code>,
            <code>src/components/PdfModal/PdfModal.css</code>
          </p>
          <ul class="ui-lab__list">
            <li><a href="/" data-link>주크박스에서 노트 열어 뷰어 확인</a></li>
          </ul>
        </section>

        <section class="ui-lab__section" id="pages">
          <h2 class="ui-lab__section-title">Pages · composition</h2>
          <p class="ui-lab__section-desc">
            라우트 단위 페이지는 위 컴포넌트를 조합합니다. Jukebox는 Timeline/By type의 갤러리 본체이고, Story는 별도 풀스크린 서사 페이지입니다.
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

  root.querySelector('[data-lab="toast"]')?.addEventListener('click', () => {
    showToast('UI Component Lab · Toast 데모');
  });
}
