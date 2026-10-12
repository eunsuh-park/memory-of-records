/**
 * Component 페이지. 각 페이지는 실제 렌더, Figma 매핑 표, 메모로 구성한다.
 */

import { render as renderButton, renderIconButton } from '../../components/Button/Button.js';
import { render as renderThemeSwitch } from '../../components/ThemeSwitch/ThemeSwitch.js';
import { render as renderViewerSwitch } from '../../components/ViewerSwitch/ViewerSwitch.js';
import { render as renderChip } from '../../components/FilterChip/FilterChip.js';
import { render as renderDropdownChip } from '../../components/DropdownChip/DropdownChip.js';
import {
  render as renderDropdown,
  renderItem as renderDropdownMenuItem,
  renderPanel as renderDropdownMenu
} from '../../components/DropdownMenu/DropdownMenu.js';
import {
  renderBottomSheet,
  renderNavButtons,
  renderSheetActions,
  renderViewerChrome
} from '../../components/NoteImageViewer/ViewerChrome.js';
import { render as renderField } from '../../components/FormField/FormField.js';
import { renderAddPageModal, renderAddPagesConfirm } from '../../components/AddPageModal/AddPageModal.js';
import { renderAddNoteModal, renderAddNoteViewConfirm } from '../../components/AddNoteFab/AddNoteFab.js';
import { renderAddBookmarkNoteModal } from '../../components/AddBookmarkNoteModal/AddBookmarkNoteModal.js';
import { renderBookmarkNotePicker } from '../../components/BookmarkNotePicker/BookmarkNotePicker.js';
import { BOOKMARKS_NOTE_ID } from '../../utils/bookmarksNote.js';
import { LIGHT_NOTE_COLORS, NOTE_COLOR_NAMES, NOTE_COLOR_PAINT } from '../../utils/noteColorMap.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import { render as renderNoteInfoPanel, renderNoteIndicator } from '../../components/NoteInfoPanel/NoteInfoPanel.js';
import { DEMO_NOTE_ID, isLocalDemoEnabled } from '../../utils/demoNote.js';
import bookmarksCoverFront from '../../assets/bookmarks-cover-front.png';
import bookmarksCoverBack from '../../assets/bookmarks-cover-back.png';
import '../../components/FilterSubMenu/FilterSubMenu.css';
import { renderLabPage } from './labDocs.js';
import { renderVariantRow } from './labStage.js';

const LAB_ADD_PAGE_NOTE = '03_2024-25_카툰연습장';
const LAB_ADD_NOTE_SEED = {
  name: LAB_ADD_PAGE_NOTE,
  notebookType: '스케치북',
  periodName: 'After School',
  color: '노랑',
  size: 'A5',
  periodStart: '2024-03-01',
  periodEnd: '',
  stillInUse: true,
  notes: '카툰 연습용. 표지부터 뒷장까지 한 권으로 이어 그린다.',
  isKept: true,
  visible: true
};

function renderLabAddNoteModal(overrides = {}) {
  return renderAddNoteModal({
    className: 'dialog--inline',
    mode: 'create',
    seed: LAB_ADD_NOTE_SEED,
    coverFrontPreviewUrl: bookmarksCoverFront,
    coverBackPreviewUrl: bookmarksCoverBack,
    coverFrontStatus: 'cover-front.jpg',
    coverBackStatus: 'cover-back.jpg',
    nextDisabled: false,
    ...overrides
  });
}

const NOTE = {
  id: 'ui-lab-demo-note',
  title: LAB_ADD_PAGE_NOTE,
  description: '여기에는 노트에 대한 메모가 들어갑니다.\n들여쓰기를 허용하며, 최대 세 줄이 들어가고\n글자수로는 공백포함 70자까지.'
};

