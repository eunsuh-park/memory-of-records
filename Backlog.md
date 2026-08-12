# Backlog

Memory of Records — 요청·아이디어 누적 목록.

> 마지막 enrich: 260812  
> Inbox 잔여: 0  
> 소스: Notion 백로그(정리 기준일 2026-08-07) → capture 260812 → enrich 260812  
> 코드 반영 참고: main에 PR #19–22 머지됨. 미머지 초안: PR #23(모바일 인디케이터), #24(slug·Favorites 페이지·JPG·2-page gap 등)

- 수집: `backlog-capture` · 정리: `backlog-enrich` · 실행: `backlog-to-roadmap` → `Roadmap.md`

---

## 그룹: 업로드 · 안정성

### 페이지 업로드 부분 실패 조사 & 수정 `(수집 260812)`
- 상태: done (코드 main · PR #22, 260810)
- 우선순위: P0 (완료)
- 목적: Cloudinary만 성공하고 Notion page_count/메모가 비는 “Load Failed”를 없앤다
- 화면/진입: AddPageModal → `/api/pages` · Notion pdf_folder_url/page_count
- 시나리오:
  - 기본: 장마다 업로드 후 Notion을 점진 반영
  - 예외: 중간 실패 시 이미 올라간 장수만큼 Notion에 남기고 부분 성공 토스트
- 데이터/API: `linkNotePages` 재시도 · 메모 스키마 불일치 시 명시 에러
- 디자인·UX: 사용자는 “일부만 저장됨” 문구로 상태를 알 수 있어야 함
- 열린 질문: 프로덕션에서 재발 여부 모니터링
- 원문 메모: 「Load Failed · 페이지 미생성 · 메모 비움 · Cloudinary 정상」

### 업로드 진행률 표시 + 완료 Dialog `(수집 260812)`
- 상태: backlog
- 우선순위: P1 — 부분실패 수정 다음으로 피드백 공백이 큼
- 목적: 긴 업로드 동안 진행을 보여주고, 끝나면 Dialog로 성공/부분실패/실패를 확인받게 한다
- 화면/진입: AddPageModal 업로드 오버레이 → 완료 시 Dialog
- 시나리오:
  - 기본: N/M + 진행바(또는 동등한 비율 표시) → 완료 Dialog → 확인 후 닫기
  - 예외: 부분 성공/전체 실패 메시지를 Dialog 본문에 구분
- 데이터/API: 기존 upload 루프의 i/total 재사용
- 디자인·UX: Dialog 컴포넌트 재사용 · Primary 확인 버튼 하나면 충분
- 열린 질문: 노트 생성(표지) 업로드에도 동일 패턴을 쓸지
- 원문 메모: 「Progress bar · 완료 Dialog · 예상 3-4h」

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
- 열린 질문: “커버”가 Notion 표지 이미지인지, 뷰어 1페이지 정렬인지
- 원문 메모: 「1페이지 vs 마지막 페이지 · ⭐⭐⭐」

### JPG 이미지 자동 정규화 · PDF→JPEG 화질 `(수집 260812)`
- 상태: backlog (초안 PR #24에 장변 3200·품질 0.95·scale 2.5 포함)
- 우선순위: P1
- 목적: 업로드 페이지 JPG 장변·비율을 맞춰 뷰어에서 크기 들쭉날쭉을 줄이고 화질을 올린다
- 화면/진입: `pages.js` normalize · AddPageModal
- 시나리오: 이미지/PDF 모두 업로드 직전 정규화 필수
- 데이터/API: 클라이언트 캔버스 · skill `jpg-normalize-on-upload`
- 디자인·UX: 사용자는 설정 UI 없이 “또렷하고 일정”하게만 느끼면 됨
- 열린 질문: 장변 3200이 용량/시간 트레이드오프에 적합한지
- 원문 메모: 「동일한 크기 또는 비율 · PDF→JPEG 화질 향상」

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
- 상태: backlog (초안 PR #23)
- 우선순위: P1
- 목적: 모바일에서 푸터 가시성, 노트 인디케이터(중앙 포커스 캡슐+페이드), 캐러셀 위글 제거, 화살표 숨김
- 화면/진입: Jukebox · NoteInfoPanel · Footer
- 시나리오: 스와이프만으로 이동 · 인디케이터 focused 항상 중앙
- 디자인·UX: 시안형 pill/dot 인디케이터
- 열린 질문: 인디케이터 높이와 시안 H값 정밀 매칭
- 원문 메모: 「이미지 크기/네비 겹침 · 노트 추가 버튼 · 모바일 디자인 수정」

### 2-Page 뷰 페이지 간격 0 `(수집 260812)`
- 상태: backlog (초안 PR #24)
- 우선순위: P1
- 목적: 양면 보기에서 두 페이지 사이 틈/겹침을 없앤다
- 화면/진입: NoteImageViewer `.niv-zoom-stage`
- 시나리오: spread-mode에서 gap 0
- 원문 메모: 「두 페이지 사이 겹침 0」

### 라이트모드 포커스 UX (흰색 페이드아웃) `(수집 260812)`
- 상태: backlog
- 우선순위: P2
- 목적: 라이트 테마에서 비포커스 노트 페이드가 어색하지 않게
- 화면/진입: Jukebox Cover Flow opacity
- 원문 메모: 「라이트모드 포커스 UX 개선」

### 이미지 실루엣 그림자 `(수집 260812)`
- 상태: backlog (부분적으로 drop-shadow 이미 사용 중 — 품질 점검)
- 우선순위: P2
- 목적: 직사각형 box-shadow 대신 이미지 알파 실루엣 그림자
- 화면/진입: Jukebox 카드 img filter
- 열린 질문: 현재 구현이 요구를 충족하는지 디자인 검수
- 원문 메모: 「img 태그 기준 직사각형으로 어색함」

---

## 그룹: 즐겨찾기 · 북마크 · 네비

### 노트 즐겨찾기 토글 `(수집 260812)`
- 상태: done (main · PR #19–20)
- 우선순위: P0 (완료) — 확정 의사결정 1순위 중 토글分
- 목적: 노트를 favorites로 표시/해제
- 화면/진입: NoteInfoPanel · `/api/updateFavorite`
- 원문 메모: 「Notion favorites · 토글 UI · boolean」

### Favorites 모아보기 페이지 · 네비 진입 `(수집 260812)`
- 상태: done (260812 · 이 브랜치)
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

### 제스처 네비게이션 `(수집 260812)`
- 상태: done (Notion·코드상 스와이프/터치 스크롤 존재)
- 우선순위: P1 (완료로 기록)
- 원문 메모: 「좌우 스와이프로 페이지 넘기기」

### PC 사이드 네비게이션 `(수집 260812)`
- 상태: backlog
- 우선순위: P2
- 목적: 즐겨찾기·최근·Period/Type·설정 패널을 PC 사이드에
- 화면/진입: 데스크톱 셸 (현재는 상단+필터)
- 열린 질문: Favorites 라우트로 일부 대체 가능한지
- 원문 메모: 「PC 사이드네비게이션 추가」

---

## 그룹: 공유 · 공개범위

### 노트 slug URL · 공유 버튼 `(수집 260812)`
- 상태: backlog (초안 PR #24)
- 우선순위: P1
- 목적: `/note/{title}-{idShort}` 공유 · 클립보드 복사
- 화면/진입: NoteImageViewer 시트
- 원문 메모: 「고유주소 · 공유 버튼」

### 노트/페이지 비공개 업로드 체크 `(수집 260812)` *(대화 후속 요청, 초안 PR #24)*
- 상태: backlog
- 우선순위: P1
- 목적: 「이 노트/페이지를 비공개로 업로드」체크 시 visible=false
- 화면/진입: AddNoteFab · AddPageModal · api/pages metadata
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
- 화면/진입: `noteSize.js`는 이미 비율 로직 있음 → **데이터 채움이 병목**
- 시나리오: size 있는 노트는 박스가 규격대로 · 없으면 이미지 비율 폴백
- 데이터/API: Notion `size` 프로퍼티
- 디자인·UX: 뷰어에서 노트마다 들쭉날쭉한 여백이 줄어듦
- 열린 질문: 누락 size 목록을 뽑는 점검 스크립트 필요 여부
- 원문 메모: 「기존 노트 사이즈 정확히 입력 · 비율 렌더링」
- **사용자 작업:** Notion에서 기존 노트 size 값 채우기

### 카테고리별 노트 추가 모달 사전 채우기 `(수집 260812)`
- 상태: backlog
- 우선순위: P1
- 목적: 현재 Timeline/By type 필터 값을 새 노트 모달의 Period/Type에 자동 반영
- 화면/진입: AddNoteFab · openAddNoteModal({ defaults })
- 시나리오: /timeline/university 에서 + → period 사전 선택
- 원문 메모: 「현재 뷰의 카테고리 자동 반영」

### 노트 타입별 사전 설정 `(수집 260812)`
- 상태: backlog
- 우선순위: P2 — 위 사전 채우기와 인접, 프리셋 범위가 더 큼
- 원문 메모: 「기본값 자동 채우기」

### 스마트 OCR 영역 감지 `(수집 260812)`
- 상태: backlog
- 우선순위: P2 — 확정 순서상 메타데이터 다음 · 공수 큼
- 목적: 업로드 후 스캔 영역 자동 감지 → 수정 UI → OCR 재생성
- 화면/진입: AddPageModal / PageMetaModal OCR
- 열린 질문: 감지 알고리즘(클라이언트 vs 서버) · 영역 저장 포맷
- 원문 메모: 「사전 스캔 영역 · 수정 UI · OCR 재생성」

### OCR로 날짜 자동 인식 → 제목/메타 `(수집 260812)`
- 상태: backlog
- 우선순위: P2 — OCR 영역 감지에 의존
- 원문 메모: 「날짜 자동 인식」

### 「사용 중인 노트」Chip `(수집 260812)`
- 상태: backlog
- 우선순위: P2
- 목적: period_end null → 우측 상단 Chip
- 원문 메모: 「사용 중인 노트 상태 표시」

### 구입처 · 블로그 링크 속성 `(수집 260812)`
- 상태: backlog
- 우선순위: P3 — **Notion 속성 추가(사용자)** 후 UI
- 원문 메모: 「브랜드/구입처 · 블로그 URL 모아보기」

---

## 그룹: 뷰어 고급 · 페이지 편집

### 모자이크 `(수집 260812)`
- 상태: backlog · 우선순위: P3
- 원문 메모: 「영역 선택 · 처리·저장」

### 페이지 삽입 · 순서 재편성 UI `(수집 260812)`
- 상태: backlog · 우선순위: P2 (삽입 API 일부 존재 — UI/안정화)
- 화면/진입: AddPageModal insertAfterPage · 순서 UI는 미흡
- 원문 메모: 「특정 위치 끼워넣기 · 순서 재편성 UI」

---

## 그룹: 장기 아키텍처 · 비주얼

### 북스파인 · 북셀프 `(수집 260812)`
- 상태: backlog · 우선순위: P3
- 원문 메모: 「spine 두께 · 책장 갤러리」

### React 전환 · Notion 완전 이관 · MySQL · 로그인 개선 `(수집 260812)`
- 상태: backlog · 우선순위: P3
- 원문 메모: 「애니메이션 · API 이관 · 자체 DB · 본인 인증」

---

## 그룹: 완료 기록 (Phase 1 등)

### Phase 1 버그·UX 묶음 · 스토리 개편 `(수집 260812)`
- 상태: done (Notion·다수 PR)
- 우선순위: — 
- 원문 메모: 「PDF z-index · 취소 · 캘린더 · 터치 · 애니메이션 · 용량 · 실패알림 · Timeline 순서 · visibility · Business · 라이트모드 · 한글 · 스토리」

---

## Inbox

<!-- enrich 후 미분류 없음 -->
