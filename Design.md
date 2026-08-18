# Design

Memory of Records의 UI는 바닐라 JS 컴포넌트와 CSS 변수(토큰) 위에 쌓여 있으며, 화면마다 필요한 조각을 `src/components`, `src/widgets`, `src/pages`에서 가져와 조합합니다. 컴포넌트 리뷰용 화면은 메인 네비에 두지 않고 `/ui-lab` 링크로만 열 수 있는 **UI Component Lab**이며, 이 문서는 그 Lab과 함께 쓰는 설계 메모입니다.

---

## 폴더 역할

`components`는 여러 화면에서 다시 쓰는 UI 조각이고, `widgets`는 PageHeader처럼 앱 셸에 가깝게 붙는 단위이며, `pages`는 라우트가 직접 렌더하는 화면 조합입니다. `services`는 Notion·Cloudinary·인증 API 호출을 모으고, `styles`에는 전역 토큰을 둡니다. 큰 폴더 이사 없이 이 규칙만 맞추면 이후 로그인·편집 UI를 어디에 둘지 판단하기 쉽습니다.

`services`에는 **네트워크를 타는 것만** 둡니다. 옵션·라벨처럼 정적인 상수는 `src/data/`(`periodOptions.js`, `typeOptions.js`, `storyContent.js`)에, 로티 JSON 같은 정적 에셋은 `src/assets/`에, 일회성 마이그레이션 입력 데이터는 `scripts/data/`에 둡니다.

---

## 들어가는 길

내부에서 컴포넌트를 훑을 때는 브라우저 주소로 `/ui-lab`에 들어가거나, 푸터에 작게 둔 UI Lab 링크를 쓰면 됩니다. Lab은 atomic·semantic 토큰 스와치와 일부 인터랙티브 데모(Button·Toast 등)를 보여 주고, Cloudinary·Notion에 붙는 모달·뷰어는 실제 Notes 흐름으로 안내합니다. 편집 기능은 `/login`에서 관리자 비밀번호로 연 세션이 있을 때만 열리도록 가드되어 있습니다.

---

## 디자인 토큰

색의 기준은 `src/styles/colors.css`에 두 층으로 모았습니다. **Atomic**은 테마와 무관한 원시 스케일이고, **Semantic**은 dark/light 블록에서 `--color-bg`, `--color-text`, `--color-primary`처럼 역할 이름을 atomic 단계에 연결합니다. 테마 전환은 semantic이 가리키는 단계만 바꾸면 되고, 컴포넌트는 semantic만 쓰면 됩니다. 테마의 저장·적용은 `src/utils/theme.js`가 `localStorage` 키 `mor-theme`과 `data-theme` 속성을 다루며, 헤더의 테마 토글이 이를 호출합니다. 레거시 별칭(`--app-*`, `--primary-color`, 그리고 이전 이름인 `--grey-0`·`--yellow-400`·`--red-400` 등)도 semantic에 이어 두었습니다.

Atomic은 그레이를 테마별 전용 12단계로 나눠 `--grey-light-1`…`--grey-light-12`와 `--grey-dark-1`…`--grey-dark-12`를 두고, 브랜드 `--primary-1`…`--primary-6`과 상태 `--red-1`…`--red-6`을 두 테마가 나눠 씁니다. 두 그레이 스케일 모두 1이 배경에 가장 가까운 단계이고 12가 대비가 가장 큰 본문 텍스트 단계이며, 1–3 배경 / 4–6 서피스 / 7–9 라인·구분 / 10–12 텍스트 순으로 쓰면 됩니다. 원시 스케일은 전부 `:root`에 있어 어떤 테마에서도 값을 읽을 수 있고, `/ui-lab`의 Atomic tokens 섹션이 이 스케일을 그대로 보여 줍니다.