function buttonPage() {
  return renderLabPage({
    id: 'button',
    group: 'Component',
    title: 'Button',
    lede: '공통 버튼입니다. shape는 circle · solid · text이고, circle은 size(L·M·S)와 role을 조합합니다. 아이콘은 MingCute만 씁니다.',
    files: '<code>src/components/Button/Button.js</code> · <code>Button.css</code>',
    demo: [
      renderVariantRow(
        'circle · size — L 52px / M 48px / S 32px (role toolbar)',
        [
          renderButton({ shape: 'circle', size: 'l', role: 'toolbar', ariaLabel: 'circle L 데모', content: MINGCUTE.addFill }),
          renderButton({ shape: 'circle', size: 'm', role: 'toolbar', ariaLabel: 'circle M 데모', content: MINGCUTE.addFill }),
          renderButton({ shape: 'circle', size: 's', role: 'toolbar', ariaLabel: 'circle S 데모', content: MINGCUTE.addFill })
        ].join('')
      ),
      renderVariantRow(
        'circle · role — fab / back inline / toolbar / close ghost',
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
      ),
      renderVariantRow(
        'circle · role icon — 32px 투명',
        [
          renderIconButton({ ariaLabel: '공유 데모', content: MINGCUTE.share2Fill }),
          renderIconButton({ ariaLabel: '즐겨찾기 데모', content: MINGCUTE.starLine }),
          renderIconButton({ ariaLabel: '노트 정보 수정 데모', content: MINGCUTE.edit2Fill }),
          renderIconButton({ ariaLabel: '페이지 추가 데모', content: MINGCUTE.fileNewFill }),
          renderIconButton({ ariaLabel: '삭제 데모', content: MINGCUTE.delete2Fill })
        ].join(''),
        { stageClass: 'ui-lab__demo-stage--icons' }
      ),
      renderVariantRow(
        'circle · navPrev / navNext',
        [
          renderButton({ shape: 'circle', size: 'm', role: 'navPrev', ariaLabel: '이전 (데모)', content: MINGCUTE.leftLine }),
          renderButton({ shape: 'circle', size: 'm', role: 'navNext', ariaLabel: '다음 (데모)', content: MINGCUTE.leftLine })
        ].join(''),
        { flow: false, stageClass: 'ui-lab__demo-stage--nav' }
      ),
      renderVariantRow(
        'tone — toolbar filled / ghost',
        [
          renderButton({ shape: 'circle', role: 'toolbar', ariaLabel: 'filled 데모', content: MINGCUTE.eye2Fill }),
          renderButton({ shape: 'circle', role: 'toolbar', tone: 'ghost', ariaLabel: 'ghost 데모', content: MINGCUTE.eye2Line })
        ].join('')
      ),
      renderVariantRow(
        '즐겨찾기 — desktop off/on · mobile off/on',
        [
          renderButton({
            shape: 'circle', size: 's', role: 'toolbar', tone: 'ghost', ariaLabel: '즐겨찾기 추가', ariaPressed: false,
            content: MINGCUTE.starFill, className: 'jukebox-focus-info__favorite jukebox-focus-info__favorite--desktop'
          }),
          renderButton({
            shape: 'circle', size: 's', role: 'toolbar', tone: 'ghost', ariaLabel: '즐겨찾기 해제', ariaPressed: true,
            content: MINGCUTE.starFill, className: 'jukebox-focus-info__favorite jukebox-focus-info__favorite--desktop is-favorite'
          }),
          renderButton({
            shape: 'circle', size: 's', role: 'toolbar', tone: 'ghost', ariaLabel: '즐겨찾기 추가', ariaPressed: false,
            content: MINGCUTE.starLine, className: 'jukebox-focus-info__favorite jukebox-focus-info__favorite--mobile'
          }),
          renderButton({
            shape: 'circle', size: 's', role: 'toolbar', tone: 'ghost', ariaLabel: '즐겨찾기 해제', ariaPressed: true,
            content: MINGCUTE.starFill, className: 'jukebox-focus-info__favorite jukebox-focus-info__favorite--mobile is-favorite'
          })
        ].join('')
      ),
      renderVariantRow(
        '공유 · 삭제',
        [
          renderButton({
            shape: 'circle', size: 's', role: 'toolbar', tone: 'ghost', ariaLabel: '공유 링크 복사',
            content: MINGCUTE.share2Fill, className: 'jukebox-focus-info__share jukebox-focus-info__share--desktop'
          }),
          renderButton({
            shape: 'circle', size: 's', role: 'toolbar', ariaLabel: '노트 삭제',
            content: MINGCUTE.delete2Fill, className: 'jukebox-focus-info__delete'
          })
        ].join('')
      ),
      renderVariantRow(
        '노트 인디케이터 — 시작 / 중간 / 끝',
        [renderNoteIndicator(0, 12), renderNoteIndicator(5, 12), renderNoteIndicator(11, 12)].join(''),
        { flow: false, stageClass: 'ui-lab__demo-stage--note-indicator' }
      ),
      renderVariantRow(
        '페이지 북마크 — desktop off/on · mobile off/on',
        [
          renderButton({
            shape: 'circle', size: 's', role: 'toolbar', tone: 'ghost', ariaLabel: '북마크 추가', ariaPressed: false,
            content: MINGCUTE.bookmarkFill, className: 'niv-bookmark niv-bookmark--desktop niv-sheet-btn'
          }),
          renderButton({
            shape: 'circle', size: 's', role: 'toolbar', tone: 'ghost', ariaLabel: '북마크 해제', ariaPressed: true,
            content: MINGCUTE.bookmarkFill, className: 'niv-bookmark niv-bookmark--desktop niv-sheet-btn is-bookmarked'
          }),
          renderButton({
            shape: 'circle', size: 's', role: 'toolbar', ariaLabel: '북마크 추가', ariaPressed: false,
            content: MINGCUTE.bookmarkLine, className: 'niv-bookmark niv-bookmark--mobile is-lab-static'
          }),
          renderButton({
            shape: 'circle', size: 's', role: 'toolbar', ariaLabel: '북마크 해제', ariaPressed: true,
            content: MINGCUTE.bookmarkFill, className: 'niv-bookmark niv-bookmark--mobile is-bookmarked is-lab-static'
          })
        ].join('')
      ),
      renderVariantRow(
        'shape — solid / text',
        [
          renderButton({ shape: 'solid', content: 'solid 버튼', className: 'ui-lab-demo-solid' }),
          renderButton({ shape: 'text', content: 'text 버튼' })
        ].join('')
      ),
      renderVariantRow(
        'state — disabled / nav is-at-end',
        [
          renderButton({ shape: 'circle', role: 'toolbar', ariaLabel: 'disabled 데모', content: MINGCUTE.downLine, disabled: true }),
          renderButton({ shape: 'solid', content: 'solid disabled', className: 'ui-lab-demo-solid', disabled: true }),
          renderButton({ shape: 'text', content: 'text disabled', disabled: true }),
          renderButton({
            shape: 'circle', size: 'm', role: 'navNext', ariaLabel: 'is-at-end 데모',
            content: MINGCUTE.leftLine, className: 'is-at-end'
          })
        ].join('')
      )
    ].join(''),
    tables: [
      {
        title: 'Props · States',
        columns: ['이름', '값', '비고'],
        rows: [
          ['shape', 'circle · solid · text', '형태. 칩·토글은 이 컴포넌트가 아님'],
          ['size', 'l · m · s', 'circle 전용. 생략 시 role 기본 크기'],
          ['role', 'fab · back · navPrev · navNext · toolbar · close · icon', 'circle 전용'],
          ['tone', 'filled · ghost', 'ghost는 배경만 지움. role의 크기·아이콘은 유지'],
          ['inline', 'true', 'back을 문서 흐름 안에'],
          ['block', 'true', 'text를 전체 너비 테두리 버튼으로'],
          ['disabled', 'true', 'solid opacity 0.55 · text 0.5'],
          ['ariaPressed', 'true / false', '즐겨찾기·북마크 토글'],
          ['is-at-end', 'class', '마지막 페이지 nav. 클릭은 막고 토스트']
        ]
      },
      {
        title: '간격 · 크기',
        columns: ['자리', '값', 'Foundation'],
        rows: [
          ['circle L', '52px (3.25rem)', '토큰 없음'],
          ['circle M', '48px', '--space-12'],
          ['circle S · icon · toolbar', '32px', '--space-8'],
          ['circle 아이콘 기본', '1.25rem', '--space-5'],
          ['toolbar · icon 아이콘', '16px', '--space-4'],
          ['FAB 아이콘', '1.35rem', '토큰 없음'],
          ['FAB inset', '20px, ≤640px는 16px', '--space-5 / --space-4'],
          ['back inset', '16px', '--space-4'],
          ['back 모바일', '44px', '토큰 없음. ≤768이고 role back만'],
          ['solid padding', '12px 16px', '--space-3 --space-4'],
          ['text padding', '4px 8px', '--space-1 --space-2'],
          ['text block padding', '12px 16px', '--space-3 --space-4']
        ]
      },
      {
        title: '모서리 · 글자',
        columns: ['자리', 'Radius', 'Type'],
        rows: [
          ['circle', '--radius-circle', '아이콘. toolbar font-size --text-base, close --text-xs'],
          ['solid', '--radius-md', '--text-base · --font-semibold'],
          ['text', '--radius-sm', '--text-sm'],
          ['text block', '--radius-md', '--text-base · --font-medium']
        ]
      },
      {
        title: '색',
        columns: ['상태', '배경', '글자 · 보더'],
        rows: [
          ['fab', '--color-primary', '--color-primary-on · 그림자 --shadow-md'],
          ['fab hover', 'brightness 1.05', '--white'],
          ['back', '--color-on-light-bg', '--color-on-light · 보더 --color-on-light-border'],
          ['toolbar filled', '--color-chrome', '--color-chrome-on'],
          ['toolbar hover', '--color-chrome-strong', '--color-chrome-on'],
          ['icon', 'transparent', '--color-text'],
          ['icon hover', '--color-surface-hover', '--color-text'],
          ['ghost', 'transparent', 'inherit. Lab 스테이지에서는 --color-text'],
          ['solid', '--color-primary', '--color-primary-on'],
          ['text', 'transparent', '--color-text-muted'],
          ['text hover', 'transparent', '--color-text'],
          ['text block', 'transparent', '--color-text · 보더 --color-border'],
          ['text block hover', '--color-surface-hover', '--color-text'],
          ['favorite on', 'transparent', '--color-primary'],
          ['focus', '—', 'outline 2px --color-primary (fab · icon)']
        ]
      }
    ],
    notes: [
      '배경 없는 아이콘 버튼은 role을 유지한 채 tone ghost를 줍니다. 새 클래스로 배경을 지우지 않습니다.',
      'navNext 아이콘은 같은 left 아이콘을 CSS로 뒤집습니다.',
      '즐겨찾기 데스크톱은 star-fill(회색 / 선택 시 primary). 모바일 off는 star-line, on은 star-fill primary입니다.',
      '북마크 데스크톱은 bookmark-fill. 모바일 off는 bookmark-line, on은 bookmark-fill입니다.',
      '노트 인디케이터는 Button이 아닙니다. 점 사이 0.375rem은 space 토큰이 없고, 알약은 --radius-pill입니다. NoteInfoPanel 위치 규칙은 그 페이지 메모에 있습니다.',
      '해상도별 back 크기 차이는 Foundation / Breakpoint의 Button 행을 봅니다.'
    ]
  });
}

