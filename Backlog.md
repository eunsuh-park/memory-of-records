# Backlog

Memory of Records — 요청·아이디어 누적 목록.

> 마지막 enrich: 260813  
> Inbox 잔여: 0  
> 소스: Notion 백로그(정리 기준일 2026-08-07) → capture 260812 → enrich 260812 → enrich 260813 → 후속 확인 260813 (PDF 표지 · 열린 질문 일괄)  
> 코드 반영 참고: main에 PR #19–22 · #26(Favorites) · #27(Favorites UI) · #29(Bookmark Note) · #30(구조 정리) · #31(휴지통 삭제) 머지됨. #23(모바일 인디케이터)은 #30에 흡수. 미머지 초안: PR #24(slug·JPG·비공개 업로드·2-page gap 등). Favorites 부분은 #26/#27이 main에 있음. #25·#28은 main에 흡수되어 폐기.  
> 규칙: **단순 시각·디자인 검수** 항목은 「그룹: 시각 · 디자인 검수」에만 둔다. 기능 그룹에 섞지 않는다. (확인 260813)

- 수집: `backlog-capture` · 정리: `backlog-enrich` · 실행: `backlog-to-roadmap` → `Roadmap.md`
- 이번 enrich에서 한 일: 얇은 항목에 화면·시나리오·현재 코드 칸을 채움. `2-Page gap`을 뷰어 그룹으로 옮김. 휴지통 열람·복원을 별 항목으로 분리. 260813 후속: 진행률 범위 확정 · OCR 날짜는 완료 기록으로 이동 · 타입 프리셋=사용일자 · 사용 중 Chip=좌상단 · 휴지통=설정 페이지 · 순서 재편성은 현재 버전 제외 · 시각 작업 분리.

---

## 그룹: 업로드 · 안정성