Semantic은 다크에서 배경에 `--grey-dark-5`/`--grey-dark-6`, 텍스트에 `--grey-dark-12`/`11`/`10`, 라인에 `--grey-dark-8`을 쓰고, 라이트에서는 같은 자리에 `--grey-light-4`/`5`, `--grey-light-12`/`11`/`10`, `--grey-light-8`을 씁니다. Primary는 다크에서 `--primary-3`, 라이트에서 `--primary-5`이며 그 위 글자는 `--color-primary-on`(`--grey-dark-3`)입니다. 다만 이미지·모달 위에 겹쳐 깔리는 역할(`--color-surface-*`, `--color-overlay-*`, `--color-shadow-*`, `--color-chrome-*`)은 합성이 목적이므로 단색 단계 대신 알파 값을 그대로 둡니다. 라이트에서는 글자 `text-shadow`를 전역으로 끄고 바닥 반사는 쓰지 않습니다.

### 다크/라이트 전환 규칙

새 토큰을 만들 때는 먼저 아래 표에서 어느 그룹에 해당하는지 정하고 값을 고릅니다.

| 토큰 그룹 | 전환 규칙 |
|---|---|
| `--color-bg`, `--color-bg-alt` | 각 테마 grey 스케일의 배경대. 다크는 5·6, 라이트는 4·5 |
| `--color-text`, `-muted`, `-dim` | 각 테마 grey 10·11·12 — 테마가 바뀌어도 스케일 내 상대 위치는 고정 |
| `--color-border` | 두 테마 모두 grey 8단계 |
| `--color-primary` | 다크 `primary-3`, 라이트 `primary-5`. `-on`은 두 테마 모두 `grey-dark-3` 고정 |
| `--color-overlay-*`, `--color-shadow-*`, `--color-surface-*` | 합성이 목적이라 grey 참조 대신 테마별 알파값을 직접 정의 |
| `--color-chrome-*` | 두 테마 값이 **동일**. 스캔 이미지 위에 얹혀 항상 어두운 배경을 전제하는 것들(뷰어 시트·화살표)의 의도적 예외 |

의도적 예외가 하나 더 있습니다. Story의 데스크톱 책 지면(`--color-book-*`, `--white`/`--grey-light-*` 직접 참조)은 테마와 무관하게 "종이"여야 해서 semantic을 쓰지 않습니다. 타블렛(≤1024px) 이하에서 책형 장식을 버릴 때 앱 테마 토큰으로 전환합니다.

### Radius

`src/styles/sizes.css`에 스케일을 두고 CSS의 `border-radius`는 전부 여기를 참조합니다. px를 유지하는 값입니다 — 글자 크기에 따라 라운드가 같이 커지면 오히려 부자연스럽습니다.

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `--radius-none` | 0 | 라운드를 의도적으로 없애는 곳 |
| `--radius-sm` | 4px | 인라인 코드·미니 버튼·스크롤바 |
| `--radius-md` | 8px | 폼 입력·카드·패널 기본 |
| `--radius-lg` | 12px | 모달 패널·데모 스테이지 등 큰 면 |
| `--radius-xl` | 16px | Story 책 프레임, Login 패널 |
| `--radius-pill` | 999px | 칩·토스트·테마 토글 |
| `--radius-circle` | 50% | 원형 버튼(FAB·네비·툴바) |

정리 과정에서 확인한 이상치 두 곳: `PageHeader.css`의 `99px`는 `999px` 오타로 판단해 `--radius-pill`로, `NoteImageViewer.css`의 `1.15rem !important`는 16px에 가까워 `--radius-xl`로 흡수했습니다.

### Spacing / Shadow

Spacing은 4px(0.25rem) 그리드의 rem 스케일입니다. `--space-1`(4px) · `-2`(8px) · `-3`(12px) · `-4`(16px) · `-5`(20px) · `-6`(24px) · `-8`(32px) · `-10`(40px) · `-12`(48px) · `-16`(64px). rem으로 통일해 둔 이유는 나중에 `@media`에서 `html { font-size }`만 조정하면 전체 여백을 한 번에 스케일할 수 있게 열어 두려는 것입니다(지금은 조정하지 않아 사실상 px와 1:1).

