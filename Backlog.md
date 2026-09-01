# Backlog

Memory of Records — 요청·아이디어 누적 목록.

> 마지막 enrich: 260901  
> Inbox 잔여: 0  
> 소스: Notion 백로그(정리 기준일 2026-08-07) → capture 260812 → enrich 260812 · 260901  
> 코드 반영 참고: main에 PR #19–22 · #26(Favorites) · #27(Favorites UI) · #29(Bookmark Note) 머지됨. 이번 정리에서 #23(모바일 인디케이터) 합침. 이후 main: #38 Cloudinary 폴더, #82 By type 유형, #83 뷰어 표지 장 플래그, #84 모바일 이미지 로딩. 미머지 초안: PR #24(slug·JPG·비공개 업로드·2-page gap 등 — slug는 이후 main에 별도로 들어온 상태). #25·#28은 main에 흡수되어 폐기.  
> 버전 메모 (260816): 현재 목표 릴리즈 **0.4.5**. OCR은 **사이드 네비 뒤**로 미룸(당분간 안 함). 카테고리·유형 사전 채우기는 기획 우선·우선순위 낮음. 다음 코드 작업은 **노트별 공유 URL 복사**(로드맵 `doing`. 코드에는 공유 버튼·`copyNoteShareUrl`이 있음 — 완료 여부는 로드맵 확인).

- 수집: `backlog-capture` · 정리: `backlog-enrich` · 실행: `backlog-to-roadmap` → `Roadmap.md`

### 그룹 한눈에

| 그룹 | 남은 핵심 | 비고 |
|------|-----------|------|
| 업로드 · 안정성 | PDF 커버 페이지 선택 · JPG 정규화 · Notion URL 재정렬 | 부분실패·진행률은 done |
| 태블릿 · 모바일 레이아웃 | 2-Page gap · 라이트모드 포커스 · 실루엣 그림자 · **모바일 메모 위치** | FAB·인디케이터는 done |
| 즐겨찾기 · 북마크 · 네비 | PC 사이드 네비 | 토글·모아보기·Bookmark Note는 done |
| 공유 · 공개범위 | 비공개 업로드 체크 · 공유 URL(로드맵) | 잠금은 cancelled |
| 메타데이터 · OCR · 폼 UX | size 데이터 채움 · 사용 중 Chip · OCR(보류) · 유형 사전채우기(기획) | size는 사용자 작업 |
| 설정 · Period | **설정에서 period 직접 입력** | 라우트 없음. Inbox에서 승격 |
| 뷰어 고급 · 페이지 편집 | 페이지 삽입·순서 UI · 모자이크 | 삽입 API는 일부 존재 |
| 노트 관리 · 휴지통 | — | 삭제는 done. 휴지통 열람·복원은 범위 밖 |
| 장기 아키텍처 · 비주얼 | 북스파인 · React/MySQL | P3 |

우선순위 P0–P3는 이전 로드맵 확정분을 유지한다. 이번 enrich에서 새로 승격한 2건은 우선순위를 붙이지 않았다.

---

## 그룹: 업로드 · 안정성

