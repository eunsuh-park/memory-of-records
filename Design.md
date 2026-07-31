# Design

Memory of Records의 UI는 바닐라 JS 컴포넌트와 CSS 변수(토큰) 위에 쌓여 있으며, 화면마다 필요한 조각을 `src/components`, `src/widgets`, `src/pages`에서 가져와 조합합니다. 컴포넌트 리뷰용 화면은 메인 네비에 두지 않고 `/ui-lab` 링크로만 열 수 있는 **UI Component Lab**이며, 이 문서는 그 Lab과 함께 쓰는 설계 메모입니다.

---

## 폴더 역할

`components`는 여러 화면에서 다시 쓰는 UI 조각이고, `widgets`는 PageHeader처럼 앱 셸에 가깝게 붙는 단위이며, `pages`는 라우트가 직접 렌더하는 화면 조합입니다. `services`는 Notion·Cloudinary·인증 API 호출을 모으고, `styles`에는 전역 토큰을 둡니다. 큰 폴더 이사 없이 이 규칙만 맞추면 이후 로그인·편집 UI를 어디에 둘지 판단하기 쉽습니다.

---

## 들어가는 길

내부에서 컴포넌트를 훑을 때는 브라우저 주소로 `/ui-lab`에 들어가거나, 푸터에 작게 둔 UI Lab 링크를 쓰면 됩니다. Lab은 atomic·semantic 토큰 스와치와 일부 인터랙티브 데모(Button·Toast 등)를 보여 주고, Cloudinary·Notion에 붙는 모달·뷰어는 실제 Notes 흐름으로 안내합니다. 편집 기능은 `/login`에서 관리자 비밀번호로 연 세션이 있을 때만 열리도록 가드되어 있습니다.

---

## 디자인 토큰

색의 기준은 `src/styles/colors.css`에 두 층으로 모았습니다. **Atomic**은 테마와 무관한 원시 스케일(`--grey-0`…`--grey-1000`, `--yellow-400`/`--yellow-600`, `--red-*`)이고, **Semantic**은 dark/light 블록에서 `--color-bg`, `--color-text`, `--color-primary`처럼 역할 이름을 atomic에 연결합니다. 테마 전환은 semantic이 가리키는 atomic만 바꾸면 되고, 컴포넌트는 semantic을 쓰면 됩니다. 테마의 저장·적용은 `src/utils/theme.js`가 `localStorage` 키 `mor-theme`과 `data-theme` 속성을 다루며, 헤더의 테마 토글이 이를 호출합니다. 레거시 별칭(`--app-*`, `--primary-color` 등)도 semantic에 이어 두었습니다.

다크에서 배경은 `--grey-800`/`--grey-750`을, 라이트에서는 `--grey-100`/`--grey-150`을 `--color-bg` / `--color-bg-alt`로 씁니다. Primary는 다크에서 `--yellow-400`, 라이트에서 `--yellow-600`이며, 그 위 글자는 `--color-primary-on`(`--grey-850`)입니다. 텍스트·서피스·오버레이처럼 알파가 섞인 값은 시각을 유지하기 위해 semantic에 rgba로 두되, 단색 배경·브랜드·잉크는 grey/yellow atomic을 참조합니다. 라이트에서는 글자 `text-shadow`를 전역으로 끄고 바닥 반사는 쓰지 않습니다.

폰트 스택은 system-ui 계열이며, 앱 셸은 헤더 높이와 고정 푸터(48px)를 전제로 `App.css`가 메인 영역을 잡습니다. 새 UI를 넣을 때는 `--color-*`를 먼저 쓰고, 필요하면 atomic을 확장한 뒤 semantic에 연결하는 순서를 권합니다.

---

## 인증 (요약)

보기는 공개이고, 고치기는 공유 관리자 비밀번호와 HttpOnly 쿠키 세션(`mor_session`)으로 막습니다. 서버는 `api/auth.js`, 클라이언트는 `src/services/auth.js`이며, 환경 변수는 `ADMIN_PASSWORD`와 `AUTH_SECRET`입니다. 로그인 UI는 `/login`(`src/pages/Login/`)이고, 노트 추가·수정·페이지 추가·페이지 메타 수정 진입 전에 `requireAuth()`가 세션을 확인합니다.