function filterChipPage() {
  return renderLabPage({
    id: 'filter-chip',
    group: 'Component',
    title: 'FilterChip',
    lede: 'Menu의 자식입니다. Timeline / By type의 시기·유형 칩이고, 라벨과 개수입니다. PC는 가로 pill, 모바일(≤768px)은 세로 스택입니다.',
    files: '<code>src/components/FilterChip/FilterChip.js</code> · <code>FilterChip.css</code>',
    demo: [
      renderVariantRow(
        'PC · default / hover / selected',
        [
          renderChip({ label: '플래너', count: 19, device: 'pc' }),
          renderChip({ label: '플래너', count: 19, device: 'pc', className: 'is-hover' }),
          renderChip({ label: '일반 노트', count: 19, device: 'pc', active: true })
        ].join(''),
        { stageClass: 'ui-lab__demo-stage--chips' }
      ),
      renderVariantRow(
        'Mobile · default / hover / selected',
        [
          renderChip({ label: '다이어리', count: 19, device: 'mobile' }),
          renderChip({ label: '다이어리', count: 19, device: 'mobile', className: 'is-hover' }),
          renderChip({ label: '플래너', count: 19, device: 'mobile', active: true })
        ].join(''),
        { stageClass: 'ui-lab__demo-stage--chips' }
      ),
      renderVariantRow(
        'auto · 창 폭을 따름 (눌러서 선택)',
        [
          renderChip({ label: '다이어리', count: 19, dataset: { 'lab-chip': '1' } }),
          renderChip({ label: '플래너', count: 19, active: true, dataset: { 'lab-chip': '1' } }),
          renderChip({ label: '일반 노트', count: 8, dataset: { 'lab-chip': '1' } })
        ].join(''),
        { stageClass: 'ui-lab__demo-stage--chips ui-lab__demo-stage--chips-row' }
      )
    ].join(''),
    tables: [
      {
        title: 'Props · States',
        columns: ['이름', '값', '비고'],
        rows: [
          ['label / count', '문자열 / 숫자', '라벨 + 개수'],
          ['active', 'true', 'class is-active · aria-pressed'],
          ['device', 'pc · mobile · 생략', '생략하면 ≤768px에서 모바일'],
          ['default', '배경 transparent', '라벨 muted 또는 50%'],
          ['hover', '--color-surface-hover', '선택은 바꾸지 않음'],
          ['selected', '--color-surface-hover', '라벨 --color-text semibold'],
          ['disabled', 'opacity 0.5', 'aria-disabled']
        ]
      },
      {
        title: '간격 · 모서리',
        columns: ['', 'PC', 'Mobile'],
        rows: [
          ['padding', '6px --space-3', '--space-3 --space-2'],
          ['내용 gap', '--space-1', '--space-1'],
          ['radius', '--radius-pill', '--radius-md'],
          ['방향', '가로', '세로']
        ]
      },
      {
        title: '글자 · 색',
        columns: ['', 'PC', 'Mobile'],
        rows: [
          ['라벨 크기', '--text-xs (12px)', '0.875rem (토큰 없음)'],
          ['라벨 굵기', '--font-thin → 선택 --font-semibold', '같음'],
          ['라벨 색', '--color-text-muted → 선택 --color-text', 'text 50% → 선택 --color-text'],
          ['개수 크기', '--text-2xs', '0.625rem (토큰 없음)'],
          ['개수 색', 'text 50% → 선택 --color-text', '같음'],
          ['개수 굵기', '--font-thin → 선택 --font-regular', '같음'],
          ['focus', 'outline 2px --color-primary', '같음']
        ]
      }
    ],
    notes: [
      'PC 세로 padding 6px(0.375rem)은 space 토큰이 아닙니다. --space-1(4px)과 --space-2(8px) 사이입니다.',
      '모바일 라벨 14px · 개수 10px도 타입 토큰과 같지 않습니다. --text-sm은 0.85rem입니다.',
      '선택 라벨은 primary가 아니라 --color-text입니다.',
      'Button과 역할이 달라 Button shape로 만들지 않습니다.'
    ]
  });
}

function dropdownPage() {
  return renderLabPage({
    id: 'dropdown',
    group: 'Component',
    title: 'Dropdown',
    lede: 'Menu의 자식입니다. 트리거(칩)와 목록은 한 드롭다운의 두 부분이고, 열리면 칩 아래에 목록이 붙습니다.',
    files: '<code>src/components/DropdownChip/DropdownChip.js</code> · <code>DropdownMenu/DropdownMenu.js</code>',
    demo: [
      renderVariantRow(
      'default / hover / active / selected / active-hover',
      [
        renderDropdownChip({ label: 'Tab Name' }),
        renderDropdownChip({ label: 'Tab Name', className: 'is-hover' }),
        renderDropdownChip({ label: 'Tab Name', open: true }),
        renderDropdownChip({ label: 'Tab Name', selected: true }),
        renderDropdownChip({ label: 'Tab Name', open: true, className: 'is-hover' })
      ].join(''),
      { stageClass: 'ui-lab__demo-stage--chips ui-lab__demo-stage--chips-row' }
    ),
      renderVariantRow(
        '목록 — default / hover / selected / active-hover',
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
      ),
      renderVariantRow(
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
      )
    ].join(''),
    tables: [
      {
        title: '칩 상태',
        columns: ['상태', '배경', '글자', '굵기'],
        rows: [
          ['default', 'transparent', '--color-text-muted', '--font-regular'],
          ['hover', '--color-surface-hover', '--color-text', '--font-semibold'],
          ['active (열림)', '--color-surface-active', '--color-primary', '--font-semibold'],
          ['selected (닫힘)', 'transparent', '--color-primary', '--font-semibold'],
          ['active-hover', '--color-surface-hover', '--color-primary', '--font-semibold'],
          ['disabled', 'opacity 0.5', '유지', '유지']
        ]
      },
      {
        title: '목록 상태',
        columns: ['상태', '배경', '글자', '굵기'],
        rows: [
          ['default', 'transparent', '--color-text-dim', '--font-regular'],
          ['hover', '--color-surface-hover', '--color-text', 'regular'],
          ['selected', 'transparent', '--color-text', '--font-semibold'],
          ['selected hover', '--color-surface-hover', '--color-text', 'semibold']
        ]
      },
      {
        title: '간격 · 모서리 · 글자',
        columns: ['속성', '값', 'Foundation'],
        rows: [
          ['padding', '1px 4px 1px 12px', '1px는 토큰 없음 · 4px --space-1 · 12px --space-3'],
          ['gap', '8px', '--space-2'],
          ['min-width', '120px', '토큰 없음'],
          ['아이콘 박스', '24px', '--space-6'],
          ['화살표 벡터', '8.19 × 10.01px', '토큰 없음'],
          ['radius', 'pill', '--radius-pill'],
          ['보더', '0.5px', '--color-border. 두께 토큰 없음'],
          ['글자', '12px / line 12px', '--text-xs와 같은 12px. CSS는 12px 리터럴'],
          ['목록 padding · gap', '4px', '--space-1'],
          ['목록 radius', '13px', '가장 가까운 --radius-lg는 12px. 코드는 13px'],
          ['목록과 칩 간격', '10px', '토큰 없음'],
          ['항목 padding', '7px 8px', '7px 토큰 없음 · 8px --space-2']
        ]
      }
    ],
    notes: [
      '칩과 목록은 부모 Dropdown의 부분이다. 파일은 DropdownChip.js와 DropdownMenu.js로 나뉘어 있고, 역할(트리거 / 목록)이 달라 한 함수로 합치지 않았다.',
      '목록 배경은 기본 transparent이고, hover만 surface-hover다. selected만으로는 배경이 생기지 않는다.',
      '13px radius를 Figma에서 --radius-lg(12px)로 바꾸면 구현과 1px 어긋난다.',
      'focus는 outline 2px --color-primary, offset 2px이다.'
    ]
  });
}