### 페이지 업로드 부분 실패 조사 & 수정 `(수집 260812)`
- 상태: done (코드 main · PR #22, 260810)
- 우선순위: P0 (완료)
- 목적: Cloudinary만 성공하고 Notion page_count/메모가 비는 “Load Failed”를 없앤다
- 화면/진입: AddPageModal → `/api/writePages` · Notion pdf_folder_url/page_count
- 시나리오:
  - 기본: 장마다 업로드 후 Notion을 점진 반영
  - 예외: 중간 실패 시 이미 올라간 장수만큼 Notion에 남기고 부분 성공 토스트
- 데이터/API: `linkNotePages` 재시도 · 메모 스키마 불일치 시 명시 에러
- 디자인·UX: 사용자는 “일부만 저장됨” 문구로 상태를 알 수 있어야 함
- 열린 질문: 프로덕션에서 재발 여부 모니터링
- 원문 메모: 「Load Failed · 페이지 미생성 · 메모 비움 · Cloudinary 정상」

### 업로드 진행률 표시 + 완료 Dialog `(수집 260812)`
- 상태: done (260814)
- 우선순위: P1 — 부분실패 수정 다음으로 피드백 공백이 큼
- 목적: 긴 업로드 동안 진행을 보여주고, 끝나면 Dialog로 성공/부분실패/실패를 확인받게 한다
- 화면/진입: AddPageModal 업로드 오버레이 → 완료 시 Dialog. 새 노트 표지 업로드 실패에도 동일 Dialog
- 시나리오:
  - 기본: N/M + 진행바(또는 동등한 비율 표시) → 완료 Dialog → 확인 후 닫기
  - 예외: 부분 성공/전체 실패 메시지를 Dialog 본문에 구분. 실패 원인 한 줄 (표지만 성공·본문 실패, N장 중 M장, 장수 정보 저장 실패 등)
- 데이터/API: 기존 upload 루프의 i/total 재사용
- 디자인·UX: Dialog 컴포넌트 재사용 · Primary 확인 버튼 하나면 충분
- 열린 질문: —
- (추가 260814) 사용자: 실패 시 원인 간단히. 예: 표지 업로드만 성공하고 내부 페이지는 실패
- 원문 메모: 「Progress bar · 완료 Dialog · 예상 3-4h」
- Backlog 참조: [Roadmap 업로드 진행률](Roadmap.md)

### PDF 업로드 시 커버 페이지 선택 `(수집 260812)`
- 상태: backlog
- 우선순위: P1
- 목적: PDF를 페이지로 넣을 때 앞표지로 쓸 페이지(1p vs 마지막)를 고르게 해 수동 작업을 줄인다
- 화면/진입: AddPageModal PDF 변환 후 / 또는 표지 업로드 플로우
- 시나리오:
  - 기본: 변환 완료 후 Dialog — 「첫 페이지 / 마지막 페이지」
  - 예외: 페이지 1장뿐이면 Dialog 생략
- 데이터/API: 선택 결과를 coverFront 업로드에 연결할지, Content 순서만 바꿀지 미정 — 확인 필요
- 디자인·UX: 미리보기 썸네일 2장이면 선택이 쉬움
- 현재 코드 (260901 점검): AddPageModal·뷰어에 `firstPageIsCover` / `lastPageIsCover`가 있다(PR #83). 의미는 「올린 첫·마지막 장이 표지인가」이고, 아니면 노트 표지 이미지를 뷰어 양 끝에 끼워 넣는다. **원 요청(PDF 장 중 어느 장을 Notion 표지로 쓸지)과는 다른 축**이다.
- 열린 질문:
  - “커버”가 Notion `cover_front_url`인지, 뷰어 1페이지 정렬인지
  - PR #83 플래그만으로 충분한지, PDF 변환 후 1p/마지막을 표지로 고르는 Dialog가 여전히 필요한지
- 원문 메모: 「1페이지 vs 마지막 페이지 · ⭐⭐⭐」

### JPG 이미지 자동 정규화 · PDF→JPEG 화질 `(수집 260812)`
- 상태: backlog (초안 PR #24에 장변 3200·품질 0.95·scale 2.5 포함)
- 우선순위: P1
- 목적: 업로드 페이지 JPG 장변·비율을 맞춰 뷰어에서 크기 들쭉날쭉을 줄이고 화질을 올린다
- 화면/진입: `pages.js` normalize · AddPageModal
- 시나리오: 이미지/PDF 모두 업로드 직전 정규화 필수
- 데이터/API: 클라이언트 캔버스 · skill `jpg-normalize-on-upload`(파일 유무 260901 기준 미확인)
- 현재 코드: `convertImageDataUrlToJpeg` 기본 품질 **0.9**, 원본 픽셀 그대로 JPEG 변환. 장변 리사이즈·고정 비율은 없음. 서버 장당 상한 10MB.
- 디자인·UX: 사용자는 설정 UI 없이 “또렷하고 일정”하게만 느끼면 됨
- 열린 질문: 장변 3200이 용량/시간 트레이드오프에 적합한지
- 원문 메모: 「동일한 크기 또는 비율 · PDF→JPEG 화질 향상」

### Notion URL을 새 Cloudinary public_id에 맞추기 `(수집 260816)`
- 상태: backlog
- 우선순위: P1 — 0.4.5 폴더 정리 직후 남은 일. 앱이 예전 URL을 보고 있음
- 목적: `cover_*_url` / `pdf_url` / `pdf_folder_url`을 `notebooks/{public_id}/...`로 맞춤
- 화면/진입: Notion `all_notebooks` · 이미지 뷰어 / PdfModal 폴백 · BookFlip3D는 이미 `notebooks/{id}/cover_front` 경로를 가정
- 시나리오:
  - 기본: 복원한 `2008_일기장_2`(DIRY-2008-0003)만 이미 갱신됨. 나머지 69권은 예전 public_id
  - 예외: 앱이 URL 대신 `public_id`로 경로를 조립하면 Notion 일괄 갱신 없이 폴백 가능 — 확인 필요
- 데이터/API: Notion URL 속성은 읽기 전용으로 쓰임. Cloudinary rename은 PR #38로 완료
- 열린 질문: 일괄 갱신할지, 앱이 `public_id`만으로 경로를 조립하게 바꿀지
- 원문 메모: 「Cloudinary rename 후 Notion URL은 읽기만 함」

---

## 그룹: 태블릿 · 모바일 레이아웃

### 태블릿 FAB · 필터 칩 · 라벨 `(수집 260812)`
- 상태: done (main · PR #22)
- 우선순위: P0 (완료)
- 목적: 세로 태블릿에서 FAB가 사라지고 칩/라벨이 잘리는 UX 해소
- 화면/진입: FilterSubMenu · AddNoteFab · Jukebox.css
- 시나리오: 필터 접힘과 무관하게 FAB Primary 표시 · 칩 수평 스크롤 · 라벨 ellipsis/title
- 원문 메모: 「FAB 항상 · 칩 오버플로우 · 라벨 동적 조정 · Sprint 3 묶음」

### 모바일 뷰 수정 · 인디케이터 · 푸터 `(수집 260812)`
- 상태: done (main · PR #23 흡수, 260812)
- 우선순위: P1
- 목적: 모바일에서 푸터 가시성, 노트 인디케이터(중앙 포커스 캡슐+페이드), 캐러셀 위글 제거, 화살표 숨김
- 화면/진입: Jukebox · NoteInfoPanel · Footer
- 시나리오: 스와이프만으로 이동 · 인디케이터 focused 항상 중앙
- 디자인·UX: 시안형 pill/dot 인디케이터
- 열린 질문: 인디케이터 높이와 시안 H값 정밀 매칭
- 원문 메모: 「이미지 크기/네비 겹침 · 노트 추가 버튼 · 모바일 디자인 수정」

### 모바일 포커스 패널 메모 위치 `(수집 260823)`
- 상태: backlog — **이번 개편에서 보류**. 위치 결정이 먼저
- 관련도: 모바일 뷰 · NoteInfoPanel compact
- 목적: 디자이너가 모바일 `jukebox-focus-info`에서 노트 메모를 어디에 둘지 정한 뒤, 데스크톱과 같은 정보를 좁은 화면에서도 읽히게 한다
- 화면/진입: 주크박스 모바일·타블렛 하단 정보 패널(노트명 · 공유/즐겨찾기/수정/페이지 추가/삭제). Timeline / By type / Favorites / Page Scrap 공통 `NoteInfoPanel`
- 시나리오:
  - 기본(현재): 데스크톱은 패널 안 메모 3줄·70자(`MEMO_MAX_CHARS`)·가운데 정렬. 모바일·타블렛·낮은 화면(`max-width: 1024px` 또는 `max-height: 768px`)과 `compact` 미리보기는 CSS로 메모를 **숨김**. 도구모음만 기본 노출. + 버튼은 이번 개편에서 제거됨
  - 예외: 메모가 비면 `<p class="jukebox-focus-info__memo">` 자체를 안 그림. Bookmark Note·데모 노트는 공유/즐겨찾기/편집 없음
  - 빈 상태: 제목+도구모음만. 갤러리 높이는 `--jukebox-focus-info-min-h`(제목 1줄 + gap + 도구모음 32px)를 먼저 확보
- 데이터/API: Notion 노트 `description`/`memo`. 새 API 없음
- 디자인·UX: 패널 고정 높이 vs 갤러리 높이 트레이드오프. 후보(미정): 도구모음 아래(패널이 커짐) · 제목 탭으로 펼침 · 뷰어 시트에만 · 별도 오버레이
- 열린 질문:
  - 타블렛(1024 이하)도 모바일과 같이 숨길지, 중간 폭에서는 데스크톱처럼 3줄을 보일지
  - 70자·3줄 클램프를 모바일에서도 유지할지, 더 짧게 할지
  - 메모를 다시 넣으면 `--jukebox-focus-info-min-h`를 늘릴지, 갤러리를 줄일지
- 원문 메모: 「메모를 어떤 위치에 표시해야 할지는 고민할 필요가 있으니 backlog에 정리해줘.」
- (추가 260823) 이번 개편에서는 + 버튼을 없애고 도구모음만 기본 노출하며, 메모 배치는 보류한다.

### 2-Page 뷰 페이지 간격 0 `(수집 260812)`
- 상태: backlog (초안 PR #24)
- 우선순위: P1
- 목적: 양면 보기에서 두 페이지 사이 틈/겹침을 없앤다
- 화면/진입: NoteImageViewer `.niv-zoom-stage`
- 시나리오:
  - 기본: spread-mode에서 두 장 사이 gap 0
  - 예외: 단면·줌 중에도 틈이 보이면 안 됨 — 확인 필요
- 현재 코드: `.niv-zoom-stage` 기본 `gap: var(--space-3)`, 640px 이하 `var(--space-2)`. `bookflip-mode`만 `gap: 0`
- 원문 메모: 「두 페이지 사이 겹침 0」

### 라이트모드 포커스 UX (흰색 페이드아웃) `(수집 260812)`
- 상태: backlog
- 우선순위: P2
- 목적: 라이트 테마에서 비포커스 노트 페이드가 어색하지 않게
- 화면/진입: Jukebox Cover Flow opacity
- 시나리오:
  - 기본: 중앙 카드는 또렷, 양옆은 배경으로 녹아 들어 포커스가 분명
  - 예외: 다크 모드는 brightness 디밍이 이미 있음 — 라이트만 손봄
- 현재 코드: 다크=`brightness`, 라이트=`opacity`(배경으로 허옇게 페이드). `filterNotesGallery` / 카드 `--jukebox-opacity`
- 디자인·UX: “흰색으로 날아가는” 느낌이 라이트 배경과 겹쳐 허옇게 보임
- 열린 질문: opacity 대신 brightness/overlay/마스크 중 무엇이 시안에 맞는지
- 원문 메모: 「라이트모드 포커스 UX 개선」

### 이미지 실루엣 그림자 `(수집 260812)`
- 상태: backlog (부분적으로 drop-shadow 이미 사용 중 — 품질 점검)
- 우선순위: P2
- 목적: 직사각형 box-shadow 대신 이미지 알파 실루엣 그림자
- 화면/진입: Jukebox 카드 img filter
- 현재 코드: `--color-drop-shadow`(다크 0 10px 24px / 라이트 0 3px 8px). 중앙에서 진하고 양옆으로 갈수록 `--jukebox-shadow-opacity`로 옅게. 카드 box-shadow는 쓰지 않음
- 열린 질문: 현재 구현이 요구를 충족하는지 디자인 검수
- 원문 메모: 「img 태그 기준 직사각형으로 어색함」

---

## 그룹: 즐겨찾기 · 북마크 · 네비

### 노트 즐겨찾기 토글 `(수집 260812)`
- 상태: done (main · PR #19–20)
- 우선순위: P0 (완료) — 확정 의사결정 1순위 중 토글分
- 목적: 노트를 favorites로 표시/해제
- 화면/진입: NoteInfoPanel · `/api/writeNotebooks` (`op: favorite`)
- 원문 메모: 「Notion favorites · 토글 UI · boolean」

### Favorites 모아보기 페이지 · 네비 진입 `(수집 260812)`
- 상태: done (main · PR #26/#27, 260812)
- 우선순위: P0 — 토글은 있었으나 모아보기 화면이 main에 없었음
- 목적: favorites===true 노트만 주크박스로 모아 보고, Timeline/By type과 같이 전환한다
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
- 목적: 페이지 단위 is_bookmarked 토글
- 화면/진입: ViewerChrome · Cloudinary metadata
- 원문 메모: 「bookmarked · 토글 UI」

### 북마크 페이지 가상 노트 모아보기 `(수집 260812)`
- 상태: done (main · PR #29, 260812)
- 우선순위: P1
- 목적: 모든 유저 기본 **Bookmark Note**에 북마크 페이지를 모은다
- 화면/진입: Jukebox 선두 카드 · `/note/virtual:bookmarks` (현재 라우트는 Page Scrap `/page-scrap`와 가상 노트로 진입)
- 데이터/API: `GET /api/readPages?op=bookmarked` · 로컬 PNG 표지 · 페이지 정보에 원본 노트 링크

### 제스처 네비게이션 `(수집 260812)`
- 상태: done (Notion·코드상 스와이프/터치 스크롤 존재)
- 우선순위: P1 (완료로 기록)
- 원문 메모: 「좌우 스와이프로 페이지 넘기기」

### PC 사이드 네비게이션 `(수집 260812)`
- 상태: backlog
- 우선순위: P2
- 목적: 즐겨찾기·최근·Period/Type·설정 패널을 PC 사이드에
- 화면/진입: 데스크톱 셸 (현재는 상단 PageHeader + FilterSubMenu 칩). `/settings` 라우트 없음
- 시나리오:
  - 기본: 넓은 화면에서 좌측(또는 고정 사이드)로 Timeline/By type/Favorites/설정에 바로 감
  - 예외: 모바일은 기존 헤더 드로어 유지
- 관련도: Favorites 라우트·뷰 토글로 일부 대체됨. 「설정 · Period」그룹과 설정 패널이 겹칠 수 있음
- 열린 질문: Favorites 라우트로 일부 대체 가능한지 · 설정이 사이드 패널인지 별도 페이지인지
- 원문 메모: 「PC 사이드네비게이션 추가」

---

## 그룹: 공유 · 공개범위

### 노트 slug URL · 공유 버튼 `(수집 260812)`
- 상태: roadmap (260816 — 사용자: 지금 이걸로)
- 우선순위: P1 — 지인 피드백용 링크가 없어서 주크박스 전체만 보여주게 됨
- 목적: 포커스된 노트 하나의 주소를 복사해 바로 그 노트가 열리게 한다
- 화면/진입: 주크박스 NoteInfoPanel(캐러셀) · 뷰어 하단 시트. Bookmark Note는 제외. 로그인 불필요
- 시나리오:
  - 기본: 공유 버튼 → `/note/{title}-{id앞8자}` 절대 URL 클립보드 복사 · 토스트
  - 예외: 기존 `/note/{uuid}`도 그대로 열림. 전체 페이지 진입 시 주소창을 slug로 맞춤
- 데이터/API: 클라이언트 slug만. Notion 속성 추가 없음. 초안 PR #24의 slug 유틸만 재사용(Favorites/JPG/비공개/gap은 가져오지 않음)
- 현재 코드 (260901 점검): `src/utils/noteSlug.js` · Jukebox 포커스 공유 · ViewerChrome `niv-share-note` · `?p=` 장 단위 공유. Roadmap 수락 기준은 아직 체크 전(`doing`)
- 원문 메모: 「고유주소 · 공유 버튼」
- (추가 260816) 사용자: 지인 피드백용으로 링크를 주고 싶은데 안 되어 전체 캐러셀만 보여주게 됨. 노트별 공유 URL 복사를 다음에 하자

### 노트/페이지 비공개 업로드 체크 `(수집 260812)` *(대화 후속 요청, 초안 PR #24)*
- 상태: backlog
- 우선순위: P1
- 목적: 「이 노트/페이지를 비공개로 업로드」체크 시 visible=false
- 화면/진입: AddNoteFab · AddPageModal · api/pages metadata · PageMetaModal(이미 `visible` 편집)
- 시나리오:
  - 기본: 업로드 폼에서 체크 → Notion/Cloudinary `visible=false` → 공개 목록에서 숨김
  - 예외: 로그인 사용자만 비공개 노트를 볼 수 있는지 — 확인 필요
- 현재 코드: AddNoteFab 2단계 「사이트에 공개」(체크 해제 시 목록에서 숨김). 페이지 추가는 PageMetaModal에서 사후 편집. **업로드 직후 페이지 단위 체크는 초안 PR #24 쪽**
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
- 목적: 기존 노트 size를 정확히 채우고, 사이즈별 비율 렌더를 안정화
- 화면/진입: `noteSize.js`는 이미 비율 로직 있음 → **데이터 채움이 병목**. AddNoteFab 크기 필드(자유 입력 + datalist)
- 시나리오: size 있는 노트는 박스가 규격대로 · 없으면 이미지 비율 폴백
- 데이터/API: Notion `size` 프로퍼티
- 디자인·UX: 뷰어에서 노트마다 들쭉날쭉한 여백이 줄어듦
- 열린 질문: 누락 size 목록을 뽑는 점검 스크립트 필요 여부
- 원문 메모: 「기존 노트 사이즈 정확히 입력 · 비율 렌더링」
- **사용자 작업:** Notion에서 기존 노트 size 값 채우기

### 카테고리별 노트 추가 모달 사전 채우기 `(수집 260812)`
- 상태: backlog — **기획 먼저**. 스콥이 작지 않으면 더 뒤로
- 우선순위: P3 (260816 — 사용자: 우선순위 높지 않음)
- 목적(초기 수집): Timeline/By type 현재 필터를 새 노트 모달 Period/Type에 반영
- 목적(260816 사용자 요점): 유형이 세분화된 뒤, 예) **PLNR이 연간 플래너면** 시작일·종료일을 그 해 1/1–12/31로 자동 설정
- 화면/진입: AddNoteFab · 노트 유형(세분화 필요) · period_start / period_end
- 의존: 노트 유형 세분화(연간/월간 플래너 등). 유형만 PLNR이면 연간인지 알 수 없음 → 작은 기능이 아님
- 현재 코드: `typeOptions`는 Diary/Planner/Memo 등 11종. Planner를 연간·월간으로 나누지 않음. 모달은 현재 뷰 필터를 시드로 넣지 않음
- 관련도: 바로 아래 「노트 타입별 사전 설정」과 같은 기획 묶음
- 원문 메모: 「현재 뷰의 카테고리 자동 반영」
- (추가 260816) 사용자: 기획을 우선. 스콥이 크지 않으면 이것도 뒤로 쭉. 우선순위 높지 않음. 연간 플래너 날짜 자동설정이 실제 의도. 유형 세분화가 필요해 보여서 미루고 싶음

### 노트 타입별 사전 설정 `(수집 260812)`
- 상태: backlog — 위 사전 채우기와 **같은 기획 묶음**
- 우선순위: P3
- 목적: 유형(세분화 후)에 따라 시작일·종료일 등 기본값을 채운다. 예: 연간 플래너 → 해당 연도 1/1–12/31
- 원문 메모: 「기본값 자동 채우기」
- (추가 260816) 카테고리 사전 채우기의 실제 스콥과 겹침. 기획 전까지 구현하지 않음

### 스마트 OCR 영역 감지 `(수집 260812)`
- 상태: backlog — **당분간 안 함**. PC 사이드 네비 **뒤**
- 우선순위: P3 (260816 — 사용자: 사이드 네비보다도 뒤)
- 목적: 업로드 후 스캔 영역 자동 감지 → 수정 UI → OCR 재생성
- 화면/진입: AddPageModal / PageMetaModal OCR
- 현재 코드: `src/services/ocr.js` Tesseract.js(한+영) → `ocr_text` / `entry_date` 후보. **영역 감지·크롭 UI는 없음**. PageMetaModal에서 텍스트 수정·재인식만
- 열린 질문: 감지 알고리즘(클라이언트 vs 서버) · 영역 저장 포맷
- 원문 메모: 「사전 스캔 영역 · 수정 UI · OCR 재생성」
- (추가 260816) 한때 v1.0.0으로 적었으나, 사용자: OCR은 당분간 안 함. **사이드 네비 뒤로 미뤄**

### OCR로 날짜 자동 인식 → 제목/메타 `(수집 260812)`
- 상태: backlog — 영역 감지와 같이, 사이드 네비 뒤
- 우선순위: P3
- 현재 코드: OCR 결과에서 첫 유효 날짜를 YYYY-MM-DD로 뽑아 `entry_date` 후보에 넣음. 노트 제목/period_start로 올리지는 않음
- 원문 메모: 「날짜 자동 인식」
- (추가 260816) 사용자: OCR 묶음 전부 당분간 안 함

### 「사용 중인 노트」Chip `(수집 260812)`
- 상태: backlog
- 우선순위: P2
- 목적: period_end null → 우측 상단 Chip
- 화면/진입: 주크박스 카드 또는 NoteInfoPanel. 폼에는 이미 있음
- 시나리오:
  - 기본: `period_end`가 비어 있으면 「사용 중」Chip
  - 예외: 종료일이 있는 노트는 Chip 없음. Bookmark Note 등 가상 노트는 대상 아님
- 현재 코드: AddNoteFab 「아직 사용 중」체크(`stillInUse: !periodEnd`)만. 목록/포커스 패널 Chip은 없음. FilterChip 컴포넌트는 필터용
- 디자인·UX: 「우측 상단」이 카드 위인지 패널인지는 시안 확인. FilterChip과 역할이 다름 — 상태 배지
- 열린 질문: 카드 위 vs 포커스 패널 vs 뷰어. 카피 「사용 중」고정인지
- 원문 메모: 「사용 중인 노트 상태 표시」

### 구입처 · 블로그 링크 속성 `(수집 260812)`
- 상태: backlog
- 우선순위: P3 — **Notion 속성 추가(사용자)** 후 UI
- 화면/진입: 노트 폼 · 정보 패널 또는 별도 모아보기
- 데이터/API: Notion 속성 없음(예정). 에이전트가 스키마를 대신 넣을 수 없음
- 원문 메모: 「브랜드/구입처 · 블로그 URL 모아보기」

---

## 그룹: 설정 · Period

### 설정 페이지에서 period 구분 직접 입력 `(수집 260814)`
- 상태: backlog — Inbox에서 승격 (enrich 260901)
- 관련도: Timeline 필터 · AddNoteFab 시기 셀렉트 · PC 사이드 네비의 「설정 패널」
- 목적: 사용자가 설정에서 생애 시기(period) 목록을 직접 나누어 넣고, Timeline 칩·노트 폼이 그 목록을 쓰게 한다
- 화면/진입: 설정 페이지(**라우트 없음**. `router.js`에 `/settings` 없음). 현재 Timeline 필터·노트 폼 period는 `src/data/periodOptions.js`에 하드코딩
- 시나리오:
  - 기본: 설정에서 구분을 추가·수정·삭제·정렬 → Timeline `/timeline/:value` 칩과 AddNoteFab 「시기」셀렉트가 같은 목록을 씀
  - 기본값(현재 구분 + work): Elementary School, Middle & High School, University, After School, **Work**
  - 예외: 이미 노트가 붙어 있는 period를 삭제·개명하면 Notion `period_name` 태그와 어긋남
  - 빈 상태: 목록을 비우면 Timeline 칩이 사라짐 — 최소 1개 강제 여부는 미정
- 데이터/API:
  - 현재 코드 값: `elementary` / `middle-high` / `university` / `after-school` (라벨은 Notion 태그와 1:1)
  - AddNoteFab은 하드코딩 라벨을 쓰다가, 메타 `options.period_name`이 오면 Notion 옵션으로 셀렉트를 덮어씀
  - `typeOptions`의 Work(업무용 노트)와 **이름만 같고 축이 다름** — period Work는 시기 태그
- 디자인·UX: 설정 UI는 처음부터 만들어야 함. 입력은 라벨+슬러그인지 라벨만인지는 미정. 공통 Field/Dialog 재사용
- 열린 질문:
  - 저장 위치: 코드 상수 vs Notion multi-select vs 사용자 설정 DB/로컬 — 미정 — 확인 필요
  - Work 슬러그 `work`가 By type `work`(업무용 노트)와 URL에서 섞일 위험
  - 설정이 독립 `/settings`인지, PC 사이드 네비 안 패널인지
  - Notion DB `period_name` 옵션을 누가 맞추나 (사용자 vs 앱이 API로)
- 원문 메모: 「period 값을 사용자가 설정 페이지에서 직접 구분해서 입력할 수 있으면 좋겠음. 기본값은 현재 내가 사용하는 구분으로 하되 거기서 work를 하나 추가해줘.」

---

## 그룹: 뷰어 고급 · 페이지 편집

### 모자이크 `(수집 260812)`
- 상태: backlog · 우선순위: P3
- 목적: 페이지 이미지에서 영역을 가리고 그 결과를 저장한다
- 화면/진입: NoteImageViewer 또는 별도 편집 모드 — 미정
- 시나리오:
  - 기본: 영역 선택 → 모자이크 처리 → 저장
  - 예외: 원본 보존 vs 덮어쓰기 — 미정
- 데이터/API: Cloudinary  derivations vs 새 에셋 업로드 — 미정
- 열린 질문: 뷰어 안 편집인지, 업로드 전 처리인지
- 원문 메모: 「영역 선택 · 처리·저장」

### 페이지 삽입 · 순서 재편성 UI `(수집 260812)`
- 상태: backlog · 우선순위: P2 (삽입 API 일부 존재 — UI/안정화)
- 화면/진입: AddPageModal `insertAfterPage` · 순서 UI는 미흡
- 시나리오:
  - 기본: 특정 장 다음에 끼워넣기 · 목록에서 드래그(또는 동등한 UI)로 재정렬
  - 예외: 번호 충돌 시 뒤 페이지 public_id shift (`pages.js`에 shift 로직 있음)
- 현재 코드: 뷰어에서 `insertAfterPage`로 “이 장 다음에 추가” 가능. 전 페이지 순서 재편성 전용 UI는 없음. 업로드 직전 미리보기에서만 순서·삭제
- 원문 메모: 「특정 위치 끼워넣기 · 순서 재편성 UI」

---

## 그룹: 노트 관리 · 휴지통

### 포커스 패널 노트 삭제 → 휴지통 DB `(수집 260813)`
- 상태: done (코드 260813 · 휴지통 DB 연결은 사용자)
- 우선순위: P1
- 목적: 주크박스 포커스 정보 바에 삭제 아이콘을 두고, Dialog로 한 번 더 확인한 뒤 해당 노트를 휴지통 Notion DB로 옮긴다
- 화면/진입: Timeline / By type / Favorites 주크박스 하단 포커스 패널 (별 · 수정 · 페이지 추가 오른쪽)
- 시나리오:
  - 기본: 삭제 아이콘 → Dialog 「노트를 삭제할까요?」 → 삭제 시 휴지통 DB 이동, 목록에서 사라짐 / 취소 시 닫힘
  - 예외: 휴지통 DB 미설정 시 Dialog 확인 후 안내 토스트. Bookmark Note는 삭제 버튼 없음. 로그인이 필요함
- 데이터/API: `POST /api/writeNotebooks` (`op: trash`) · `NOTION_TRASH_DATABASE_ID`
- 디자인·UX: 수정·페이지 추가와 같은 primary 원형 아이콘 · 사이트 Dialog (브라우저 alert 아님) · 삭제/취소
- 열린 질문: 휴지통 열람·복원 UI는 이번 범위 밖. 삭제 일시(Date) 속성 추가 권장
- 원문 메모: 「빨간원 위치에 삭제 아이콘 · Dialog 삭제/취소 · 휴지통 DB로 이동 · DB 아직 없음」
- Backlog 참조: [Roadmap 포커스 패널 노트 삭제](Roadmap.md)

---

## 그룹: 장기 아키텍처 · 비주얼

### 북스파인 · 북셀프 `(수집 260812)`
- 상태: backlog · 우선순위: P3
- 목적: 노트 두께(페이지 수)가 보이는 spine과, 책장처럼 늘어선 갤러리
- 화면/진입: Jukebox를 대체하거나 병행하는 뷰 — 미정
- 원문 메모: 「spine 두께 · 책장 갤러리」

### React 전환 · Notion 완전 이관 · MySQL · 로그인 개선 `(수집 260812)`
- 상태: backlog · 우선순위: P3
- 목적: 프론트 스택·데이터 소스·인증을 장기적으로 바꿈
- 열린 질문: 한 항목에 여러 마이그레이션이 묶여 있음. 착수 시 분리 필요
- 원문 메모: 「애니메이션 · API 이관 · 자체 DB · 본인 인증」

---

## 그룹: 완료 기록 (Phase 1 등)

### Cloudinary 폴더 마이그레이션 `notebooks/{public_id}` `(수집 260816)`
- 상태: done (260814–260816 · PR #38)
- 우선순위: —
- 목적: v1/v2/v3에 흩어진 표지·페이지·PDF를 Notion public_id 폴더로 rename
- 원문 메모: 「표지 70 · 페이지 388 · PDF 18 · trash에서 2008_일기장_2 복원 · 2026 두 권은 trash에 유지」

### Phase 1 버그·UX 묶음 · 스토리 개편 `(수집 260812)`
- 상태: done (Notion·다수 PR)
- 우선순위: —
- 원문 메모: 「PDF z-index · 취소 · 캘린더 · 터치 · 애니메이션 · 용량 · 실패알림 · Timeline 순서 · visibility · Business · 라이트모드 · 한글 · 스토리」

---

## Inbox

<!-- enrich 260901: 미분류 2건을 그룹으로 옮김. 새 요청만 여기에 쌓는다 -->
