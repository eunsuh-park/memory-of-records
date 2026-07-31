# Design

Memory of Records의 UI는 바닐라 JS 컴포넌트와 CSS 변수(토큰) 위에 쌓여 있으며, 화면마다 필요한 조각을 `src/components`, `src/widgets`, `src/pages`에서 가져와 조합합니다. 컴포넌트 리뷰용 화면은 메인 네비에 두지 않고 `/ui-lab` 링크로만 열 수 있는 **UI Component Lab**이며, 이 문서는 그 Lab과 함께 쓰는 설계 메모입니다.

---

## 들어가는 길

내부에서 컴포넌트를 훑을 때는 브라우저 주소로 `/ui-lab`에 들어가거나, 푸터에 작게 둔 UI Lab 링크를 쓰면 됩니다. Lab은 토큰 스와치와 일부 인터랙티브 데모(Button·Toast 등)를 보여 주고, Cloudinary·Notion에 붙는 모달·뷰어는 실제 Notes 흐름으로 안내합니다. 이 파일(`Design.md`)은 저장소 루트에 두었으므로 코드 리뷰·온보딩 때 문장으로 맥락을 읽기 위한 용도입니다.

---

## 디자인 토큰

색과 서피스의 기준은 `src/styles/colors.css`에 모았습니다. 기본은 다크이고, `html[data-theme="light"]`일 때 라이트 팔레트로 바뀝니다. 테마의 저장·적용은 `src/utils/theme.js`가 `localStorage` 키 `mor-theme`과 `data-theme` 속성을 다루며, 헤더의 테마 토글이 이를 호출합니다. 전역 타이포·리셋·기본 링크/버튼 규칙은 `src/index.css`와 `src/App.css`가 담당하고, 레거시 별칭(`--app-*`, `--primary-color` 등)도 colors.css에서 `--color-*`로 이어 줍니다.

### 색상 (다크 기준값)

배경은 `--color-bg`(`#29323f`)와 `--color-bg-alt`(`#2f3847`)로 층을 나눕니다. 본문·보조·희미한 글자는 각각 `--color-text`, `--color-text-muted`, `--color-text-dim`이며 흰 계열 알파로 위계를 줍니다. 호버·액티브·선택 서피스는 `--color-surface-hover` / `--color-surface-active` / `--color-surface-selected`입니다.

액센트는 `--color-primary`(`#ffd966`)이고, 그 위 글자·아이콘은 대비를 위해 `--color-primary-on`(`#1c242c`)을 씁니다. 호버 시 회색 계열로 바뀌는 자리에는 `--color-primary-hover`가 있습니다. 경계선은 `--color-border`와 `--color-border-light`, 모달 딤은 `--color-overlay` 계열(`--color-overlay-dark` · `--color-overlay-medium` · `--color-overlay-light`)과 뷰어 로딩용 `--color-viewer-loading`을 둡니다. 오류는 `--color-error` / `--color-error-bg`, 그림자는 `--color-shadow-sm` · `--color-shadow` · `--color-shadow-lg`와 `--color-drop-shadow`입니다. 주크박스 바닥 반사·가장자리 페이드는 `--color-reflect`, `--color-fade-edge` 그라데이션 토큰으로 표현합니다.

라이트 테마에서는 배경이 `#e8ebe9` 계열로 바뀌고 primary는 `#c4a035`에 가깝게 내려가며, 텍스트는 짙은 잉크(`rgba(28, 36, 44, …)`)로 뒤집힙니다. 라이트에서는 글자 `text-shadow`를 전역으로 끄고, 바닥 반사는 쓰지 않습니다.

### 기타 리듬

폰트 스택은 system-ui 계열이며, 앱 셸은 헤더 높이(데스크톱 약 80px, 모바일에서 더 큼)와 고정 푸터(48px)를 전제로 `App.css`가 메인 영역을 잡습니다. 개별 컴포넌트가 rem·고정 px를 섞어 쓰므로, 새 UI를 넣을 때는 가능하면 `--color-*` / `--app-*`를 먼저 쓰고 하드코딩 색을 줄이는 편이 안전합니다.

---

## 컴포넌트와 파일

**Button**은 `src/components/Button/Button.js`와 `Button.css`로, `render({ variant, ariaLabel, content, … })`가 HTML 문자열을 돌려 주는 공통 버튼 팩토리입니다. `back` · `backInline` · `navPrev` · `navNext` · `icon` · `toolbar` variant가 있으며, 모달 닫기·뷰어 화살표·시트 아이콘 등 여러 화면이 여기를 거칩니다.

**Toast**는 `src/components/Toast/Toast.js`와 `Toast.css`에 있고, `showToast(message)`로 짧은 피드백을 띄웁니다. 삭제 준비 중 안내나 업로드 결과처럼, 폼을 막지 않는 일회성 메시지에 씁니다.

