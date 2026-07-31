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

const ATOMIC_SWATCHES = [
  '--grey-0',
  '--grey-100',
  '--grey-150',
  '--grey-500',
  '--grey-700',
  '--grey-750',
  '--grey-800',
  '--grey-850',
  '--grey-900',
  '--yellow-400',
  '--yellow-600',
  '--red-400'
];

const SEMANTIC_SWATCHES = [
  '--color-bg',
  '--color-bg-alt',
  '--color-text',
  '--color-text-muted',
  '--color-text-dim',
  '--color-primary',
  '--color-primary-on',
  '--color-border',
  '--color-surface-hover',
  '--color-surface-active',
  '--color-overlay',
  '--color-error'
];

function readCssVar(name) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '—';
  } catch {
    return '—';
  }
}

function renderSwatches(names) {
  return names
    .map(
      (varName) => `
    <div class="ui-lab__swatch">
      <div class="ui-lab__swatch-chip" style="background: var(${varName})"></div>
      <p class="ui-lab__swatch-name">${varName}</p>
      <p class="ui-lab__swatch-value" data-token="${varName}">…</p>
    </div>`
    )
    .join('');
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
          <p class="ui-lab__meta">경로: <code>/ui-lab</code> · 문서: <code>Design.md</code></p>
        </header>

        <section class="ui-lab__section" id="tokens-atomic">
          <h2 class="ui-lab__section-title">Atomic tokens</h2>
          <p class="ui-lab__section-desc">
            테마와 무관한 원시 스케일입니다. grey / yellow / red 값을 먼저 두고, semantic이 이를 가리킵니다.
          </p>
          <p class="ui-lab__files">참조: <code>src/styles/colors.css</code> (Atomic 섹션)</p>
          <div class="ui-lab__swatches">${renderSwatches(ATOMIC_SWATCHES)}</div>
        </section>

        <section class="ui-lab__section" id="tokens-semantic">
          <h2 class="ui-lab__section-title">Semantic tokens</h2>
          <p class="ui-lab__section-desc">
            역할 이름(<code>--color-*</code>)입니다. 테마 토글 시 가리키는 atomic·rgba만 바뀌므로 컴포넌트는 이 층을 쓰면 됩니다.
          </p>
          <p class="ui-lab__files">참조: <code>src/styles/colors.css</code>, <code>src/utils/theme.js</code></p>
          <div class="ui-lab__swatches">${renderSwatches(SEMANTIC_SWATCHES)}</div>
        </section>

        <section class="ui-lab__section" id="button">
          <h2 class="ui-lab__section-title">Button</h2>
          <p class="ui-lab__section-desc">
            공통 버튼 팩토리입니다. variant에 따라 뒤로가기·뷰어 화살표·아이콘·툴바 스타일을 만듭니다.
          </p>
          <p class="ui-lab__files">참조: <code>src/components/Button/Button.js</code>, <code>src/components/Button/Button.css</code></p>
          <div class="ui-lab__demo-stage ui-lab__demo-stage--nav">
            ${renderButton({ variant: 'navPrev', ariaLabel: '이전 (데모)', content: ICON_CHEVRON })}
            ${renderButton({ variant: 'navNext', ariaLabel: '다음 (데모)', content: ICON_CHEVRON })}
          </div>
          <div class="ui-lab__demo-stage ui-lab__demo-stage--icons">
            ${renderButton({
              variant: 'icon',
              ariaLabel: '아이콘 버튼 데모',
              content: ICON_CLOSE,
              className: 'ui-lab-demo-icon'
            })}
            ${renderButton({
              variant: 'toolbar',
              ariaLabel: '툴바 버튼 데모',
              content: MINGCUTE.edit2Fill
            })}
            <span class="ui-lab__section-desc">icon / toolbar (위치 fixed 스타일은 실사용 맥락에서 확인)</span>
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

  mainContent.querySelectorAll('[data-token]').forEach((el) => {
    const name = el.getAttribute('data-token');
    el.textContent = readCssVar(name);
  });

  mainContent.querySelector('[data-lab="toast"]')?.addEventListener('click', () => {
    showToast('UI Component Lab · Toast 데모');
  });
}