### 페이지 업로드 부분 실패 조사 & 수정 `(수집 260812)`
- 상태: done (코드 main · PR #22, 260810)
- 우선순위: P0 (완료)
- 목적: Cloudinary만 성공하고 Notion `page_count`/메모가 비는 “Load Failed”를 없앤다. 업로드가 중간에 끊겨도 이미 올라간 장은 사이트에서 열리게 한다.
- 화면/진입: AddPageModal → `POST /api/pages` · Notion `pdf_folder_url` / `page_count`
- 시나리오:
  - 기본: 장마다 Cloudinary 업로드 후 Notion을 점진 반영. 첫 장부터 폴더 URL을 심어 뷰어가 열리게 함
  - 예외: 중간 실패 시 이미 올라간 장수만큼 Notion에 남기고 부분 성공 토스트. 메모 스키마 불일치 시 명시 에러
  - 빈 상태: 해당 없음 (업로드 플로우)
- 데이터/API: `linkNotePages` 재시도 · `uploadPageImage` · 기존 장 뒤에 이어서 번호 부여
- 디자인·UX: 사용자는 “일부만 저장됨” 문구로 상태를 알 수 있어야 함. 현재는 토스트. 완료 Dialog는 아래 진행률 항목에서 다룸
- 열린 질문: 프로덕션에서 재발 여부 모니터링
- 원문 메모: 「Load Failed · 페이지 미생성 · 메모 비움 · Cloudinary 정상」

### 업로드 진행률 표시 + 완료 Dialog `(수집 260812)`
- 상태: backlog
- 우선순위: P1 — 부분실패 수정 다음으로 피드백 공백이 큼
- 목적: 긴 업로드 동안 “지금 몇 장째인지”를 보여주고, 끝나면 Dialog로 성공/부분실패/실패를 확인받게 한다. 토스트만으로는 놓치기 쉽다.
- 화면/진입: AddPageModal 업로드 오버레이(`.add-note-upload-overlay` · 로티) → 완료 시 Dialog. **같은 패턴을 표지 업로드(AddNoteFab)와 PDF→JPEG 변환에도 쓴다** (확인 260813)
- 시나리오:
  - 기본: N/M + 진행바(또는 동등한 비율 표시) → 완료 Dialog → Primary 확인 후 닫기. PDF면 변환 N/M 다음에 업로드 N/M. 새 노트면 앞·뒤 표지 업로드도 같은 오버레이
  - 예외: 부분 성공/전체 실패 메시지를 Dialog 본문에 구분. 업로드 중에는 Dialog 닫기·딤 클릭 차단(기존 `busy`/`canClose`)
  - 빈 상태: 페이지 0장이면 업로드 버튼 비활성 (이미 있음)
- 데이터/API: 기존 업로드 루프의 `i/total` 재사용. PDF 변환 `onProgress(done, total)` · 표지 `uploadCoverImage` 앞/뒤 2장
- 디자인·UX: Dialog 컴포넌트 재사용 · Primary 확인 버튼 하나면 충분. 진행바는 로티 아래 텍스트+바. 버튼은 공통 Button(`solid`)
- 현재 코드: 오버레이에 **텍스트 N/M만** 있고 진행바는 없음. 끝나면 Dialog가 아니라 **토스트**. 표지 업로드도 로티+문구만 (`표지를 업로드하는 중…`)
- 열린 질문: PDF 변환과 Cloudinary 업로드를 한 바로 이을지, 단계 문구를 바꿔가며 두 구간으로 보여줄지
- 원문 메모: 「Progress bar · 완료 Dialog · 예상 3-4h」
- (추가 260813) 사용자 확인: 표지 업로드·PDF 변환에도 동일 진행률 UX를 쓴다.

### PDF 업로드 시 커버 페이지 선택 `(수집 260812)`
- 상태: backlog
- 우선순위: P1
- 목적: PDF를 페이지로 넣을 때, 그 PDF의 **1페이지 이미지를 해당 노트 표지 앞면**으로, **마지막 페이지 이미지를 표지 뒷면**으로 올릴지를 각각 고른다. 뷰어 Content 순서를 바꾸는 기능이 아니다.
- 화면/진입: AddPageModal PDF 변환 후 미리보기(`FileUploadPreview`) 근처. 이미지 소스 모드가 아니라 **PDF 선택 시**에만 보임
- 시나리오:
  - 기본: 체크박스 2개, **둘 다 default false**. 체크하지 않으면 본문 페이지만 업로드하고 표지는 건드리지 않음. 1p 체크 시 변환된 첫 장 JPEG를 `coverFront`로 **복사** 업로드하고, 마지막 페이지 체크 시 마지막 장 JPEG를 `coverBack`으로 복사 업로드. **해당 장은 본문 페이지에도 그대로 들어간다** (Content에서 빼지 않음)
  - 예외: PDF 1장뿐이면 앞·뒤 체크가 같은 이미지를 가리킴. 이미 표지가 있는 노트에서 체크하면 기존 Front/Back을 덮어씀. 업로드 실패 시 본문 페이지와 표지 중 어느 쪽만 성공했는지 구분 필요
  - 빈 상태: PDF 미선택·이미지 모드면 체크박스 숨김
- 데이터/API: 표지 `POST /api/uploadCover` (Cloudinary Cover Front/Back 폴더, 파일명=노트명) · 본문은 기존 `POST /api/pages`. 같은 JPEG를 표지 폴더와 Content 폴더에 각각 올림
- 디자인·UX: **체크박스** 2개 (라디오/Dialog 택1이 아님). 노트 폼의 `form-check` 패턴과 맞춤. 카피 예: 「PDF 1페이지를 표지 앞면으로 업로드」·「PDF 마지막 페이지를 표지 뒷면으로 업로드」. 기본 해제(false)
- 열린 질문: 표지 업로드만 실패하고 본문은 성공했을 때 토스트/Dialog 문구
- 원문 메모: 「1페이지 vs 마지막 페이지 · ⭐⭐⭐」
- (추가 260813) 사용자 확인: Notion 표지 이미지가 맞음(뷰어 1페이지 정렬 아님). PDF 1p → 표지 앞면, PDF 마지막 페이지 → 표지 뒷면. 체크박스, default false. 체크해도 본문 페이지에는 그대로 들어감.

### JPG 이미지 자동 정규화 · PDF→JPEG 화질 `(수집 260812)`
- 상태: backlog (초안 PR #24에 장변 3200·품질 0.95·scale 2.5 포함. main에는 미머지)
- 우선순위: P1
- 목적: 업로드 페이지 JPG 장변·비율을 맞춰 뷰어에서 크기 들쭉날쭉을 줄이고, PDF 변환 화질을 올린다
- 화면/진입: `src/services/pages.js` 정규화 · AddPageModal 업로드 직전. 사용자는 설정 UI 없이 결과만 봄
- 시나리오:
  - 기본: 이미지/PDF 모두 업로드 직전 JPEG 정규화 필수. 장변 맞추고 흰 배경 합성(투명 PNG 대비)
  - 예외: 이미 JPEG이고 장변이 목표 이하이면 재인코딩만 / 또는 스킵 — 미정 — 확인 필요
  - 빈 상태: 해당 없음
- 데이터/API: 클라이언트 캔버스. 현재 main: `convertImageDataUrlToJpeg` 품질 **0.9**(리사이즈 없음), PDF `scale` **1.5** · JPEG **0.88**. PR #24 초안: `normalizePageImageToJpeg` 장변 **3200px** · 품질 **0.95** · PDF scale **2.5**. skill `jpg-normalize-on-upload`는 PR #24 브랜치에만 있음
- 디자인·UX: 사용자는 “또렷하고 일정”하게만 느끼면 됨. 업로드 시간이 늘 수 있음 → 진행률 항목과 같이 가면 체감이 덜함
- 열린 질문: 장변 3200이 용량/시간 트레이드오프에 적합한지. 표지 이미지(`uploadCover`)에도 같은 규칙을 쓸지
- 원문 메모: 「동일한 크기 또는 비율 · PDF→JPEG 화질 향상」

---

## 그룹: 주크박스 · 반응형 레이아웃

### 태블릿 FAB · 필터 칩 · 라벨 `(수집 260812)`
- 상태: done (main · PR #22)
- 우선순위: P0 (완료)
- 목적: 세로 태블릿에서 FAB가 사라지고 칩/라벨이 잘리는 UX 해소
- 화면/진입: FilterSubMenu · AddNoteFab · Jukebox.css
- 시나리오:
  - 기본: 필터 접힘과 무관하게 FAB Primary 표시 · 칩 수평 스크롤 · 라벨 ellipsis/title
  - 예외: 좁은 폭에서도 + 버튼이 필터에 가리지 않음
- 원문 메모: 「FAB 항상 · 칩 오버플로우 · 라벨 동적 조정 · Sprint 3 묶음」

### 모바일 뷰 수정 · 인디케이터 · 푸터 `(수집 260812)`
- 상태: done (main · PR #23 흡수 → #30, 260812)
- 우선순위: P1
- 목적: 모바일에서 푸터 가시성, 노트 인디케이터(중앙 포커스 캡슐+페이드), 캐러셀 위글 제거, 화살표 숨김
- 화면/진입: Jukebox · NoteInfoPanel(`renderNoteIndicator`) · Footer
- 시나리오:
  - 기본: 스와이프만으로 이동 · 인디케이터 focused 항상 중앙(좌·우 flex:1)
  - 예외: 노트 0개면 인디케이터 없음
- 디자인·UX: 시안형 pill/dot 인디케이터. focused=넓은 흰 캡슐, 인접=짧은 캡슐, 멀수록 점+투명
- 열린 질문: 인디케이터 높이와 시안 H값 정밀 매칭 — 시각 검수. 시안 매칭만 남으면 「시각 · 디자인 검수」로 옮김
- 원문 메모: 「이미지 크기/네비 겹침 · 노트 추가 버튼 · 모바일 디자인 수정」

---

## 그룹: 즐겨찾기 · 북마크 · 네비

### 노트 즐겨찾기 토글 `(수집 260812)`
- 상태: done (main · PR #19–20)
- 우선순위: P0 (완료) — 확정 의사결정 1순위 중 토글分
- 목적: 노트를 Notion `favorites`로 표시/해제
- 화면/진입: NoteInfoPanel 별 버튼 · `POST /api/updateFavorite`
- 시나리오:
  - 기본: 클릭 시 토글 + 토스트. Bookmark Note에는 별 없음
  - 예외: 비로그인·API 실패 시 이전 상태로 롤백
- 데이터/API: Notion checkbox `favorites` · 클라이언트 `favorites: boolean`
- 원문 메모: 「Notion favorites · 토글 UI · boolean」

### Favorites 모아보기 페이지 · 네비 진입 `(수집 260812)`
- 상태: done (main · PR #26/#27, 260812)
- 우선순위: P0 — 토글은 있었으나 모아보기 화면이 main에 없었음
- 목적: `favorites===true` 노트만 주크박스로 모아 보고, Timeline/By type과 같이 전환한다
- 화면/진입: `/favorites` · FilterSubMenu 뷰 토글 · PageHeader/드로어 링크
- 시나리오:
  - 기본: 별 표시한 노트만 캐러셀 · 비어 있으면 안내
  - 예외: 공개(visibility) 필터와 동일 규칙
- 데이터/API: `getFavoriteNotes` · `FAVORITES_PATH`
- 디자인·UX: 뷰 모드에 「Favorites」라벨 · 칩은 All(Favorites) 하나
- 열린 질문: Favorites 안에서 Period/Type 2차 필터 필요 여부 (초기엔 없이)
- 원문 메모: 「PC 사이드네비 즐겨찾기 바로가기」와도 연결 · 우선 웹 라우트부터

### 페이지 북마크 `(수집 260812)`
- 상태: done (main · PR #21)
- 우선순위: P0 (완료)
- 목적: 페이지 단위 `is_bookmarked` 토글
- 화면/진입: ViewerChrome 북마크 버튼(데스크톱 시트 · 모바일 FAB) · Cloudinary metadata
- 시나리오:
  - 기본: 현재 페이지 북마크 on/off
  - 예외: 메타데이터 조회 실패 시 fail-open
- 원문 메모: 「bookmarked · 토글 UI」

### 북마크 페이지 가상 노트 모아보기 `(수집 260812)`
- 상태: done (main · PR #29, 260812)
- 우선순위: P1
- 목적: 모든 유저 기본 **Bookmark Note**에 북마크 페이지를 모은다
- 화면/진입: Jukebox 선두 카드 · `/note/virtual:bookmarks`
- 시나리오:
  - 기본: 앨범처럼 넘김. 북마크 해제 시 해당 장이 목록에서 빠짐
  - 예외: 표지 로드 실패 시 로컬 PNG 폴백. 포커스 패널에 수정/삭제/페이지추가 없음
- 데이터/API: `GET /api/cloudinaryBookmarkedPages` · `GET /api/bookmarkNote` 표지 · 페이지 정보에 원본 노트 링크
- 원문 메모: (가상 노트 모아보기)

### 제스처 네비게이션 `(수집 260812)`
- 상태: done (Notion·코드상 스와이프/터치 스크롤 존재)
- 우선순위: P1 (완료로 기록)
- 목적: 좌우 스와이프로 주크박스 노트·뷰어 페이지를 넘긴다
- 화면/진입: Jukebox 캐러셀 · NoteImageViewer 터치
- 원문 메모: 「좌우 스와이프로 페이지 넘기기」

### PC 사이드 네비게이션 `(수집 260812)`
- 상태: backlog
- 우선순위: P2
- 목적: 즐겨찾기·최근·Period/Type·설정 패널을 PC 와이드 레이아웃에서 옆에 고정해, 상단 헤더+필터만으로 깊은 이동을 하지 않게 한다
- 화면/진입: 데스크톱 셸. 현재: PageHeader(로고 | FilterSubMenu 중앙 | 테마+Story) + 필터 칩. 모바일은 햄버거 드로어(Notes/Story/테마)
- 시나리오:
  - 기본: 넓은 화면에서 좌(또는 우) 레일에 Favorites / Timeline / By type / (설정) 진입
  - 예외: 좁은 화면은 기존 헤더·드로어 유지. 사이드네비를 그냥 접지 않고 숨김
  - 빈 상태: 해당 없음
- 데이터/API: 새 API 없음. 기존 라우트(`/favorites`, `/timeline/:period`, `/by-type/:type`) 링크
- 디자인·UX: FilterSubMenu를 레일로 승격할지, 별도 아이콘 레일인지 미정. 버튼은 공통 Button. 아이콘은 MingCute만
- 열린 질문: Favorites 라우트·뷰 토글로 일부 대체 가능한지. “최근”의 정의(unseen 뱃지 vs 최근 연 노트 vs period_end null). 설정 패널에 넣을 항목(테마 외에 뭐가 있는지)
- 원문 메모: 「PC 사이드네비게이션 추가」

---

## 그룹: 공유 · 공개범위

### 노트 slug URL · 공유 버튼 `(수집 260812)`
- 상태: backlog (초안 PR #24. main은 `/note/:id`만)
- 우선순위: P1
- 목적: 읽기 쉬운 `/note/{title}-{idShort}` 주소로 공유하고, 버튼 한 번으로 클립보드에 복사한다
- 화면/진입: NoteImageViewer 하단 시트(ViewerChrome). 현재 시트: 정보 | 페이지 추가 | 북마크 | 프로그레스 | 원상복구. **공유 버튼 없음**
- 시나리오:
  - 기본: 뷰어 열면 URL을 slug로 `replaceState`. 공유 클릭 → 클립보드 복사 + 토스트. UUID만 넣어도 같은 노트가 열림
  - 예외: Bookmark Note(`virtual:bookmarks`) slug 규칙. 제목에 슬래시·한글·공백 처리. 비공개 노트 URL을 가진 사람 — 미정 — 확인 필요
  - 빈 상태: 해당 없음
- 데이터/API: 라우터 ` /note/:id` → slug 파싱. Notion id 앞 8자. 제목 slugify는 클라이언트
- 디자인·UX: 시트에 공유 아이콘 버튼(circle · toolbar · ghost) + `ariaLabel`. MingCute share 계열. 브라우저 공유 시트(Web Share API) vs 클립보드만 — 초안은 클립보드
- 열린 질문: 비공개 노트도 slug가 있으면 열리는지(가시성 필터와 충돌). 페이지 단위 딥링크(`/note/slug?p=3`)가 필요한지
- 원문 메모: 「고유주소 · 공유 버튼」

### 노트/페이지 비공개 업로드 체크 `(수집 260812)` *(대화 후속 요청, 초안 PR #24)*
- 상태: backlog (노트 폼에는 visible 체크가 이미 있음. 페이지 추가 모달에는 없음. 카피·위치가 요청과 다름)
- 우선순위: P1
- 목적: 「이 노트/페이지를 비공개로 업로드」를 체크하면 `visible=false`로 저장되어, 기본 공개 목록·뷰어에서 빠진다
- 화면/진입: AddNoteFab 노트 생성/수정 · AddPageModal 페이지 추가 · `api/pages` Cloudinary metadata. 기존 페이지는 PageMetaModal 「사이트에 표시 (visible)」
- 시나리오:
  - 기본: 노트 체크 → Notion `visible=false` → `visibility=public` API에서 제외. 페이지 체크 → Cloudinary context `visible=false` → 뷰어가 해당 장 건너뜀
  - 예외: `visible` 컬럼 없는 DB는 전부 노출(fail-open). 메타데이터 조회 실패도 fail-open. CDN 캐시 최대 약 5분
  - 빈 상태: 체크 기본값은 공개(true)
- 데이터/API: Notion `visible` (checkbox 권장) · Cloudinary context `visible=false` · `?visibility=private|all` 필터. `api/_lib/visibility.js`
- 디자인·UX: 현재 노트 폼 문구는 「사이트에 공개 (체크 해제 시 노트가 목록에서 숨겨집니다)」— 요청 원문은 **비공개로 업로드** 체크(opt-in). 페이지 추가는 업로드 직전에 한 번 묻는 편이 실수가 적음
- 열린 질문: 문구를 opt-in(비공개 체크)으로 바꿀지, 지금처럼 opt-out(공개 체크)을 유지할지. 페이지 추가 시 노트 비공개면 장도 기본 비공개로 둘지
- 원문 메모: 사용자 후속 요청

### 노트 잠금 속성 `(수집 260812)`
- 상태: cancelled (260812 — 사용자: 진행 안 함)
- 우선순위: —
- 원문 메모: 「잠금 토글 · 미리보기 제한」
- 메모: 로드맵·사용자 할 일에서 제외. 나중에 다시 원하면 Inbox로 재수집.

---

## 그룹: 메타데이터 · OCR · 폼 UX

### 메타데이터·사이즈 데이터 통합 `(수집 260812)`
- 상태: backlog
- 우선순위: P1 — 확정 의사결정 「즐겨찾기 → **메타데이터** → OCR」
- 목적: 기존 노트 `size`를 정확히 채우고, 사이즈별 비율 렌더를 안정화한다. 로직은 이미 있고 **데이터가 병목**
- 화면/진입: `src/utils/noteSize.js` (`parseNoteSize` · `computeNoteDisplayBoxes`) → Jukebox 카드 박스 · NoteImageViewer 1p/2p 박스. 포커스 패널에 size 라벨 표시
- 시나리오:
  - 기본: size 있는 노트는 박스가 규격대로(A4/A5/A6/B5/B6 또는 `148x210`). 같은 노트의 1페이지 이미지들은 항상 동일 single 박스
  - 예외: size 없으면 이미지 비율 폴백. 파싱 실패 시 라벨만 텍스트로 남고 aspect는 null
  - 빈 상태: size 공란 노트가 뷰어에서 들쭉날쭉
- 데이터/API: Notion `size` 프로퍼티 (Select 또는 Rich text). 권장 값: `A4`, `A5`, `A6`, `B5`, `B6` 또는 `148x210`. 코드는 `docs/README_NOTION_SETUP.md` 「노트 사이즈」절
- 디자인·UX: 뷰어에서 노트마다 들쭉날쭉한 여백이 줄어듦. 양면 스캔(`isLandscapeSpread`)도 size가 있어야 단페이지 대비 가로가 긴지 판정하기 쉬움
- 열린 질문: 누락 size 목록을 뽑는 점검 스크립트 필요 여부
- 원문 메모: 「기존 노트 사이즈 정확히 입력 · 비율 렌더링」
- **사용자 작업:** Notion에서 기존 노트 size 값 채우기

### 카테고리별 노트 추가 모달 사전 채우기 `(수집 260812)`
- 상태: backlog
- 우선순위: P1
- 목적: 지금 보고 있는 Timeline/By type 필터 값을 새 노트 모달의 Period/Type에 자동 반영해, 매번 다시 고르지 않게 한다
- 화면/진입: AddNoteFab `openAddNoteModal({ defaults })` · Timeline `/timeline/:period` · By type `/by-type/:type`. 현재 Jukebox `+`는 `openAddNoteModal({ onCreated })`만 호출해 **defaults 없음**. 수정 모드만 `noteToFormSeed`로 채움
- 시나리오:
  - 기본: `/timeline/university`에서 + → period `University` 사전 선택. `/by-type/diary`에서 + → type `다이어리(일기장)` 사전 선택
  - 예외: `/timeline`(전체) · `/favorites` · 필터 없음 → 빈 선택 유지. 사용자가 모달에서 다른 값을 바꿀 수 있어야 함
  - 빈 상태: 옵션 로드 전 로컬 `periodOptions`/`typeOptions` 폴백
- 데이터/API: URL 슬러그(`university`) ↔ Notion 태그명(`University`) 매핑은 `src/data/periodOptions.js` · `typeOptions.js`. 폼 옵션은 `GET /api/noteFormMeta`
- 디자인·UX: Select가 열린 채로 값이 들어가 있으면 됨. 숨은 필드가 아니라 보이는 선택
- 열린 질문: Timeline에서 type까지 채울지(시기만 vs 둘 다). Favorites에서 + 를 누르면 어떤 기본값인지
- 원문 메모: 「현재 뷰의 카테고리 자동 반영」

### 노트 타입별 사전 설정 `(수집 260812)`
- 상태: backlog — **추가 기획 필요** (확인 260813). size/color 프리셋이 아님
- 우선순위: P2 — 카테고리 사전 채우기(현재 뷰의 Period/Type)와는 다른 축. 구현 전에 타입별 날짜 규칙을 정해야 함
- 목적: 노트 **타입을 고르면 사용 시작일·종료일**이 그 타입 규칙에 맞게 채워진다. 예: **스케줄러** → 업로드(생성) 연도의 **1월 1일 ~ 12월 31일**
- 화면/진입: AddNoteFab 새 노트 폼. `notebookType` Select 변경 시 `periodStart` / `periodEnd` (및 「아직 사용 중」체크)
- 시나리오:
  - 기본: 스케줄러 선택 → 시작=해당 연 01-01, 종료=해당 연 12-31. 사용자가 이후 날짜를 고칠 수 있음
  - 예외: 수정 모드에서 타입만 바꾸면 기존 사용일자를 덮을지 — 미정. 연말(12-31)이 있으면 「아직 사용 중」은 해제됨(폼 로직상 `periodEnd` 있음)
  - 빈 상태: 타입 미선택·규칙 없는 타입은 날짜를 비워 둠
- 데이터/API: Notion `period_start` / `period_end`. 타입: 다이어리 / 스케줄러 / 수첩·메모지 / 스케치북 / 줄공책. 스케줄러 외 규칙은 아직 없음
- 디자인·UX: 날짜 필드가 채워지는 게 보여야 함. size/color는 이 항목 범위 밖
- 열린 질문: 다이어리·줄공책 등 나머지 타입의 날짜 규칙. 「업로드 년」이 폼을 연 해인지, 저장 시각의 해인지. 연중 스케줄러를 다음 해에 등록하면 그 해로 둘지
- 원문 메모: 「기본값 자동 채우기」
- (추가 260813) 사용자 확인: size/color 아님. 사용일자. 스케줄러=생성 연 1/1–12/31. 추가 기획 필요.

### 스마트 OCR 영역 감지 `(수집 260812)`
- 상태: backlog
- 우선순위: P2 — 확정 순서상 메타데이터 다음 · 공수 큼
- 목적: 업로드 후 스캔에서 글자 영역을 자동 감지하고, 사용자가 박스를 고친 뒤 그 영역만 OCR해 다시 생성한다. 여백·손때·제본 그림자가 텍스트에 섞이는 것을 줄인다
- 화면/진입: AddPageModal / PageMetaModal OCR. 현재는 페이지 **전체 이미지**에 Tesseract(`kor+eng`) 「이미지에서 인식」버튼만 있음. 영역 선택 UI 없음
- 시나리오:
  - 기본: 감지된 박스 표시 → 드래그로 수정 → OCR 재실행 → `ocr_text` 채움
  - 예외: 감지 실패 시 전체 이미지 폴백. 사용자가 박스 삭제하고 직접 입력
  - 빈 상태: 글자 없는 스케치 페이지는 빈 텍스트 + 안내
- 데이터/API: `src/services/ocr.js` `recognizePageImage`. 영역 좌표 저장 포맷 없음. Cloudinary metadata vs Notion — 미정
- 디자인·UX: 뷰어/모달 위 반투명 박스. 수정 핸들. 버튼은 공통 Button. 모바일에서 박스 편집이 어려운 점
- 열린 질문: 감지 알고리즘(클라이언트 vs 서버). 영역 저장 포맷. 업로드 직후 자동 실행 vs 메타 모달에서만
- 원문 메모: 「사전 스캔 영역 · 수정 UI · OCR 재생성」

### 「사용 중인 노트」Chip `(수집 260812)`
- 상태: backlog
- 우선순위: P2
- 목적: `period_end`가 비어 있는 노트(아직 쓰는 중)를 한눈에 구분한다
- 화면/진입: Jukebox 카드 **좌상단** Chip. 우상단은 새 노트 뱃지(`jukebox-new-badge`)가 있으므로 겹치지 않게 왼쪽. 폼에는 이미 「아직 사용 중」체크(`stillInUse` ← `periodEnd` 없음)
- 시나리오:
  - 기본: `period_end` null → 카드 좌상단 Chip. 종료일이 있으면 Chip 없음
  - 예외: Bookmark Note는 해당 없음. 새 노트 뱃지(우상단)와 동시에 뜰 수 있음
  - 빈 상태: period 정보 없는 구 노트 — 미정 — 확인 필요
- 데이터/API: Notion `period_end` · 클라이언트 `note.periodEnd`. 새 컬럼 불필요
- 디자인·UX: FilterChip 토큰(`--radius-pill`) 재사용. 카피 「사용 중」정도. 표지를 가리지 않을 크기
- 열린 질문: period 정보 없는 구 노트를 사용 중으로 볼지
- 원문 메모: 「사용 중인 노트 상태 표시」
- (추가 260813) 사용자 확인: 우상단/포커스 패널이 아니라 **카드 좌상단**. 새 노트 뱃지와 자리를 나눔.

### 구입처 · 블로그 링크 속성 `(수집 260812)`
- 상태: backlog
- 우선순위: P3 — **Notion 속성 추가(사용자)** 후 UI
- 목적: 노트 브랜드/구입처와 관련 블로그 URL을 모아 보여, 기록 도구로서의 출처를 남긴다
- 화면/진입: 노트 상세·포커스 패널 또는 Story 계열 모아보기. 폼(AddNoteFab)에는 해당 필드 없음
- 시나리오:
  - 기본: 속성 있는 노트만 링크/라벨 표시. 클릭 시 외부 URL
  - 예외: URL 형식 오류 · 빈 값이면 숨김
  - 빈 상태: 속성 자체 없음 → UI 숨김
- 데이터/API: Notion 새 속성(이름·타입 미정 — URL / rich text / select). 코드 매핑은 `notionNotebooks.js`에 없음
- 디자인·UX: 외부 링크는 새 탭 + 아이콘. 모아보기 화면이 별도인지 패널 한 줄인지는 미정
- 열린 질문: 속성 영문 키(`store`, `blog_url` 등). 모아보기 페이지가 필요한지, 노트 단위 표시만인지
- 원문 메모: 「브랜드/구입처 · 블로그 URL 모아보기」
- **사용자 작업:** Notion에 속성 추가 후 알려 주기

---

## 그룹: 뷰어 · 페이지 편집

### 2-Page 뷰 페이지 간격 0 `(수집 260812)`
- 상태: backlog (초안 PR #24. main은 gap 있음)
- 우선순위: P1
- 목적: 양면 보기에서 두 페이지 사이 틈/겹침을 없애 실제 펼친 노트처럼 붙인다
- 화면/진입: NoteImageViewer `.niv-zoom-stage`. 양면 토글(`.niv-toggle-spread`) → `.spread-mode`
- 시나리오:
  - 기본: spread-mode에서 좌·우 이미지 gap 0. 단페이지·스캔 한 장(`niv-page-image--spread-asset`)은 해당 없음
  - 예외: 두 장 비율이 다르면 높이 정렬(현재 `align-items: center`). 줌/팬 시에도 붙어 있어야 함
  - 빈 상태: 오른쪽 페이지 없으면 `.niv-page-image--right` hidden
- 데이터/API: 없음 (CSS). 현재 main: `.niv-zoom-stage { gap: var(--space-3); }` = 12px. PR #24: gap `0`
- 디자인·UX: 완전 밀착 vs 1px 제본 그림자(`--color-book-spine`) — 원문은 겹침 0. 그림자 줄은 별 요청 없음
- 열린 질문: 모바일도 동일하게 0인지(초안은 모바일 포함 0)
- 원문 메모: 「두 페이지 사이 겹침 0」

### 모자이크 `(수집 260812)`
- 상태: backlog
- 우선순위: P3
- 목적: 페이지 이미지에서 민감 영역을 가리고, 그 결과를 저장해 뷰어에 반영한다
- 화면/진입: NoteImageViewer 또는 PageMetaModal. 영역 선택 → 처리 → 저장. 현재 UI/API 없음
- 시나리오:
  - 기본: 드래그로 영역 선택 → 모자이크/블러 적용 → 저장 후 해당 장 교체
  - 예외: 여러 영역. 되돌리기. 원본 보존 여부 — 미정 — 확인 필요
  - 빈 상태: 선택 전 안내
- 데이터/API: 처리 위치(클라이언트 캔버스 vs Cloudinary transformation) 미정. 원본 `page-*.jpg`를 덮을지 파생 파일을 둘지 미정
- 디자인·UX: 영역 핸들. 적용 전 미리보기. 실수 방지 Dialog
- 열린 질문: 원본 보존이 필요한지. 비공개(`visible=false`)로 충분하고 모자이크는 과한지
- 원문 메모: 「영역 선택 · 처리·저장」

### 페이지 삽입 `(수집 260812)`
- 상태: done (뷰어에서 현재 장 다음 삽입은 동작 중)
- 우선순위: P2 (삽입 API·UI 일부 존재)
- 목적: 특정 장 다음에 새 페이지를 끼워 넣는다
- 화면/진입: 뷰어 시트 「현재 페이지 다음에 페이지 추가」→ AddPageModal `insertAfterPage`. 업로드 전 미리보기 위/아래는 **이번 배치 순서**용(이미 올라간 장 재정렬 아님)
- 시나리오:
  - 기본: 뷰어에서 + → 현재 장 뒤에 삽입. `shiftPagesAfter`로 뒤 번호 갱신
  - 예외: 폴더 URL 없으면 중간 삽입 불가
  - 빈 상태: 장 0이면 1번부터 추가
- 데이터/API: `shiftPagesAfter` · Cloudinary `page-000001.jpg`
- 원문 메모: 「특정 위치 끼워넣기 · 순서 재편성 UI」중 끼워넣기 분
- (추가 260813) 순서 재편성 UI는 아래 항목으로 분리. 현재 버전 범위에서 뺌

### 페이지 순서 재편성 UI `(수집 260812)`
- 상태: backlog — **현재 버전에서 제외**. 아이디어 미확정
- 우선순위: P3 (사용자: 지엽적, 우선순위 낮음)
- 목적: 이미 올라간 장의 순서를 다시 매긴다. 업로드 직전 미리보기 위/아래와는 별개
- 화면/진입: 미정 — 확인 필요. 앨범 그리드+드래그 등이 거론됐으나 확정 아님
- 시나리오: 미정 — 확인 필요
- 데이터/API: 기존 장 재정렬 API 없음. 파일명 번호 재부여가 필요해 보임
- 디자인·UX: 미정. PageMetaModal 삭제 버튼 「기능 준비중입니다」는 이 묶음과 별개일 수 있음
- 열린 질문: 무엇을 재정렬하는지(전체 앨범 vs 구간). 페이지 삭제도 같은 화면인지
- 원문 메모: 「특정 위치 끼워넣기 · 순서 재편성 UI」중 순서 분
- (추가 260813) 사용자: 현재 버전에서 삭제하고 백로그로. 아이디어가 아직 명확하지 않음.

---

## 그룹: 노트 관리 · 휴지통

### 포커스 패널 노트 삭제 → 휴지통 DB `(수집 260813)`
- 상태: done (코드 260813 · PR #31 · 휴지통 DB 연결은 사용자)
- 우선순위: P1
- 목적: 주크박스 포커스 정보 바에 삭제 아이콘을 두고, Dialog로 한 번 더 확인한 뒤 해당 노트를 휴지통 Notion DB로 옮긴다
- 화면/진입: Timeline / By type / Favorites 주크박스 하단 포커스 패널 (별 · 수정 · 페이지 추가 오른쪽)
- 시나리오:
  - 기본: 삭제 아이콘 → Dialog 「노트를 삭제할까요?」 → 삭제 시 휴지통 DB 이동, 목록에서 사라짐 / 취소 시 닫힘
  - 예외: 휴지통 DB 미설정 시 Dialog 확인 후 안내 토스트. Bookmark Note는 삭제 버튼 없음. 로그인이 필요함
- 데이터/API: `POST /api/trashNote` · `NOTION_TRASH_DATABASE_ID`
- 디자인·UX: 수정·페이지 추가와 같은 primary 원형 아이콘 · 사이트 Dialog (브라우저 alert 아님) · 삭제/취소
- 열린 질문: 삭제 일시(Date) 속성 추가 권장. 열람·복원은 아래 항목으로 분리
- 원문 메모: 「빨간원 위치에 삭제 아이콘 · Dialog 삭제/취소 · 휴지통 DB로 이동 · DB 아직 없음」
- Backlog 참조: [Roadmap 포커스 패널 노트 삭제](Roadmap.md)
- **사용자 작업:** Notion 휴지통 DB 생성 · `NOTION_TRASH_DATABASE_ID` · 삭제 일시 Date 속성 권장

### 휴지통 열람 · 복원 UI `(수집 260813)`
- 상태: backlog
- 우선순위: 미정 — 확인 필요 (삭제 P1의 짝. 설정 페이지가 전제)
- 목적: 휴지통 DB로 옮긴 노트를 **사이트 설정 페이지의 휴지통 메뉴**에서 보고, 영구 삭제할지 복원할지 고른다
- 화면/진입: **설정 페이지(신규)** → 휴지통 메뉴. 현재 `/settings` 라우트·설정 화면 없음. 주크박스와 다른 리스트
- 시나리오:
  - 기본: 휴지통 목록 표시 → 항목마다 **복원**(노트북 DB로 이동, 주크박스에 다시 보임) 또는 **영구 삭제**(휴지통에서 제거). 확인은 Dialog
  - 예외: DB ID 없음 · 비로그인. 영구 삭제는 되돌릴 수 없음 → Dialog로 한 번 더 묻기
  - 빈 상태: 「휴지통이 비어 있습니다」
- 데이터/API: `NOTION_TRASH_DATABASE_ID`. 복원 API·영구 삭제 API 없음. 삭제 일시 속성이 있으면 정렬에 사용
- 디자인·UX: 설정 안에 메뉴. 버튼은 공통 Button. 복원/영구삭제 확인 Dialog
- 열린 질문: 설정 페이지에 휴지통 외에 넣을 항목(테마는 헤더에 이미 있음). PC 사이드네비 「설정」과 같은 진입인지
- 원문 메모: 「휴지통 열람·복원 UI는 이번 범위 밖」(삭제 항목에서 분리)
- (추가 260813) 사용자 확인: Notion만 쓰지 않음. 사이트 설정 페이지에 휴지통 메뉴. 목록 + 영구 삭제 / 복원.

---

## 그룹: 시각 · 디자인 검수

> 화면을 직접 보기 전에는 진행하지 않음. 기능 백로그와 섞지 않음. (확인 260813)

### 라이트모드 포커스 UX (흰색 페이드아웃) `(수집 260812)`
- 상태: backlog (부분 구현 — 동작은 있으나 어색함 검수 남음)
- 우선순위: P2 — 시각 검수. 실제 라이트 화면을 보기 전에는 손보지 않음
- 목적: 라이트 테마에서 비포커스 노트를 어둡게 누르지 않고, 배경색으로 허옇게 페이드되게 한다. 다크의 brightness 디밍을 라이트에 그대로 쓰면 회색 먼지가 된다.
- 화면/진입: Jukebox Cover Flow. JS가 `--jukebox-opacity` / `--jukebox-brightness`를 카드마다 넣음. CSS: `[data-theme='light'] … img { filter: opacity(var(--jukebox-opacity)) var(--color-drop-shadow); }`
- 시나리오:
  - 기본: 중앙 카드는 불투명·또렷. 양옆은 배경(라이트 grey)으로 녹아 들어 포커스가 분명
  - 예외: 호버로 뒤집히는 뒷표지도 같은 페이드 규칙을 따라야 함. 현재 뒷표지는 `filter: var(--color-drop-shadow)`만 적용되어 페이드가 약함
  - 빈 상태: 카드 없으면 해당 없음
- 데이터/API: 없음 (CSS/JS 토큰)
- 디자인·UX: Design.md — 라이트는 글자 text-shadow 끄고 바닥 반사 안 씀. 실루엣 그림자 항목과 라이트에서 filter가 겹침
- 열린 질문: 목표 느낌은 화면 보고 판단. 라이트에서 per-card `--jukebox-shadow-*`를 살릴지
- 원문 메모: 「라이트모드 포커스 UX 개선」
- (추가 260813) 사용자: 직접 상태를 보기 전에는 모르겠음. 단순 시각 작업은 백로그에서 따로 둠.

### 이미지 실루엣 그림자 `(수집 260812)`
- 상태: backlog (부분 구현 — 다크는 img `drop-shadow`, 라이트는 정적 토큰. 품질 점검)
- 우선순위: P2 — 시각 검수. 화면 보기 전에는 손보지 않음
- 목적: 직사각형 `box-shadow` 대신 이미지 알파를 따라가는 실루엣 그림자. 표지 PNG 가장자리가 박스처럼 뜨면 안 됨
- 화면/진입: Jukebox 카드 `img` filter. `.jukebox-card-inner { box-shadow: none }`. 다크: `brightness(...) drop-shadow(...)`. 라이트: `--color-drop-shadow`
- 시나리오:
  - 기본: 중앙 카드 그림자가 더 진하고, 양옆은 옅어짐
  - 예외: JPG(불투명 사각)는 실루엣=사각형이라 어색할 수 있음
  - 빈 상태: 해당 없음
- 데이터/API: 없음
- 디자인·UX: 라이트 페이드(`opacity()`)와 `drop-shadow`를 한 `filter`에 넣으면 그림자도 같이 흐려짐
- 열린 질문: 현재 다크 구현이 요구를 충족하는지 — 화면 보고 판단
- 원문 메모: 「img 태그 기준 직사각형으로 어색함」
- (추가 260813) 라이트모드 페이드와 같이 시각 그룹으로 분리.

---

## 그룹: 장기 아키텍처 · 비주얼

### 북스파인 · 북셀프 `(수집 260812)`
- 상태: backlog
- 우선순위: P3
- 목적: 노트 두께(페이지 수)를 책등(spine)으로 보여주고, 책장 갤러리처럼 늘어놓아 주크박스와 다른 탐색을 제공한다
- 화면/진입: 새 갤러리 뷰 또는 Jukebox 대체 모드. CSS 토큰 `--color-book-spine` / `--color-book-spine-light`는 Story 책 장식·의미로 이미 있음. 노트 책등 렌더 없음
- 시나리오:
  - 기본: page_count → spine 두께. 책장 그리드에서 표지+책등
  - 예외: 장수 0 · 표지 없음 폴백
  - 빈 상태: 빈 책장 안내
- 데이터/API: 기존 `pageCount` · `size` · 표지 URL. 새 DB 불필요
- 디자인·UX: 3D 책 vs 플랫 스파인. 라이트에서 종이 질감. 공수 큼
- 열린 질문: 주크박스를 대체하는지, 추가 뷰인지
- 원문 메모: 「spine 두께 · 책장 갤러리」

### React 전환 · Notion 완전 이관 · MySQL · 로그인 개선 `(수집 260812)`
- 상태: backlog
- 우선순위: P3
- 목적: 프론트를 React로, 데이터를 Notion 의존에서 자체 DB로, 인증을 본인 로그인으로 옮겨 장기 유지비를 줄인다. 지금은 바닐라 JS SPA + Notion/Cloudinary + 관리자 비밀번호 세션
- 화면/진입: 전 앱. 로그인 `/login` · `ADMIN_PASSWORD` · `AUTH_SECRET`
- 시나리오:
  - 기본: 단계적 이관(API 유지한 채 UI만 / DB만 / 인증만) — 미정 — 확인 필요
  - 예외: Notion 속성명 의존이 많아 한 번에 자르기 어려움
- 데이터/API: `/api/*` Vercel serverless. Notion Integration. Cloudinary. 자체 MySQL 없음
- 디자인·UX: 「애니메이션」원문은 React 전환 시 인터랙션 재구현을 염두
- 열린 질문: 네 가지(React / Notion 이관 / MySQL / 로그인)를 한 에픽으로 둘지 쪼갤지. 지금 바닐라+토큰 구조를 유지하는 기간
- 원문 메모: 「애니메이션 · API 이관 · 자체 DB · 본인 인증」

---

## 그룹: 완료 기록 (Phase 1 등)

### OCR로 날짜 자동 인식 → 제목/메타 `(수집 260812)`
- 상태: done (코드에 이미 있음 · 260813 사용자: 항목 삭제)
- 우선순위: —
- 목적: 페이지 글자에서 날짜를 읽어 페이지 메타에 넣는다
- 화면/진입: PageMetaModal 「이미지에서 인식」→ `ocr_text` + `entry_date` 자동 채움 (`extractEntryDateFromOcr`)
- 메모: 업로드 직후 자동·노트 제목 반영은 원문에 있었으나, 사용자 확인 후 **이미 있는 수동 OCR 날짜 채움으로 충분**하여 활성 백로그에서 제거
- 원문 메모: 「날짜 자동 인식」

### Phase 1 버그·UX 묶음 · 스토리 개편 `(수집 260812)`
- 상태: done (Notion·다수 PR)
- 우선순위: —
- 원문 메모: 「PDF z-index · 취소 · 캘린더 · 터치 · 애니메이션 · 용량 · 실패알림 · Timeline 순서 · visibility · Business · 라이트모드 · 한글 · 스토리」

---

## Inbox

<!-- enrich 후 미분류 없음 -->