**Footer**는 `src/components/Footer/Footer.js` · `Footer.css`로 모든 페이지 하단에 고정됩니다. 카피라이트와 함께 UI Lab으로 가는 작은 링크만 두어, 제품 네비와 분리한 진입점을 유지합니다.

**TopNavigation**은 `src/components/TopNavigation/TopNavigation.js` · `TopNavigation.css`에 남아 있는 상단 네비 조각으로, 현재 주 헤더는 PageHeader가 맡는 구조입니다. 레거시 레이아웃·로고 뒤로가기 패턴을 볼 때 이 파일을 함께 보면 됩니다.

**PageHeader**(위젯)는 `src/widgets/PageHeader/PageHeader.js` · `PageHeader.css`입니다. 데스크톱에서는 로고·FilterSubMenu 자리·테마·Story를 한 줄로 두고, 모바일에서는 중앙 로고·햄버거·접이식 필터·우측 드로어로 바뀝니다. 테마 아이콘과 드로어 상태는 이 위젯이 직접 조율합니다.

**FilterSubMenu**는 `src/components/FilterSubMenu/FilterSubMenu.js` · `FilterSubMenu.css`로 Timeline/By type의 시기·타입 탭과 정렬 UI를 그립니다. 헤더 중앙 `#sub-menu`에 주입되며, 모바일에서는 접힌 채로 캐러셀을 방해하지 않도록 동작합니다. 실데이터와 붙인 모습은 Notes 페이지에서만 온전히 확인할 수 있습니다.

**AddNoteFab**은 `src/components/AddNoteFab/AddNoteFab.js` · `AddNoteFab.css`에 노트 추가 FAB와 생성·수정 모달이 함께 있습니다. 표지 업로드, 시기/타입, 컬러칩, 업로드 로티 등 노트 메타 입력 UX의 중심이며, 모달 오버레이 클래스는 AddPage 계열과도 스타일을 나눕니다.

**AddPageModal**은 `src/components/AddPageModal/AddPageModal.js`와 공통 스타일 `AddPageModal.css`로 PDF/이미지 페이지 추가를 처리합니다. 맨 뒤 이어 붙이기뿐 아니라 `insertAfterPage`로 현재 페이지 다음에 삽입할 수 있고, 그때는 API로 뒤 페이지 번호를 밀어 올립니다. 같은 폴더의 **PageMetaModal**(`PageMetaModal.js`)은 페이지 정보를 먼저 읽기 전용으로 보여 주고, 수정 모드에서 날짜·OCR·visible을 바꾸며 OCR 옆 리셋으로 저장값을 되돌립니다. 삭제 버튼은 아직 실제 삭제가 아니라 준비 중 토스트만 띄웁니다.

**NoteImageViewer**는 `src/components/NoteImageViewer/NoteImageViewer.js` · `NoteImageViewer.css`로 Cloudinary 페이지 이미지를 한 장(또는 양면)씩 보여 줍니다. 하단 시트, 페이지 번호 롱프레스 부채꼴 메뉴(현재는 페이지 추가), 줌·패닝·숨김 페이지 스킵이 여기에 모여 있고, `/note/:id` 전체 페이지와 주크박스 모달 양쪽에서 쓰입니다.

**PdfModal**은 `src/components/PdfModal/PdfModal.js` · `PdfModal.css`로, `pdf_folder_url`이 없는 노트를 위한 PDF 폴백 뷰어이자 뷰어 레이아웃 스타일의 기반이기도 합니다. NoteImageViewer가 일부 클래스를 재사용합니다.

---

## 페이지 조합

**Jukebox**(`src/pages/Notes/Jukebox.js` · `Jukebox.css`)는 Timeline/By type이 공유하는 노트 캐러셀·포커스 패널·모바일 카드 액션의 본체입니다. **Timeline**과 **ByType**은 필터 키만 달리 Jukebox를 띄우는 진입점이고, **Story**(`src/pages/Story/Story.js` · `Story.css`)는 헤더를 숨긴 풀스크린 서사 페이지입니다. 라우트 표는 `src/router.js`에 있으며, UI Lab은 `/ui-lab`로만 등록되어 제품 IA 밖 링크로 유지됩니다.

아이콘 SVG 문자열은 `src/assets/mingcuteIcons.js`에 모아 두었고, 노트 액션·헤더 등에서 재사용합니다.

---

## 리뷰할 때

새 UI를 넣을 때는 색을 직접 쓰기보다 `colors.css` 토큰을 먼저 보고, 버튼은 Button variant로 맞출 수 있는지 확인한 뒤, 모달·토스트·뷰어처럼 이미 있는 오버레이 패턴을 재사용하는 순서를 권합니다. 화면 단위 점검은 `/ui-lab`에서 토큰과 원자 컴포넌트를 보고, 데이터에 묶인 흐름은 Notes·뷰어 실사용 경로에서 이어서 보면 이 문서의 파일 참조와 맞물립니다.