function switchPage() {
  return renderLabPage({
    id: 'switch',
    group: 'Component',
    title: 'Switch',
    lede: '같은 pill을 type으로 나눕니다. theme은 라이트/다크, viewer는 갤러리 레이아웃입니다. 아래 데모는 앱 테마와 갤러리 설정을 바꾸지 않고 스위치만 뒤집습니다.',
    files: '<code>src/components/ThemeSwitch/ThemeSwitch.js</code> · <code>src/components/ViewerSwitch/ViewerSwitch.js</code>',
    demo: `
      <div id="theme-switch">
        ${renderVariantRow('type theme · dark (달 활성)', renderThemeSwitch({ theme: 'dark' }))}
        ${renderVariantRow('type theme · light (태양 활성)', renderThemeSwitch({ theme: 'light' }))}
      </div>
      <div id="viewer-switch">
        ${renderVariantRow('type viewer · jukebox (column 활성)', renderViewerSwitch({ layout: 'jukebox' }))}
        ${renderVariantRow('type viewer · grid (펼쳐 보기)', renderViewerSwitch({ layout: 'grid' }))}
      </div>
    `,
    tables: [
      {
        title: 'type',
        columns: ['type', '값', '보이는 곳'],
        rows: [
          ['theme', 'dark · light', '헤더. 썸이 우(달) / 좌(태양)'],
          ['viewer', 'jukebox · grid', 'Timeline · By type. Favorites · Page Scrap에는 없음']
        ]
      },
      {
        title: '간격 · 모서리 (공통)',
        columns: ['자리', '값', 'Foundation'],
        rows: [
          ['트랙', '64 × 32', '가로 calc(--space-8 * 2) · 세로 --space-8'],
          ['inset', '4px', '--space-1'],
          ['썸', '24px', 'calc(--space-8 - 2 * --space-1)'],
          ['아이콘', '1rem', '--text-base와 같은 길이'],
          ['트랙 radius', 'pill', '--radius-pill'],
          ['썸 radius', 'circle', '--radius-circle'],
          ['focus', 'outline 2px --color-primary', 'offset 2px'],
          ['hover', '핸들만', '트랙과 아이콘은 그대로']
        ]
      },
      {
        title: '색 (Atomic을 직접 씀)',
        columns: ['자리', 'Dark', 'Light'],
        rows: [
          ['트랙', '--grey-dark-5', '--grey-light-4'],
          ['핸들', '--grey-dark-6', '--grey-light-2'],
          ['핸들 hover', '--grey-dark-7', '--grey-light-1'],
          ['비활성 아이콘', '--grey-dark-8 · opacity 0.55', '--grey-light-9'],
          ['theme 활성 아이콘', '달 --primary-2', '태양 --primary-3'],
          ['viewer 아이콘', 'column / grid', '같은 트랙 색. 활성만 아이콘이 바뀜']
        ]
      }
    ],
    notes: [
      'Lab에서는 type 하나로 묶지만, 런타임 파일은 ThemeSwitch.js와 ViewerSwitch.js로 나뉩니다. 저장하는 값(테마 / 갤러리 레이아웃)이 달라 한 함수로 합치지 않았습니다.',
      '트랙 단계는 각 모드의 --color-bg와 같습니다(dark-5 / light-4). 그래도 Semantic을 쓰지 않습니다. 스위치 자신의 data-theme이 페이지 테마와 다를 수 있어서입니다.',
      '활성 태양은 --primary-3입니다. 라이트 --color-primary는 --primary-4라 같은 토큰이 아닙니다. 활성 달은 다크 --color-primary(--primary-2)와 같습니다.',
      'viewer의 펼쳐 보기는 태그별 한 줄입니다. PC에서 카드가 많으면 gap을 줄여 겹칩니다. 배치 상세는 Foundation / Breakpoint의 Jukebox 행입니다.'
    ]
  });
}

function noteInfoPage() {
  return renderLabPage({
    id: 'note-info',
    group: 'Component',
    title: 'NoteInfoPanel',
    lede: '주크박스 하단 정보입니다. 노트명, Icon Button 다섯 개(공유 · 즐겨찾기 · 수정 · 페이지 추가 · 삭제), 메모(최대 3줄 · 70자)를 세로로 쌓습니다.',
    files: '<code>src/components/NoteInfoPanel/NoteInfoPanel.js</code> · <code>NoteInfoPanel.css</code>',
    demo: [
      renderVariantRow(
        '모바일 (도구모음 기본 노출, 메모 숨김)',
        renderNoteInfoPanel(NOTE, 'period', { canEdit: true, compact: true }),
        { stageClass: 'ui-lab__demo-stage--info' }
      ),
      `<div class="ui-lab__demo-stage ui-lab__demo-stage--info">${renderNoteInfoPanel(
        { ...NOTE, id: 'ui-lab-demo-note-desktop' },
        'period',
        { canEdit: true }
      )}</div>`,
      renderVariantRow(
        '그리드 툴팁 (.grid-note-tooltip)',
        `<div class="ui-lab__grid-tooltip-demo jukebox-card">${renderNoteInfoPanel(
          { id: 'ui-lab-demo-note-tooltip', title: NOTE.title, description: '툴팁에서는 메모를 숨긴다' },
          'period',
          { canEdit: true, variant: 'tooltip' }
        )}</div>`,
        { stageClass: 'ui-lab__demo-stage--info' }
      ),
      renderVariantRow(
        '그리드 시트 (.grid-focus-info)',
        renderNoteInfoPanel(
          { id: 'ui-lab-demo-note-sheet', title: NOTE.title, description: '시트에서는 메모를 숨긴다' },
          'period',
          { canEdit: true, variant: 'sheet' }
        ),
        { stageClass: 'ui-lab__demo-stage--info' }
      )
    ].join(''),
    tables: [
      {
        title: 'Props · States',
        columns: ['이름', '값', '비고'],
        rows: [
          ['variant', '기본 · tooltip · sheet', '주크박스 / 그리드 호버 / 그리드 클릭 시트'],
          ['compact', 'true', 'Lab 모바일 프리뷰. 메모 숨김'],
          ['canEdit', 'true', '수정 · 페이지 추가 · 삭제 노출'],
          ['메모', '최대 3줄 · 70자', '모바일·시트·툴팁에서는 숨김']
        ]
      },
      {
        title: '간격 · 모서리 · 글자 · 색',
        columns: ['자리', '값', 'Foundation'],
        rows: [
          ['패널 gap', '16px', '--space-4'],
          ['제목–도구모음', '8px', '--space-2'],
          ['도구모음 gap', '4px', '--space-1'],
          ['도구모음 높이', '32px', '--space-8'],
          ['데스크톱 margin-bottom', '48px', '--space-12'],
          ['모바일 margin-bottom', '12px', '--space-3'],
          ['제목', '24px semibold · 자간 -2px', '--text-xl · --font-semibold · --color-text'],
          ['메모', '12px thin · line 1.5 · 너비 248px', '--text-xs · --font-thin · --color-text'],
          ['툴팁 padding', '8px 12px', '--space-2 --space-3'],
          ['툴팁 radius', '8px', '--radius-md'],
          ['툴팁 배경', '--color-overlay-dark', '알파. Atomic 단색 아님'],
          ['툴팁 그림자', '--shadow-md', '--shadow-md'],
          ['즐겨찾기 on', '--color-primary', 'Button ghost 위']
        ]
      }
    ],
    notes: [
      '데스크톱 패널 높이는 제목 1줄 + gap + 도구모음 32px + 메모 3줄이 잘리지 않게 고정하고, 내용은 위에서부터 쌓습니다. 최소 높이는 --jukebox-focus-info-min-h입니다.',
      '버튼 다섯 개의 shape·아이콘·색은 Button 페이지를 따릅니다.',
      '그리드 데스크톱은 호버 툴팁, 모바일·타블렛은 카드 클릭 시 하단 시트입니다. 시트 기본은 숨김입니다.',
      '제목 자간 -2px와 메모 너비 248px는 토큰이 없습니다.'
    ]
  });
}