대략적인 용도는 `1` 아이콘·라벨 간격 / `2` 버튼 내부·작은 그룹 / `3` 폼 필드 사이 / `4` 카드 내부 / `5`–`6` 섹션 내부 / `8` 섹션 사이 / `10`–`16` 페이지 여백입니다. 흩어져 있던 `0.45rem`·`0.65rem`·`0.85rem` 류는 화면을 보면서 가장 가까운 단계로 흡수했습니다.

Shadow는 offset/blur를 px로 유지하고 색만 기존 `--color-shadow*`를 재사용합니다. `--shadow-sm`(`0 2px 8px`, 헤더·작은 부양) · `--shadow-md`(`0 4px 16px`, FAB·토스트·떠 있는 패널) · `--shadow-lg`(`0 16px 48px`, 모달) 세 단계로, 이전에 6가지 이상이던 조합을 여기로 모았습니다.

### 타이포그래피

한글 가독성을 위해 **Pretendard Variable**을 self-host로 씁니다. npm 패키지(`pretendard`)를 설치하고 `src/main.js`에서 `pretendard/dist/web/variable/pretendardvariable.css`를 import하면 Vite가 woff2를 번들에 넣습니다. CDN을 쓰지 않는 것은 외부 의존성을 없애고 버전을 고정하기 위함이며, variable 폰트라 파일 하나로 전체 weight를 커버합니다.

스택은 `--font-sans`(Pretendard → system-ui 폴백)와 `--font-mono` 두 개뿐이고, CSS에서 `font-family`를 직접 쓰는 곳은 없습니다. Jukebox에 있던 `'Noto Sans KR'` 선언은 폰트 파일을 로드하지 않는 죽은 선언이라 제거했습니다.

타입 스케일은 `--text-xs`(0.75rem) · `-sm`(0.85rem) · `-base`(1rem) · `-md`(1.1rem) · `-lg`(1.25rem) · `-xl`(1.5rem) · `-2xl`(2rem) · `-3xl`(2.5rem)의 8단계이고, 예외로 `--text-2xs`(0.55rem)를 두었습니다. 2xs는 크기가 고정된 마이크로 라벨(모바일 헤더 칩 80×28, 푸터 고지, Lab의 토큰 값 표기)에만 쓰고 본문에는 쓰지 않습니다. Weight는 `--font-regular`/`-medium`/`-semibold`/`-bold`(400/500/600/700) 네 단계이며, 이전에 있던 `650`·`300`·`bold` 키워드는 가까운 단계로 흡수했습니다.

앱 셸은 헤더 높이와 고정 푸터(48px)를 전제로 `App.css`가 메인 영역을 잡습니다. 새 UI를 넣을 때는 `--color-*`·`--space-*`·`--radius-*`·`--text-*`를 먼저 쓰고, 필요하면 atomic을 확장한 뒤 semantic에 연결하는 순서를 권합니다.

---

## 반응형 기준

뷰포트는 실제 CSS가 쓰는 값을 기준으로 **Mobile ≤768px · iPad 769–1024px · Desktop ≥1025px** 세 구간으로 봅니다. 모바일 안에서는 640px(모달·뷰어), 600px(필터 라벨 축약), 480px(주크박스 카드) 하위 단계가 추가로 쓰입니다. iPad 구간에 전용 규칙이 있는 것은 FilterSubMenu(치수 축소), Jukebox(상단 여백), Story(책 → 단일 열 전환) 셋뿐이고 나머지 컴포넌트는 데스크톱 레이아웃을 그대로 씁니다.

구조가 실제로 갈라지는 곳은 세 군데입니다. PageHeader는 768px 아래에서 한 줄 레이아웃이 세로 스택 + 햄버거 + 우측 드로어로 바뀌고, FilterSubMenu는 같은 지점에서 접이식 상단 네비가 되며 주크박스에서는 2줄 고정 그리드로 다시 바뀝니다. Jukebox는 중앙 카드를 데스크톱에서는 클릭 즉시 뷰어로 열지만 모바일에서는 보기/채우기 오버레이를 먼저 띄웁니다. 이 두 곳만 JS가 `matchMedia('(max-width: 768px)')`로 분기하고, 나머지는 전부 CSS로만 반응합니다.

