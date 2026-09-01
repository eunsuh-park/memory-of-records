# Backlog

Memory of Records — 요청·아이디어 누적 목록.

> 마지막 enrich: 260901 (2차 — main 반영분 완료 처리)  
> Inbox 잔여: 0  
> 소스: Notion 백로그(정리 기준일 2026-08-07) → capture 260812 → enrich 260812 · 260901  
> 완료 기준 (260901 사용자): 초안 PR이어도 **main에 들어간 작업은 전부 done**. 초안 PR #24는 미머지·폐기. 그 안의 slug·Favorites는 이후 PR로 main에 들어옴. JPG 정규화·페이지 업로드 직후 비공개 체크는 main에 없음.  
> 버전 메모 (260816): 목표 릴리즈 **0.4.5**. OCR은 **사이드 네비 뒤**(당분간 안 함). 카테고리·유형 사전 채우기는 기획 우선.

- 수집: `backlog-capture` · 정리: `backlog-enrich` · 실행: `backlog-to-roadmap` → `Roadmap.md`

### 지금 남은 것

| 그룹 | 남은 항목 |
|------|-----------|
| 업로드 · 안정성 | JPG 정규화 · PDF→JPEG 화질 |
| 태블릿 · 모바일 레이아웃 | 모바일 메모 위치 · 라이트모드 포커스 UX |
| 즐겨찾기 · 북마크 · 네비 | PC 사이드 네비 |
| 공유 · 공개범위 | 페이지 추가 시 비공개 체크 |
| 메타데이터 · OCR · 폼 UX | size 데이터 채움(사용자) · 사용 중 Chip · 유형 사전채우기(기획) · OCR(보류) · 구입처·블로그 |
| 설정 · Period | 설정에서 period 직접 입력 |
| 뷰어 고급 · 페이지 편집 | 순서 재편성 UI · 모자이크 |
| 장기 | 북스파인 · React/MySQL |

우선순위 P0–P3는 이전 로드맵 확정분을 유지한다. 설정·메모 위치는 우선순위를 아직 붙이지 않았다.

---

## 그룹: 업로드 · 안정성

### JPG 이미지 자동 정규화 · PDF→JPEG 화질 `(수집 260812)`
- 상태: backlog
- 우선순위: P1
- 목적: 업로드 페이지 JPG 장변·비율을 맞춰 뷰어에서 크기 들쭉날쭉을 줄이고 화질을 올린다
- 화면/진입: `pages.js` · AddPageModal (이미지·PDF 모두 업로드 직전)
- 시나리오:
  - 기본: 이미지/PDF 모두 업로드 직전 정규화 필수
  - 예외: 이미 작은 이미지는 키우지 않을지 — 미정
- 데이터/API: 클라이언트 캔버스. 초안 PR #24에 장변 3200·품질 0.95·PDF scale 2.5가 있었으나 **미머지**. skill `jpg-normalize-on-upload`도 main에 없음
- 현재 코드: `convertImageDataUrlToJpeg` 기본 품질 **0.9**, 원본 픽셀 그대로 JPEG 변환. 장변 리사이즈·고정 비율 없음. 서버 장당 상한 10MB
- 디자인·UX: 사용자는 설정 UI 없이 “또렷하고 일정”하게만 느끼면 됨
- 열린 질문: 장변 3200이 용량/시간 트레이드오프에 적합한지
- 원문 메모: 「동일한 크기 또는 비율 · PDF→JPEG 화질 향상」

---

## 그룹: 태블릿 · 모바일 레이아웃