function toastPage() {
  return renderLabPage({
    id: 'toast',
    group: 'Component',
    title: 'Toast',
    lede: '짧은 상태 메시지를 화면 하단 가운데에 잠깐 띄웁니다. 버튼은 실제 토스트를 엽니다.',
    files: '<code>src/components/Toast/Toast.js</code> · <code>Toast.css</code>',
    demo: `
      <div class="ui-lab__row">
        ${renderButton({
          shape: 'solid',
          content: '토스트 보기',
          className: 'ui-lab-demo-solid',
          dataset: { lab: 'toast' }
        })}
      </div>
    `,
    tables: [
      {
        title: '간격 · 모서리 · 글자 · 색',
        columns: ['속성', '값', 'Foundation'],
        rows: [
          ['위치', 'bottom 48px · 가로 중앙', '--space-12'],
          ['padding', '12px 20px', '--space-3 --space-5'],
          ['radius', 'pill', '--radius-pill'],
          ['배경', '--color-chrome-strong', '테마 무관 어두운 크롬'],
          ['글자', '--text-sm · --font-medium', '--color-chrome-on'],
          ['그림자', '--shadow-md', 'Shadow'],
          ['z-index', '5000', '뷰어·다이얼로그보다 위. 토큰 없음']
        ]
      }
    ],
    notes: [
      '등장 시 opacity 0→1, translateY 1rem→0, 0.25s입니다. 모션 토큰은 없습니다.',
      '폭은 내용에 맞춥니다. 브레이크포인트가 없습니다.',
      '포인터 이벤트는 받지 않습니다.'
    ]
  });
}

function menuPage() {
  return renderLabPage({
    id: 'menu',
    group: 'Component',
    title: 'Menu',
    lede: '갤러리 상단 메뉴입니다. 뷰 전환(Timeline · By type · Favorites · Page Scrap), FilterChip, Dropdown을 한 줄로 묶습니다. 칩과 드롭다운의 상태 표는 자식 페이지에 있습니다.',
    files: '<code>src/components/FilterSubMenu/FilterSubMenu.js</code> · <code>FilterSubMenu.css</code>',
    demo: `
      <div class="ui-lab__filter-preview">
        <aside class="sub-menu">
          <nav class="sub-nav">
            <div class="view-mode-toggle">
              <a class="view-mode-link active" href="/timeline" data-link>Timeline</a>
              <a class="view-mode-link" href="/by-type" data-link>By type</a>
              <a class="view-mode-link" href="/favorites" data-link>Favorites</a>
              <a class="view-mode-link" href="/page-scrap" data-link>Page Scrap</a>
            </div>
            <ul class="filter-list">
              <li class="filter-item">${renderChip({ label: '전체', count: 42, active: true, dataset: { 'lab-chip': 'menu' } })}</li>
              <li class="filter-item">${renderChip({ label: 'After School', count: 19, dataset: { 'lab-chip': 'menu' } })}</li>
              <li class="filter-item">${renderChip({ label: 'Diary', count: 8, dataset: { 'lab-chip': 'menu' } })}</li>
            </ul>
            ${renderDropdown({
              id: 'lab-filter-sort',
              className: 'filter-sort__dropdown',
              label: '기본순',
              value: 'default',
              options: [
                { value: 'default', label: '기본순' },
                { value: 'name', label: '이름순' },
                { value: 'recent', label: '최신순' }
              ]
            })}
          </nav>
        </aside>
      </div>
    `,
    tables: [
      {
        title: '간격 · 모서리 · 글자 · 색',
        columns: ['자리', '값', 'Foundation'],
        rows: [
          ['갤러리 위치', 'top 16px · 가로 중앙', '--space-4. fixed'],
          ['뷰 모드 gap / padding', '4px', '--space-1'],
          ['뷰 모드 탭 padding', '4px 12px', '--space-1 --space-3'],
          ['뷰 모드 글자', '--text-sm · --font-medium', '기본 --color-text-dim'],
          ['뷰 모드 활성', '--color-primary 배경', '--color-primary-on · --font-bold'],
          ['뷰 모드 radius', 'pill', '--radius-pill'],
          ['칩 목록 gap', '8px', '--space-2'],
          ['정렬 칩 배경', '--color-bg-alt', '열림·선택 --color-surface-hover'],
          ['칩 · 정렬 목록', 'FilterChip · Dropdown', '자식 페이지']
        ]
      }
    ],
    notes: [
      '데스크톱은 화면 상단 중앙, 너비 ≤768px 또는 높이 ≤768px에서는 헤더(로고·햄버거) 바로 아래입니다.',
      '모바일에서는 정렬 드롭다운을 숨기고 FilterChip 모바일 레이아웃을 씁니다.',
      '캐러셀을 스크롤하면 필터가 접힙니다.',
      '뷰 전환 목록이 Menu의 본체이고, FilterChip과 Dropdown은 그 안의 자식입니다. 상태·간격 표는 각 자식 페이지에 있습니다.',
      '실사용 위치는 <a href="/timeline" data-link>Timeline</a> · <a href="/by-type" data-link>By type</a>에서 확인합니다. 갤러리에서는 #sub-menu에 고정됩니다.'
    ]
  });
}

const DIALOG_TABLES = [
  {
    title: '껍데기',
    columns: ['자리', '값', 'Foundation'],
    rows: [
      ['바깥 padding', '20px', '--space-5'],
      ['패널 padding', '24px, ≤640px는 20px', '--space-6 / --space-5'],
      ['패널 radius', '12px', '--radius-lg'],
      ['패널 배경', '--color-bg-alt', 'Color'],
      ['패널 그림자', '--shadow-lg', 'Shadow'],
      ['패널 너비', 'min(600px, 100%)', '좁은 확인은 min(420px, 100%)'],
      ['제목', '--text-xl · --font-bold · 자간 -0.02em', '--color-text'],
      ['부제', '--text-sm', '--color-text-muted'],
      ['본문 gap', '16px', '--space-4'],
      ['헤더 margin', '20px', '--space-5'],
      ['닫기 inset', '12px', '--space-3 · Button close ghost'],
      ['딤', '--color-overlay', 'Dim solid. 알파'],
      ['푸터 gap', '12px', '--space-3. 보조 위 · 주요 아래 1열']
    ]
  }
];

function dialogPage() {
  return renderLabPage({
    id: 'dialog',
    group: 'Component',
    title: 'Dialog',
    lede: '모달 껍데기입니다. 딤, 패널, 제목, 우상단 닫기, 아래 1열 액션을 공유합니다. 업로드 결과 버튼은 실제 다이얼로그를 엽니다.',
    files: '<code>src/components/Dialog/Dialog.js</code> · <code>Dialog.css</code> · <code>src/components/Dim/Dim.css</code> · <code>src/components/Confirm/Confirm.js</code>',
    demo: [
      renderVariantRow(
        'Confirm · 페이지 추가 확인',
        renderAddPagesConfirm({
          titleId: 'lab-add-page-confirm',
          className: 'dialog--inline',
          noteName: LAB_ADD_PAGE_NOTE
        }),
        { flow: false, stageClass: 'ui-lab__demo-stage--dialog' }
      ),
      renderVariantRow(
        '업로드 결과 — 성공 / 일부만 저장 / 실패',
        [
          renderButton({ shape: 'solid', content: '성공', className: 'ui-lab-demo-solid', dataset: { lab: 'upload-ok' } }),
          renderButton({ shape: 'solid', content: '일부만 저장', className: 'ui-lab-demo-solid', dataset: { lab: 'upload-partial' } }),
          renderButton({ shape: 'solid', content: '실패', className: 'ui-lab-demo-solid', dataset: { lab: 'upload-fail' } })
        ].join('')
      )
    ].join(''),
    tables: DIALOG_TABLES,
    notes: [
      '푸터 액션은 보조(text block)가 위, 주요(solid)가 아래입니다. 버튼 색과 padding은 Button 페이지를 따릅니다.',
      '업로드 결과 본문은 --text-base --color-text, 상세는 --text-sm --color-text-muted입니다.',
      '드로어 딤은 Dim blur로 --color-overlay-soft이고, 모달 딤은 Dim solid로 --color-overlay입니다.',
      '폼이 들어 있는 모달은 Add 페이지에서 type(note · bookmark · page)으로 봅니다. 단계 표시는 Step, 입력은 Field입니다.'
    ]
  });
}