컴포넌트별로 어떤 값이 어떻게 달라지는지는 `/ui-lab`의 Responsive 섹션에 정리해 두었고, 현재 창 폭에 해당하는 열이 강조됩니다.

---

## 인증 (요약)

보기는 공개이고, 고치기는 공유 관리자 비밀번호와 HttpOnly 쿠키 세션(`mor_session`)으로 막습니다. 서버는 `api/auth.js`, 클라이언트는 `src/services/auth.js`이며, 환경 변수는 `ADMIN_PASSWORD`와 `AUTH_SECRET`입니다. 로그인 UI는 `/login`(`src/pages/Login/`)이고, 노트 추가·수정·페이지 추가·페이지 메타 수정 진입 전에 `requireAuth()`가 세션을 확인합니다.

---

## 컴포넌트와 파일

**Button**은 `src/components/Button/Button.js`와 `Button.css`로, `render({ shape, … })`가 HTML 문자열을 돌려 주는 공통 버튼 팩토리입니다. 분류 축은 **형태(shape)**이고 세 갈래뿐입니다.

- `shape: 'circle'` — 원형 아이콘 버튼. `size`(`l` 52px / `m` 48px·모바일 44px / `s` 32px)와 `role`(`fab` · `back` · `navPrev` · `navNext` · `toolbar` · `close`)을 조합하고, `tone: 'ghost'`로 배경 없는 버전을 만듭니다. 모달 닫기 버튼이 circle S / close / ghost입니다.
- `shape: 'solid'` — 배경이 채워진 일반 버튼. 폼 제출(노트 만들기, 로그인, 페이지 업로드)이 여기입니다.
- `shape: 'text'` — 배경 없는 회색 텍스트 버튼. hover 시 색만 진해집니다. 아직 실사용처는 없고 골격만 있습니다.

두 가지는 규칙으로 못 박아 뒀습니다(`.cursor/rules/ui-buttons.mdc`). 버튼은 `<button>`을 직접 쓰지 않고 항상 이 팩토리를 거치며, 아이콘 버튼의 내용은 공용 MingCute 세트(`src/assets/mingcuteIcons.js`)에서만 가져옵니다. 컴포넌트 파일에 SVG를 직접 적거나 파일마다 `ICONS` 상수를 만들지 않고, 세트에 없는 아이콘은 세트에 추가한 뒤 이름으로 참조합니다. 아이콘 크기는 `Button.css`가 정합니다(circle 기본 1.25rem, role별 override).

Chip/Pill은 버튼이 아니라 필터링 상태를 나타내는 요소로 보고 Button에 넣지 않았습니다(아래 FilterChip).

**Tab**은 `src/components/Tab/Tab.js` · `Tab.css`로, Timeline / By type / Favorites처럼 같은 계층의 뷰를 고르는 텍스트 탭입니다. 상태는 default · hover · pressed(클릭 순간) · selected 네 가지이고, selected는 노란 글자·배경 없음입니다. hover/pressed 오버레이는 `--color-tab-hover` · `--color-tab-pressed`입니다. `render()`는 한 칸, `renderList()`는 가로 묶음입니다. FilterSubMenu의 보기 전환이 이걸 씁니다.

**FilterChip**은 `src/components/FilterChip/FilterChip.js` · `FilterChip.css`로, 라벨 + 개수 + 선택 상태(`.is-active`)를 가진 탭형 칩입니다. `--m`/`--s` 두 사이즈가 있고 좁은 화면용 짧은 라벨(`labelMobile`)을 함께 받습니다. FilterSubMenu의 시기·타입 탭이 이걸 씁니다.

**Select**는 `src/components/Select/Select.js` · `Select.css`로 `<select>` 마크업을 통합했습니다. `render()`는 필드 하나를, `renderOptions()`는 옵션 문자열만 돌려주어 FormField가 자기 컨트롤 안에 끼워 쓸 수 있게 합니다. `tone: 'pill'`은 FilterSubMenu의 정렬 드롭다운용입니다.