### 모바일 포커스 패널 메모 위치 `(수집 260823)`
- 상태: backlog — **이번 개편에서 보류**. 위치 결정이 먼저
- 관련도: 모바일 뷰 · NoteInfoPanel compact
- 목적: 디자이너가 모바일 `jukebox-focus-info`에서 노트 메모를 어디에 둘지 정한 뒤, 데스크톱과 같은 정보를 좁은 화면에서도 읽히게 한다
- 화면/진입: 주크박스 모바일·타블렛 하단 정보 패널(노트명 · 공유/즐겨찾기/수정/페이지 추가/삭제). Timeline / By type / Favorites / Page Scrap 공통 `NoteInfoPanel`
- 시나리오:
  - 기본(현재): 데스크톱은 패널 안 메모 3줄·70자(`MEMO_MAX_CHARS`)·가운데 정렬. 모바일·타블렛·낮은 화면(`max-width: 1024px` 또는 `max-height: 768px`)과 `compact` 미리보기는 CSS로 메모를 **숨김**. 도구모음만 기본 노출. + 버튼은 이번 개편에서 제거됨 (PR #77)
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

### 라이트모드 포커스 UX (흰색 페이드아웃) `(수집 260812)`
- 상태: backlog
- 우선순위: P2
- 목적: 라이트 테마에서 비포커스 노트 페이드가 어색하지 않게
- 화면/진입: Jukebox Cover Flow
- 시나리오:
  - 기본: 중앙 카드는 또렷, 양옆은 배경으로 녹아 들어 포커스가 분명
  - 예외: 다크 모드는 brightness 디밍이 이미 있음 — 라이트만 손봄
- 현재 코드: 다크=`brightness`, 라이트=`opacity`(배경으로 허옇게 페이드). Jukebox.css 「라이트 모드: 비포커스 노트를 어둡게 하지 않고 배경색으로 허옇게 페이드」. 바닥 반사는 라이트에서 제거됨 (별 이슈, PR #63 등)
- 디자인·UX: “흰색으로 날아가는” 느낌이 라이트 배경과 겹쳐 허옇게 보임 — **구현은 됐으나 원 요청은 이 어색함을 고치는 것**
- 열린 질문: opacity 대신 brightness/overlay/마스크 중 무엇이 시안에 맞는지
- 원문 메모: 「라이트모드 포커스 UX 개선」

---

## 그룹: 즐겨찾기 · 북마크 · 네비

### PC 사이드 네비게이션 `(수집 260812)`
- 상태: backlog
- 우선순위: P2
- 목적: 즐겨찾기·최근·Period/Type·설정 패널을 PC 사이드에
- 화면/진입: 데스크톱 셸 (현재는 상단 PageHeader + FilterSubMenu 칩). `/settings` 라우트 없음
- 시나리오:
  - 기본: 넓은 화면에서 좌측(또는 고정 사이드)로 Timeline/By type/Favorites/설정에 바로 감
  - 예외: 모바일은 기존 헤더 드로어 유지
- 관련도: Favorites·Page Scrap 라우트·뷰 토글로 일부 대체됨. 「설정 · Period」그룹과 설정 패널이 겹칠 수 있음
- 열린 질문: Favorites 라우트로 일부 대체 가능한지 · 설정이 사이드 패널인지 별도 페이지인지
- 원문 메모: 「PC 사이드네비게이션 추가」

---

## 그룹: 공유 · 공개범위

### 페이지 추가 시 비공개 체크 `(수집 260812)`
- 상태: backlog — 노트 쪽은 done. **페이지 업로드 직후 체크만 남음**
- 우선순위: P1
- 목적: 페이지를 올릴 때 「이 페이지를 비공개로 업로드」하면 Cloudinary metadata `visible=false`
- 화면/진입: AddPageModal (업로드 폼). 사후 편집은 PageMetaModal에 이미 있음
- 시나리오:
  - 기본: 업로드 폼 체크 → 해당 장만 공개 목록/뷰어에서 숨김
  - 예외: 로그인 사용자만 비공개 장을 볼 수 있는지 — 확인 필요
- 현재 코드: AddPageModal에 `visible` 체크 없음. PageMetaModal에서 올린 뒤 `visible` 편집 가능. 초안 PR #24에 업로드 직후 체크가 있었으나 미머지
- 관련도: 노트 생성 「사이트에 공개」체크는 완료 기록 참고
- 원문 메모: 사용자 후속 요청 「이 노트/페이지를 비공개로 업로드」

### 노트 잠금 속성 `(수집 260812)`
- 상태: cancelled (260812 — 사용자: 진행 안 함)
- 우선순위: —
- 원문 메모: 「잠금 토글 · 미리보기 제한」
- 메모: 로드맵·사용자 할 일에서 제외. 나중에 다시 원하면 Inbox로 재수집.

---

## 그룹: 메타데이터 · OCR · 폼 UX

### 메타데이터·사이즈 데이터 통합 `(수집 260812)`
- 상태: backlog — **코드 비율 로직은 있음. 병목은 Notion 데이터**
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
- 현재 코드: `typeOptions`는 Diary/Planner/Memo 등 11종 (PR #82). Planner를 연간·월간으로 나누지 않음. 모달은 현재 뷰 필터를 시드로 넣지 않음
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
- 데이터/API: Cloudinary derivations vs 새 에셋 업로드 — 미정
- 열린 질문: 뷰어 안 편집인지, 업로드 전 처리인지
- 원문 메모: 「영역 선택 · 처리·저장」

### 페이지 순서 재편성 UI `(수집 260812)`
- 상태: backlog · 우선순위: P2 — **끼워넣기는 main. 전 장 재정렬 UI만 남음**
- 화면/진입: AddPageModal `insertAfterPage` · 순서 UI는 미흡
- 시나리오:
  - 기본: 특정 장 다음에 끼워넣기(됨) · 목록에서 드래그(또는 동등한 UI)로 재정렬(안 됨)
  - 예외: 번호 충돌 시 뒤 페이지 public_id shift (`pages.js`에 shift 로직 있음)
- 현재 코드: 뷰어에서 `insertAfterPage`로 “이 장 다음에 추가” 가능. 전 페이지 순서 재편성 전용 UI는 없음. 업로드 직전 미리보기에서만 순서·삭제
- 원문 메모: 「특정 위치 끼워넣기 · 순서 재편성 UI」

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

## 그룹: 완료 기록

main에 들어간 작업. 요구사항·원문은 남긴다. (260901 — 초안이어도 main이면 done)

### 노트 slug URL · 공유 버튼 `(수집 260812)`
- 상태: done (main · PR #39, 장 단위 #44, 토스트 #46, 닫기 #47 · 260816–260817)
- 우선순위: P1 (완료)
- 목적: 포커스된 노트 하나의 주소를 복사해 바로 그 노트가 열리게 한다
- 화면/진입: 주크박스 NoteInfoPanel(캐러셀) · 뷰어 하단 시트. Bookmark Note는 제외. 로그인 불필요
- 시나리오:
  - 기본: 공유 버튼 → `/note/{title}-{id앞8자}` 절대 URL 클립보드 복사 · 토스트
  - 예외: 기존 `/note/{uuid}`도 그대로 열림. `?p=`로 특정 장. 공유 링크로 연 상세는 닫을 수 있음 (#47)
- 데이터/API: 클라이언트 slug만 (`noteSlug.js` · `copyNoteShareUrl`). Notion 속성 추가 없음
- 원문 메모: 「고유주소 · 공유 버튼」
- (추가 260816) 사용자: 지인 피드백용으로 링크를 주고 싶은데 안 되어 전체 캐러셀만 보여주게 됨

### PDF 업로드 시 커버 페이지 `(수집 260812)`
- 상태: done (main · PR #83, 260825) — 원 Dialog(1p vs 마지막을 Notion 표지로)가 아니라, **첫·마지막 장이 표지인지 체크 + 아니면 표지 이미지를 뷰어 양 끝에 끼워 넣기**로 들어감
- 우선순위: P1 (완료)
- 목적(원): PDF를 페이지로 넣을 때 앞표지로 쓸 페이지(1p vs 마지막)를 고르게 해 수동 작업을 줄인다
- 목적(실선): 올린 첫·마지막 장이 표지가 아니면 노트 표지 이미지를 뷰어 첫/마지막 페이지로 넣는다
- 화면/진입: AddPageModal 미리보기 표지 체크 · `firstPageIsCover` / `lastPageIsCover` · `viewerPages.js`
- 원문 메모: 「1페이지 vs 마지막 페이지 · ⭐⭐⭐」

### 2-Page 뷰 페이지 간격 0 `(수집 260812)`
- 상태: done (main · 2페이지 보기는 BookFlip3D, PR #43/#45. `.note-image-viewer.bookflip-mode .niv-zoom-stage { gap: 0 }`)
- 우선순위: P1 (완료)
- 목적: 양면 보기에서 두 페이지 사이 틈/겹침을 없앤다
- 화면/진입: NoteImageViewer 2페이지 토글 → BookFlip3D
- 참고: 초안 PR #24는 2D `.niv-zoom-stage` gap 0이었고 미머지. 실선은 3D 책장 모드
- 원문 메모: 「두 페이지 사이 겹침 0」

### Notion URL 대신 Cloudinary `public_id` 경로 `(수집 260816)`
- 상태: done (코드 main · 폴더 rename PR #38, 표지 #40, 페이지 #41, 업로드 배정 #79)
- 우선순위: P1 (완료)
- 목적: 앱이 예전 Notion `cover_*_url` / `pdf_folder_url`이 아니라 `notebooks/{public_id}/...`를 보게 한다
- 화면/진입: `noteCovers.js` (`GET /api/readNotebooks?view=covers`) · `notePages.js` (`notebooks/{id}/pages`) · BookFlip3D
- 시나리오: Notion URL 속성은 남아 있을 수 있으나 뷰어·주크박스는 Cloudinary 폴더를 읽음. 새 노트는 public_id 배정 후 그 폴더에 업로드
- 원문 메모: 「Cloudinary rename 후 Notion URL은 읽기만 함」

### 이미지 실루엣 그림자 `(수집 260812)`
- 상태: done (main · Cover Flow img `drop-shadow`, 직사각형 box-shadow 제거. PR #3 이후 Jukebox.css에 정착)
- 우선순위: P2 (완료)
- 목적: 직사각형 box-shadow 대신 이미지 알파 실루엣 그림자
- 화면/진입: Jukebox 카드 img filter · `--jukebox-shadow-opacity`로 중앙이 진하고 양옆이 옅게
- 원문 메모: 「img 태그 기준 직사각형으로 어색함」

### 노트 비공개 업로드 체크 `(수집 260812)`
- 상태: done (노트: AddNoteFab 「사이트에 공개」체크 해제 → `visible=false`. 목록 숨김은 PR #5부터. 페이지 **사후** 편집은 PageMetaModal)
- 우선순위: P1 (완료 — 페이지 업로드 직후 체크는 위 남은 항목)
- 목적: 「이 노트를 비공개로 업로드」시 visible=false
- 화면/진입: AddNoteFab 2단계
- 원문 메모: 사용자 후속 요청

### 페이지 업로드 부분 실패 조사 & 수정 `(수집 260812)`
- 상태: done (코드 main · PR #22, 260810 · 후속 스키마 중단 방지 #81)
- 우선순위: P0 (완료)
- 목적: Cloudinary만 성공하고 Notion page_count/메모가 비는 “Load Failed”를 없앤다
- 화면/진입: AddPageModal → `/api/writePages` · Notion pdf_folder_url/page_count
- 시나리오:
  - 기본: 장마다 업로드 후 Notion을 점진 반영
  - 예외: 중간 실패 시 이미 올라간 장수만큼 Notion에 남기고 부분 성공 토스트
- 데이터/API: `linkNotePages` 재시도 · 메모 스키마 불일치 시 명시 에러
- 디자인·UX: 사용자는 “일부만 저장됨” 문구로 상태를 알 수 있어야 함
- 원문 메모: 「Load Failed · 페이지 미생성 · 메모 비움 · Cloudinary 정상」

### 업로드 진행률 표시 + 완료 Dialog `(수집 260812)`
- 상태: done (260814 · PR #35)
- 우선순위: P1 (완료)
- 목적: 긴 업로드 동안 진행을 보여주고, 끝나면 Dialog로 성공/부분실패/실패를 확인받게 한다
- 화면/진입: AddPageModal 업로드 오버레이 → 완료 시 Dialog. 새 노트 표지 업로드 실패에도 동일 Dialog
- 시나리오:
  - 기본: N/M + 진행바(또는 동등한 비율 표시) → 완료 Dialog → 확인 후 닫기
  - 예외: 부분 성공/전체 실패 메시지를 Dialog 본문에 구분. 실패 원인 한 줄 (표지만 성공·본문 실패, N장 중 M장, 장수 정보 저장 실패 등)
- 데이터/API: 기존 upload 루프의 i/total 재사용
- 디자인·UX: Dialog 컴포넌트 재사용 · Primary 확인 버튼 하나면 충분
- (추가 260814) 사용자: 실패 시 원인 간단히. 예: 표지 업로드만 성공하고 내부 페이지는 실패
- 원문 메모: 「Progress bar · 완료 Dialog · 예상 3-4h」
- Backlog 참조: [Roadmap 업로드 진행률](Roadmap.md)

### 태블릿 FAB · 필터 칩 · 라벨 `(수집 260812)`
- 상태: done (main · PR #22)
- 우선순위: P0 (완료)
- 목적: 세로 태블릿에서 FAB가 사라지고 칩/라벨이 잘리는 UX 해소
- 화면/진입: FilterSubMenu · AddNoteFab · Jukebox.css
- 시나리오: 필터 접힘과 무관하게 FAB Primary 표시 · 칩 수평 스크롤 · 라벨 ellipsis/title
- 원문 메모: 「FAB 항상 · 칩 오버플로우 · 라벨 동적 조정 · Sprint 3 묶음」

### 모바일 뷰 수정 · 인디케이터 · 푸터 `(수집 260812)`
- 상태: done (main · PR #23 흡수, 260812. 이후 푸터 제거 #53, 모바일 패널 #77)
- 우선순위: P1 (완료)
- 목적: 모바일에서 푸터 가시성, 노트 인디케이터(중앙 포커스 캡슐+페이드), 캐러셀 위글 제거, 화살표 숨김
- 화면/진입: Jukebox · NoteInfoPanel · Footer
- 시나리오: 스와이프만으로 이동 · 인디케이터 focused 항상 중앙
- 디자인·UX: 시안형 pill/dot 인디케이터
- 원문 메모: 「이미지 크기/네비 겹침 · 노트 추가 버튼 · 모바일 디자인 수정」

### 노트 즐겨찾기 토글 `(수집 260812)`
- 상태: done (main · PR #19–20)
- 우선순위: P0 (완료)
- 목적: 노트를 favorites로 표시/해제
- 화면/진입: NoteInfoPanel · `/api/writeNotebooks` (`op: favorite`)
- 원문 메모: 「Notion favorites · 토글 UI · boolean」

### Favorites 모아보기 페이지 · 네비 진입 `(수집 260812)`
- 상태: done (main · PR #26/#27, 260812)
- 우선순위: P0 (완료)
- 목적: favorites===true 노트만 주크박스로 모아 보고, Timeline/By type과 같이 전환한다
- 화면/진입: `/favorites` · FilterSubMenu 뷰 토글 · PageHeader/드로어 링크
- 시나리오:
  - 기본: 별 표시한 노트만 캐러셀 · 비어 있으면 안내
  - 예외: 공개(visibility) 필터와 동일 규칙
- 데이터/API: `getFavoriteNotes` · `FAVORITES_PATH`
- 디자인·UX: 뷰 모드에 「Favorites」라벨 · 칩은 All(Favorites) 하나
- 원문 메모: 「PC 사이드네비 즐겨찾기 바로가기」와도 연결 · 우선 웹 라우트부터

### 페이지 북마크 `(수집 260812)`
- 상태: done (main · PR #21)
- 우선순위: P0 (완료)
- 목적: 페이지 단위 is_bookmarked 토글
- 화면/진입: ViewerChrome · Cloudinary metadata
- 원문 메모: 「bookmarked · 토글 UI」

### 북마크 페이지 가상 노트 모아보기 `(수집 260812)`
- 상태: done (main · PR #29, 이후 Page Scrap `/page-scrap` · PR #82)
- 우선순위: P1 (완료)
- 목적: 모든 유저 기본 **Bookmark Note**에 북마크 페이지를 모은다
- 화면/진입: Jukebox 선두 카드였다가 Page Scrap 뷰로 분리. 가상 노트로 뷰어 진입
- 데이터/API: `GET /api/readPages?op=bookmarked` · 로컬 PNG 표지 · 페이지 정보에 원본 노트 링크

### 제스처 네비게이션 `(수집 260812)`
- 상태: done (Notion·코드상 스와이프/터치 스크롤 존재)
- 우선순위: P1 (완료로 기록)
- 원문 메모: 「좌우 스와이프로 페이지 넘기기」

### 포커스 패널 노트 삭제 → 휴지통 DB `(수집 260813)`
- 상태: done (코드 260813 · PR #31 · 휴지통 DB 연결은 사용자)
- 우선순위: P1 (완료)
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

<!-- enrich 260901: 미분류 없음. 새 요청만 여기에 쌓는다 -->