const FIELD_TABLE = {
  title: 'FormField (모달 안 입력)',
  columns: ['자리', '값', 'Foundation'],
  rows: [
    ['라벨', '--text-sm', '--color-text-muted'],
    ['입력 padding', '8px 12px', '--space-2 --space-3'],
    ['입력 글자', '--text-base', '--color-text'],
    ['입력 면', '--color-bg · 보더 --color-border', '--radius-md'],
    ['focus 보더', '--color-primary', 'outline 2px --color-primary (스와치)'],
    ['힌트', '--text-xs', '--color-text-dim'],
    ['오류', '--color-error-text', 'Status'],
    ['색 스와치', '--radius-pill', '선택 링 --color-primary']
  ]
};

function renderAddStep(currentStep) {
  const items = [
    [1, '표지'],
    [2, '사용'],
    [3, '메모']
  ]
    .map(([n, label]) => {
      const current = n === currentStep;
      const done = n < currentStep;
      const cls = [current ? 'is-current' : '', done ? 'is-done' : ''].filter(Boolean).join(' ');
      return `<li${cls ? ` class="${cls}"` : ''}${current ? ' aria-current="step"' : ''}><span class="add-note-progress__index">${n}</span>${label}</li>`;
    })
    .join('');
  return `<ol class="add-note-progress" aria-label="노트 작성 단계">${items}</ol>`;
}

function addPage() {
  return renderLabPage({
    id: 'add',
    group: 'Component',
    title: 'Add',
    lede: '추가 모달입니다. type으로 노트, 북마크, 페이지를 나눕니다. 단계 표시는 Step, 입력칸은 Field입니다. 아래는 업로드 없이 채운 정적 데모입니다.',
    files: '<code>src/components/AddNoteFab/AddNoteFab.js</code> · <code>src/components/AddBookmarkNoteModal/AddBookmarkNoteModal.js</code> · <code>src/components/AddPageModal/AddPageModal.js</code>',
    demo: [
      renderVariantRow(
        'type note · 표지',
        renderLabAddNoteModal({ titleId: 'lab-add-note-cover', idPrefix: 'lab-add-note-1', step: 1 }),
        { flow: false, stageClass: 'ui-lab__demo-stage--dialog' }
      ),
      renderVariantRow(
        'type note · 사용 정보',
        renderLabAddNoteModal({ titleId: 'lab-add-note-usage', idPrefix: 'lab-add-note-2', step: 2 }),
        { flow: false, stageClass: 'ui-lab__demo-stage--dialog' }
      ),
      renderVariantRow(
        'type note · 메모',
        renderLabAddNoteModal({ titleId: 'lab-add-note-notes', idPrefix: 'lab-add-note-3', step: 3 }),
        { flow: false, stageClass: 'ui-lab__demo-stage--dialog' }
      ),
      renderVariantRow(
        'type note · 추가한 노트 확인',
        renderAddNoteViewConfirm({ titleId: 'lab-add-note-view', className: 'dialog--inline' }),
        { flow: false, stageClass: 'ui-lab__demo-stage--dialog' }
      ),
      renderVariantRow(
        'type bookmark · 이름 · 표지 · 메모',
        renderAddBookmarkNoteModal({
          titleId: 'lab-add-bookmark',
          className: 'dialog--inline',
          seed: { name: '여행 스크랩', memo: '여행 중 마음에 든 페이지만 모아 둡니다.' },
          coverFrontPreviewUrl: bookmarksCoverFront,
          coverBackPreviewUrl: bookmarksCoverBack,
          submitDisabled: false
        }),
        { flow: false, stageClass: 'ui-lab__demo-stage--dialog' }
      ),
      renderVariantRow(
        'type bookmark · 저장 위치',
        renderBookmarkNotePicker({
          titleId: 'lab-bookmark-picker',
          className: 'dialog--inline',
          destinations: [
            { id: BOOKMARKS_NOTE_ID, title: 'Bookmark Note', pageCount: 12, remaining: 38, full: false, isDefault: true },
            { id: `${BOOKMARKS_NOTE_ID}:trip`, title: '여행 스크랩', pageCount: 50, remaining: 0, full: true, isDefault: false }
          ]
        }),
        { flow: false, stageClass: 'ui-lab__demo-stage--dialog' }
      ),
      renderVariantRow(
        'type page · 소스 선택',
        renderAddPageModal({ titleId: 'lab-add-page-pick', className: 'dialog--inline', step: 'pick' }),
        { flow: false, stageClass: 'ui-lab__demo-stage--dialog' }
      ),
      renderVariantRow(
        'type page · 파일 폼 (변환중)',
        renderAddPageModal({
          titleId: 'lab-add-page-converting',
          className: 'dialog--inline',
          step: 'form',
          source: 'pdf',
          fileName: '책 2026년 6월 4일.pdf',
          fileSize: '10.2MB',
          fileChip: 'converting',
          uploadDisabled: true
        }),
        { flow: false, stageClass: 'ui-lab__demo-stage--dialog' }
      ),
      renderVariantRow(
        'type page · 파일 폼 (완료·미리보기)',
        renderAddPageModal({
          titleId: 'lab-add-page-pdf',
          className: 'dialog--inline',
          step: 'form',
          source: 'pdf',
          existingCount: 0,
          allPagesPrivate: true,
          pages: [
            { id: 'lab-add-page-pdf-1', dataUrl: bookmarksCoverFront, pageNumber: 1 },
            { id: 'lab-add-page-pdf-2', dataUrl: bookmarksCoverBack, pageNumber: 11 }
          ],
          startPage: 1,
          showFirstCoverCheck: true,
          showLastCoverCheck: true,
          firstPageIsCover: true,
          lastPageIsCover: false,
          uploadDisabled: false,
          uploadCount: 11,
          fileName: '책 2026년 6월 4일.pdf',
          fileSize: '10.2MB',
          fileChip: 'done'
        }),
        { flow: false, stageClass: 'ui-lab__demo-stage--dialog' }
      )
    ].join(''),
    tables: [
      {
        title: 'type',
        columns: ['type', '화면', '파일'],
        rows: [
          ['note', '표지 → 사용 → 메모, 그다음 확인', 'AddNoteFab.js'],
          ['bookmark', '이름·표지·메모 한 화면, 또는 저장 위치 피커', 'AddBookmarkNoteModal.js · BookmarkNotePicker.js'],
          ['page', '소스 선택 다음 PDF·이미지 폼', 'AddPageModal.js']
        ]
      },
      {
        title: 'bookmark 목록',
        columns: ['자리', '값', 'Foundation'],
        rows: [
          ['설명', '--text-sm', '--color-text-muted'],
          ['항목 gap', '8px', '--space-2'],
          ['보조 글자', '--text-xs', '--color-text-muted'],
          ['가득 참', '--color-error-text', '비활성'],
          ['메모 제한', '100자', '토큰 아님'],
          ['권 제한', '최대 10권 · 권당 50장', '토큰 아님']
        ]
      },
      {
        title: 'page 소스 카드 · 변환 칩',
        columns: ['자리', '값', 'Foundation'],
        rows: [
          ['카드 padding', '16px 12px', '--space-4 --space-3'],
          ['카드 radius', '12px', '--radius-lg'],
          ['카드 면', '--color-bg · 보더 --color-border', 'hover 보더 --color-primary · 배경 --color-surface-hover'],
          ['카드 제목', '--text-base · --font-semibold', '--color-text'],
          ['카드 설명', '--text-xs', '--color-text-dim'],
          ['변환 칩 padding', '4px 8px', '--space-1 --space-2'],
          ['변환 칩 글자', '--text-xs · --font-semibold', '--color-text-muted']
        ]
      }
    ],
    notes: [
      'Lab에서는 type 하나의 부모로 보지만, 런타임 파일은 노트·북마크·페이지로 나뉩니다. 저장하는 대상이 달라 한 모달 함수로 합치지 않았습니다.',
      '패널 크기·제목·푸터 1열은 Dialog와 같습니다.',
      'note의 단계 점 색과 크기는 Step, 입력칸은 Field를 봅니다.',
      'note는 헤더 데스크톱 우측, 모바일 드로어의 「새 노트 추가」로 엽니다. ≤640px에서 커버·입력·푸터가 1열로 스택됩니다.',
      'bookmark는 Page Scrap 맨 뒤 + 카드에서 엽니다. 페이지 북마크는 남은 자리가 있는 권을 고릅니다.',
      'page의 소스 선택은 설명과 PDF/이미지 카드만 있고 푸터 액션은 없습니다. 확인 다이얼로그는 Dialog 페이지에 있습니다.',
      '스테이지 안 제출·닫기는 정적 데모라 동작하지 않습니다.'
    ]
  });
}