**Dim**은 `src/components/Dim/Dim.js` · `Dim.css`로 화면을 덮는 배경 레이어 하나입니다. `tone: 'solid'`(모달 딤)와 `'blur'`(드로어 백드롭, blur 포함) 두 톤이고, opacity 페이드는 기본입니다. z-index는 컨텍스트마다 달라서 하드코딩하지 않고 `--dim-z` 변수로 받습니다. 이전에 서로 다른 값으로 세 벌 구현돼 있던 딤(`add-note-overlay` · `pdf-overlay` · `nav-drawer-backdrop`)을 여기로 모았습니다.

**Dialog**는 `src/components/Dialog/Dialog.js` · `Dialog.css`로 모달 껍데기(Dim + 패널 + 헤더 + 닫기 버튼 + 본문 슬롯)입니다. `open()`이 오버레이를 DOM에 붙이고 `{ overlay, close }`를 돌려 주며, `canClose`/`onEscape`/`onClose`로 저장 중 닫기 방지 같은 예외를 열어 둡니다. 패널 너비 등 개별 차이는 `className`·`panelClassName`로 오버라이드합니다. 이전에 5곳(AddNoteFab 2, AddPageModal 2, PageMetaModal 1)이 각자 마크업으로 중복 구현하던 부분입니다.

**FormField**는 `src/components/FormField/FormField.js` · `FormField.css`로 `label + 라벨 텍스트 + 입력요소` 구조를 통합합니다. 타입은 `text`/`password`/`date`/`textarea`/`select`(Select와 연결)/`colorRadioGroup`/`custom`이고, 마지막 `custom`은 날짜+체크박스처럼 한 필드에 여러 컨트롤이 들어가는 경우에 씁니다. 폼 레이아웃 클래스(`.form`, `.form-row--2/3`)와 체크박스(`.form-check`), 상태 메시지(`.form-status`)도 여기에 있습니다. 흩어져 있던 `login-*`·`add-note-*` 개별 클래스명은 정리했습니다.

**FileUploadPreview**는 `src/components/FileUploadPreview/FileUploadPreview.js` · `FileUploadPreview.css`로 파일 선택 버튼(`renderPicker`)과 순서 변경·삭제가 붙은 미리보기 리스트(`renderList`)입니다. 지금은 AddPageModal 한 곳에서만 쓰지만 경계는 독립적으로 뒀습니다.

**NoteInfoPanel**은 `src/components/NoteInfoPanel/NoteInfoPanel.js` · `NoteInfoPanel.css`로 주크박스 중앙 노트의 정보 표시영역입니다. 데스크톱/모바일 마크업 분기(`__desktop`/`__mobile`)를 그대로 유지한 채 Jukebox에서 떼어냈습니다.

**NoteDetailPage**는 `src/components/NoteDetailPage/NoteDetailPage.js` · `NoteDetailPage.css`로 PdfModal과 NoteImageViewer가 페이지 모드(모달이 아닌 라우트)로 열릴 때 공유하는 껍데기와 진입 애니메이션입니다. `render(inner)`로 감싸고 `mount(el)`로 애니메이션을 시작합니다.

**Toast**는 `src/components/Toast/Toast.js`와 `Toast.css`에 있고, `showToast(message)`로 짧은 피드백을 띄웁니다.

**Footer**는 `src/components/Footer/Footer.js` · `Footer.css`로 모든 페이지 하단에 고정됩니다. 카피라이트와 함께 UI Lab으로 가는 작은 링크만 두어, 제품 네비와 분리한 진입점을 유지합니다.

**PageHeader**(위젯)는 `src/widgets/PageHeader/PageHeader.js` · `PageHeader.css`입니다. 데스크톱에서는 로고·FilterSubMenu 자리·테마·Login/Logout·Story를 한 줄로 두고, 모바일에서는 중앙 로고·햄버거·접이식 필터·우측 드로어로 바뀝니다. 드로어 백드롭은 Dim(blur)이고, 드로어 자체는 Dialog 구조가 아니라 Dim만 재사용합니다. 아이콘은 테마별로 SVG를 두 벌 두지 않고 `currentColor`로 색을 받습니다.