---

## 컴포넌트와 파일

**Button**은 `src/components/Button/Button.js`와 `Button.css`로, `render({ variant, ariaLabel, content, … })`가 HTML 문자열을 돌려 주는 공통 버튼 팩토리입니다. `back` · `backInline` · `navPrev` · `navNext` · `icon` · `toolbar` variant가 있으며, 모달 닫기·뷰어 화살표·시트 아이콘 등 여러 화면이 여기를 거칩니다.

**Toast**는 `src/components/Toast/Toast.js`와 `Toast.css`에 있고, `showToast(message)`로 짧은 피드백을 띄웁니다.

**Footer**는 `src/components/Footer/Footer.js` · `Footer.css`로 모든 페이지 하단에 고정됩니다. 카피라이트와 함께 UI Lab으로 가는 작은 링크만 두어, 제품 네비와 분리한 진입점을 유지합니다.

**PageHeader**(위젯)는 `src/widgets/PageHeader/PageHeader.js` · `PageHeader.css`입니다. 데스크톱에서는 로고·FilterSubMenu 자리·테마·Login/Logout·Story를 한 줄로 두고, 모바일에서는 중앙 로고·햄버거·접이식 필터·우측 드로어로 바뀝니다.

**FilterSubMenu**는 `src/components/FilterSubMenu/FilterSubMenu.js` · `FilterSubMenu.css`로 Timeline/By type의 시기·타입 탭과 정렬 UI를 그립니다. 헤더 중앙 `#sub-menu`에 주입되며, 모바일에서는 접힌 채로 캐러셀을 방해하지 않도록 동작합니다.

**AddNoteFab**은 `src/components/AddNoteFab/AddNoteFab.js` · `AddNoteFab.css`에 노트 추가 FAB와 생성·수정 모달이 함께 있습니다. 열기 전에 로그인 가드를 탑니다.

**AddPageModal**은 `src/components/AddPageModal/AddPageModal.js`와 공통 스타일 `AddPageModal.css`로 PDF/이미지 페이지 추가를 처리합니다. `insertAfterPage`로 현재 페이지 다음에 삽입할 수 있습니다. 같은 폴더의 **PageMetaModal**(`PageMetaModal.js`)은 읽기 전용으로 연 뒤, 수정 모드 진입 시에만 로그인을 요구합니다. 삭제 버튼은 준비 중 토스트만 띄웁니다.

**NoteImageViewer**는 `src/components/NoteImageViewer/NoteImageViewer.js` · `NoteImageViewer.css`로 Cloudinary 페이지 이미지를 보여 줍니다. 하단 시트와 페이지 번호 롱프레스 부채꼴 메뉴(페이지 추가)가 여기에 있습니다.

**PdfModal**은 `src/components/PdfModal/PdfModal.js` · `PdfModal.css`로 PDF 폴백 뷰어이자 뷰어 레이아웃 스타일의 기반입니다.

---

## 페이지 조합

**Jukebox**(`src/pages/Notes/Jukebox.js` · `Jukebox.css`)는 Timeline/By type이 공유하는 노트 캐러셀 본체입니다. **Story**는 헤더를 숨긴 풀스크린 서사 페이지이고, **Login**은 `/login`, **UI Lab**은 `/ui-lab`입니다. 라우트 표는 `src/router.js`에 있습니다.

아이콘 SVG 문자열은 `src/assets/mingcuteIcons.js`에 모아 두었습니다.

---

## 리뷰할 때

새 UI를 넣을 때는 `colors.css`의 atomic·semantic을 먼저 보고, 버튼은 Button variant로 맞출 수 있는지 확인한 뒤, 모달·토스트·뷰어 패턴을 재사용하는 순서를 권합니다. 화면 단위 점검은 `/ui-lab`에서 토큰과 원자 컴포넌트를 보고, 편집 흐름은 로그인 후 Notes·뷰어에서 이어서 보면 됩니다.