function stepPage() {
  return renderLabPage({
    id: 'step',
    group: 'Component',
    title: 'Step',
    lede: 'Add의 자식입니다. type note가 표지 · 사용 · 메모로 넘어갈 때 쓰는 단계 표시입니다.',
    files: '<code>src/components/AddNoteFab/AddNoteFab.css</code>의 <code>.add-note-progress</code>',
    demo: [
      renderVariantRow('1 표지 (현재)', renderAddStep(1)),
      renderVariantRow('2 사용 (현재, 1은 완료)', renderAddStep(2)),
      renderVariantRow('3 메모 (현재, 1·2는 완료)', renderAddStep(3))
    ].join(''),
    tables: [
      {
        title: '상태',
        columns: ['상태', '글자', '번호 원'],
        rows: [
          ['다가올 단계', '--color-text-dim', '보더 --color-border · 배경 없음'],
          ['현재', '--color-text · --font-semibold', '배경 --color-primary · 글자 --color-primary-on · 보더 --color-primary'],
          ['완료', '--color-text-muted', '배경 --color-surface-selected · 글자 --color-text · 보더 --color-border']
        ]
      },
      {
        title: '간격 · 모서리 · 글자',
        columns: ['자리', '값', 'Foundation'],
        rows: [
          ['줄 gap', '8px', '--space-2'],
          ['번호와 라벨 gap', '4px', '--space-1'],
          ['번호 원', '1.25rem', '--space-5. CSS는 1.25rem 리터럴'],
          ['번호 radius', 'circle', '--radius-circle'],
          ['글자', '--text-xs · --font-semibold', '번호는 tabular-nums']
        ]
      }
    ],
    notes: [
      'bookmark와 page에는 이 3단계 표시가 없습니다. note 전용입니다.',
      '현재 단계만 aria-current="step"입니다.'
    ]
  });
}

function fieldPage() {
  return renderLabPage({
    id: 'field',
    group: 'Component',
    title: 'Field',
    lede: 'Add의 자식입니다. 모달 안 입력은 FormField이고, type으로 text · textarea · select · 색 스와치를 나눕니다.',
    files: '<code>src/components/FormField/FormField.js</code> · <code>FormField.css</code>',
    demo: [
      renderVariantRow(
        'text',
        renderField({
          label: '이름',
          name: 'lab-field-name',
          required: true,
          placeholder: '예: 2026_업무노트',
          value: '카툰연습장',
          hint: '권 이름'
        })
      ),
      renderVariantRow(
        'textarea',
        renderField({
          type: 'textarea',
          label: '메모',
          name: 'lab-field-notes',
          value: '카툰 연습용. 표지부터 뒷장까지 한 권으로 이어 그린다.',
          maxLength: 70,
          rows: 3
        })
      ),
      renderVariantRow(
        'select',
        renderField({
          type: 'select',
          label: '노트 종류',
          name: 'lab-field-type',
          value: '스케치북',
          placeholder: '종류',
          options: ['스케치북', '다이어리', '플래너']
        })
      ),
      renderVariantRow(
        'colorRadioGroup',
        renderField({
          type: 'colorRadioGroup',
          label: '색',
          name: 'lab-field-color',
          value: '노랑',
          colors: NOTE_COLOR_NAMES,
          colorMap: NOTE_COLOR_PAINT,
          lightNames: [...LIGHT_NOTE_COLORS]
        })
      )
    ].join(''),
    tables: [FIELD_TABLE],
    notes: [
      '색 이름과 페인트는 테마 토큰이 아닙니다. 노트 표지 색을 흉내 낸 값입니다.',
      '오류 글자는 --color-error-text입니다. 입력 보더가 오류일 때의 별도 토큰은 없습니다.',
      'date처럼 네이티브 피커가 열리는 입력은 label로 감싸지 않고 for로 연결합니다.'
    ]
  });
}

function renderViewerStage(inner, attrs = '') {
  return `
    <div class="ui-lab__viewer-stage note-image-viewer"${attrs ? ` ${attrs}` : ''}>
      <div class="ui-lab__viewer-page" aria-hidden="true">페이지 이미지</div>
      ${inner}
    </div>`;
}

function viewerPage() {
  const live = isLocalDemoEnabled()
    ? `<div class="ui-lab__live-viewer note-image-viewer" data-lab="demo-note-viewer"></div>`
    : '';
  return renderLabPage({
    id: 'viewer',
    group: 'Component',
    title: 'Viewer',
    lede: '노트 페이지를 보는 화면입니다. 라우트 /note/:id는 NoteImageViewer만 씁니다. 좌우 이동·하단 시트·액션 열은 자식 Nav · Sheet · Actions입니다.',
    files: '<code>src/components/NoteImageViewer/NoteImageViewer.js</code> · <code>ViewerChrome.js</code> · <code>NoteImageViewer.css</code>',
    demo: `
      <ul class="ui-lab__list">
        <li><a href="/" data-link>주크박스에서 노트 열어 뷰어 확인</a></li>
        ${
          isLocalDemoEnabled()
            ? `<li><a href="/note/${DEMO_NOTE_ID}" data-link>Demo Note 전체 페이지</a> — 표지 + 흰 페이지 9장</li>`
            : '<li>Demo Note는 <code>npm run dev</code> 로컬에서만 붙습니다</li>'
        }
      </ul>
      ${live}
      ${renderViewerStage(renderViewerChrome(), 'data-lab="viewer-chrome"')}
    `,
    tables: [
      {
        title: '자식',
        columns: ['이름', '자리', 'Button'],
        rows: [
          ['Nav', '이미지 좌우', 'circle M · navPrev / navNext'],
          ['Sheet', '하단', 'circle S · ghost. 처음 · 현재/전체 · 마지막 · 원상복구'],
          ['Actions', '우측 열', 'circle S · ghost. 원본 · 정보 · 추가 · 북마크 · 공유 · 2페이지']
        ]
      },
      {
        title: '면',
        columns: ['자리', '값', 'Foundation'],
        rows: [
          ['모달 배경', '--color-overlay', 'Color. 알파'],
          ['전체 페이지', '--radius-none', '헤더 여백 없음'],
          ['이미지', '--radius-sm', '--color-drop-shadow'],
          ['시트 padding', '4px 8px', '--space-1 --space-2'],
          ['시트 gap · radius', '4px · pill', '--space-1 · --radius-pill'],
          ['시트 배경', '--color-surface-hover', '알파'],
          ['액션 열 padding · radius', '4px · 12px', '--space-1 · --radius-lg'],
          ['진행 글자', '--text-sm', '--color-chrome-on'],
          ['버튼 글자색', '--color-chrome-on', 'ghost여도 뷰어 안에서는 흰색'],
          ['hover · focus', '--color-surface-active', '아이콘 버튼']
        ]
      }
    ],
    notes: [
      '로컬에서는 Demo Note 뷰어를 실제로 띄웁니다. 홀수 장이라 뒷표지 안쪽에 회색 가상 페이지가 있습니다.',
      '아래 크롬 스테이지는 정적입니다. 눌러도 페이지는 넘어가지 않습니다.',
      'PdfModal.js의 renderNoteDetailPage는 라우터에 연결되어 있지 않습니다. 이미지 뷰어가 레이아웃 클래스 일부를 PdfModal.css에서 가져옵니다.',
      '크롬 색은 테마가 바뀌어도 --color-chrome*를 유지합니다. 라이트 모드에서도 어두운 컨트롤입니다.',
      '공유 링크는 <code>/note/{slug}?p=N</code>입니다. 닫기는 circle close ghost이고, X · Esc · 여백으로 닫습니다.',
      '키보드: ←/→ 페이지 · S 양면 · +/− 확대 · 0 원상복구 · Esc 닫기.'
    ]
  });
}