**FilterSubMenu**는 `src/components/FilterSubMenu/FilterSubMenu.js` · `FilterSubMenu.css`로 Timeline/By type의 시기·타입 탭과 정렬 UI를 그립니다. 보기 전환(Timeline | By type | Favorites)은 Tab 컴포넌트입니다. 헤더 중앙 `#sub-menu`에 주입되며, 모바일에서는 접힌 채로 캐러셀을 방해하지 않도록 동작합니다.

**AddNoteFab**은 `src/components/AddNoteFab/AddNoteFab.js` · `AddNoteFab.css`에 노트 추가 FAB와 생성·수정 모달이 함께 있습니다. 열기 전에 로그인 가드를 탑니다. FAB는 Button circle L / fab, 제출은 Button solid, 모달은 Dialog, 필드는 FormField를 쓰므로 `AddNoteFab.css`에는 표지 미리보기와 업로드 중 오버레이만 남았습니다.

**AddPageModal**은 `src/components/AddPageModal/AddPageModal.js`와 공통 스타일 `AddPageModal.css`로 PDF/이미지 페이지 추가를 처리합니다. `insertAfterPage`로 현재 페이지 다음에 삽입할 수 있습니다. 같은 폴더의 **PageMetaModal**(`PageMetaModal.js`)은 읽기 전용으로 연 뒤, 수정 모드 진입 시에만 로그인을 요구합니다. 삭제 버튼은 준비 중 토스트만 띄웁니다. 두 파일은 모달 껍데기를 Dialog로 옮긴 뒤로 서로 공유하는 코드가 없지만, 스타일 시트(`AddPageModal.css`)를 아직 함께 쓰고 있어 폴더는 분리하지 않았습니다.

**NoteImageViewer**는 `src/components/NoteImageViewer/NoteImageViewer.js` · `NoteImageViewer.css`로 Cloudinary 페이지 이미지를 보여 줍니다. 컨트롤 마크업은 `ViewerChrome.js`로 분리했고, 좌우 페이지 이동은 circle M / navPrev·navNext, 하단 시트(정보 · 페이지 추가 · 처음/마지막 이동 · 뷰 원상복구)는 circle S / toolbar / ghost, 양면 토글은 circle S / toolbar입니다. 아이콘은 전부 MingCute 세트에서 가져오고, `/ui-lab`의 뷰어 크롬 데모가 같은 함수를 재사용합니다.

**PdfModal**은 `src/components/PdfModal/PdfModal.js` · `PdfModal.css`로 PDF 폴백 뷰어이자 뷰어 레이아웃 스타일의 기반입니다.

---

## 페이지 조합

**Jukebox**(`src/pages/Notes/Jukebox.js` · `Jukebox.css`)는 Timeline/By type이 공유하는 노트 캐러셀 본체입니다. **Story**는 헤더를 숨긴 풀스크린 서사 페이지이고, **Login**은 `/login`, **UI Lab**은 `/ui-lab`입니다. 라우트 표는 `src/router.js`에 있습니다.

아이콘 SVG 문자열은 `src/assets/mingcuteIcons.js`에 모아 두었습니다.

---

## 리뷰할 때

새 UI를 넣을 때는 `styles/colors.css`·`styles/sizes.css`의 토큰을 먼저 보고, 버튼은 Button의 shape 세 갈래로 맞출 수 있는지, 모달은 Dialog로 감쌀 수 있는지, 폼은 FormField로 그릴 수 있는지 확인한 뒤 나머지를 새로 만드는 순서를 권합니다. 화면 단위 점검은 `/ui-lab`에서 토큰과 원자 컴포넌트를 보고, 편집 흐름은 로그인 후 Notes·뷰어에서 이어서 보면 됩니다.