function viewerNavPage() {
  return renderLabPage({
    id: 'viewerNav',
    group: 'Component',
    title: 'Nav',
    lede: 'Viewer의 자식입니다. 이미지 좌우의 이전·다음입니다. circle M이고, 다음은 같은 아이콘을 반전합니다.',
    files: '<code>src/components/NoteImageViewer/ViewerChrome.js</code>의 <code>renderNavButtons</code>',
    demo: renderViewerStage(renderNavButtons()),
    tables: [
      {
        title: '간격 · 색',
        columns: ['자리', '값', 'Foundation'],
        rows: [
          ['크기', 'circle M 48px', '--space-12. Button 페이지'],
          ['좌우 여백', '12px', '--space-3'],
          ['세로', '가운데', 'top 50%'],
          ['배경', '--color-chrome', 'hover는 흰 면'],
          ['아이콘', '--color-chrome-on', 'MingCute left']
        ]
      }
    ],
    notes: [
      '다음 버튼은 마지막 장에서 is-at-end만 붙고, 클릭하면 토스트를 띄웁니다.',
      '너비 ≤640px에서는 투명도 0.85입니다.'
    ]
  });
}

function viewerSheetPage() {
  return renderLabPage({
    id: 'viewerSheet',
    group: 'Component',
    title: 'Sheet',
    lede: 'Viewer의 자식입니다. 하단 가운데의 처음 · 현재/전체 · 마지막 · 뷰 원상복구입니다.',
    files: '<code>src/components/NoteImageViewer/ViewerChrome.js</code>의 <code>renderBottomSheet</code>',
    demo: renderViewerStage(renderBottomSheet(), 'data-lab="viewer-chrome"'),
    tables: [
      {
        title: '간격 · 모서리 · 글자 · 색',
        columns: ['자리', '값', 'Foundation'],
        rows: [
          ['padding', '4px 8px', '--space-1 --space-2'],
          ['gap', '4px', '--space-1'],
          ['radius', 'pill', '--radius-pill'],
          ['배경', '--color-surface-hover', '알파. blur 14px'],
          ['진행 글자', '--text-sm', '--color-chrome-on. 현재 장만 bold'],
          ['버튼', 'circle S · ghost', '32px --space-8. 글자색 --color-chrome-on']
        ]
      }
    ],
    notes: [
      '하단 여백은 14px와 safe-area 중 큰 값입니다. 14px는 space 토큰이 아닙니다.',
      '원상복구는 확대·이동을 처음 크기와 위치로 되돌립니다.'
    ]
  });
}

function viewerActionsPage() {
  return renderLabPage({
    id: 'viewerActions',
    group: 'Component',
    title: 'Actions',
    lede: 'Viewer의 자식입니다. 우측 세로 열입니다. 원본 노트, 페이지 정보, 페이지 추가, 북마크, 링크 복사, 2페이지 보기입니다.',
    files: '<code>src/components/NoteImageViewer/ViewerChrome.js</code>의 <code>renderSheetActions</code>',
    demo: renderViewerStage(renderSheetActions()),
    tables: [
      {
        title: '간격 · 모서리 · 색',
        columns: ['자리', '값', 'Foundation'],
        rows: [
          ['padding · gap', '4px', '--space-1'],
          ['radius', '12px', '--radius-lg'],
          ['배경', '--color-surface-hover', '알파. blur 10px'],
          ['버튼', 'circle S보다 약간 큼', '2.35rem. space 토큰 없음'],
          ['글자색', '--color-chrome-on', 'hover · focus --color-surface-active'],
          ['우측 여백', '12px', '--space-3와 같은 12px. CSS는 max(12px, safe-area)']
        ]
      }
    ],
    notes: [
      '페이지 추가는 로그인(auth-only)일 때만 동작합니다.',
      '모바일 북마크는 이 열 위 FAB로 나오고, 열 안의 북마크는 숨깁니다.',
      '2페이지 토글은 3D 책장(BookFlip3D)으로 바꿉니다. WebGL이 없으면 2D 양면입니다.',
      '페이지 정보에서 여는 메타 모달의 삭제 글자는 --color-error-text, 보더는 --color-error, hover 배경은 --color-error-bg입니다.'
    ]
  });
}


function pageHeaderPage() {
  return renderLabPage({
    id: 'page-header',
    group: 'Component',
    title: 'PageHeader',
    lede: '이 화면 위쪽 막대가 실제 PageHeader입니다. Lab 안에 두 번째 헤더를 그리면 같은 id가 겹치므로, 라이브 헤더를 렌더로 둡니다.',
    files: '<code>src/widgets/PageHeader/PageHeader.js</code> · <code>PageHeader.css</code> · <code>src/pages/Login/Login.js</code>',
    demo: `
      <ul class="ui-lab__list">
        <li>데스크톱: 로고, Timeline/By type일 때 Switch(type viewer), Switch(type theme), Login/Logout, 로그인 시 새 노트 추가.</li>
        <li>너비 ≤768px 또는 높이 ≤768px: 로고와 햄버거. 메뉴는 우측 드로어.</li>
        <li><a href="/login" data-link>/login</a>에서 편집 세션을 엽니다.</li>
      </ul>
    `,
    tables: [
      {
        title: '간격 · 모서리 · 글자 · 색',
        columns: ['자리', '값', 'Foundation'],
        rows: [
          ['padding', '16px 32px', '--space-4 --space-8'],
          ['너비', 'calc(100% - 48px)', '--space-12'],
          ['배경', '--color-bg', 'Color'],
          ['하단 모서리', '48px 리터럴', 'radius 토큰 아님. 숫자는 --space-12와 같음'],
          ['모바일 모서리', '0', '--radius-none'],
          ['내비 링크 padding', '8px 16px', '--space-2 --space-4'],
          ['내비 radius', 'pill', '--radius-pill'],
          ['내비 글자', '--color-text-muted', 'hover·현재 --color-text · 배경 --color-surface-active / selected'],
          ['그룹 gap', '8px', '--space-2'],
          ['드로어 배경', '--color-bg-alt', '딤은 --color-overlay-soft'],
          ['높이', '80px', '토큰 없음. .app-main padding-top과 맞춤']
        ]
      }
    ],
    notes: [
      'Login/Logout·햄버거는 PageHeader 전용 버튼입니다. 공통 Button shape로 바꾸지 않습니다. 색은 위 내비 토큰을 따릅니다.',
      '새 노트 추가는 Button text이고, ≤1024px 또는 열이 좁으면 아이콘만 남습니다.',
      '헤더의 두 pill은 Switch의 type theme / viewer입니다. 수치는 Switch 페이지에 있습니다.',
      '높이 ≤768px이면 너비와 상관없이 햄버거 레이아웃입니다.'
    ]
  });
}

const PAGES = {
  button: buttonPage,
  menu: menuPage,
  filterChip: filterChipPage,
  dropdown: dropdownPage,
  switch: switchPage,
  noteInfoPanel: noteInfoPage,
  viewer: viewerPage,
  viewerNav: viewerNavPage,
  viewerSheet: viewerSheetPage,
  viewerActions: viewerActionsPage,
  add: addPage,
  step: stepPage,
  field: fieldPage,
  dialog: dialogPage,
  toast: toastPage,
  pageHeader: pageHeaderPage
};

/**
 * @param {string} id
 * @returns {string}
 */
export function renderComponentPage(id) {
  const render = PAGES[id];
  return render ? render() : '';
}
