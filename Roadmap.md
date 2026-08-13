# Roadmap

> 확정일: 260812  
> 소스: Backlog.md (사용자: 백로그 정리 · 우선순위 · 로드맵 · 최우선 1건 실행)  
> 원칙: 에이전트가 코드로 끝낼 수 있는 항목을 앞두고, Notion 속성/데이터/시크릿 등 사용자 전용 작업은 Later로 미룸

## Now / Next

### 1. Favorites 모아보기 페이지 · 네비 진입 `P0`
- 상태: done
- Backlog 참조: [Favorites 모아보기](Backlog.md)
- 수락 기준:
  - [x] `/favorites`에서 별 표시한 노트만 주크박스로 보임
  - [x] FilterSubMenu에 Timeline | By type | Favorites 토글
  - [x] 헤더/모바일 드로어에서 Favorites로 진입 가능
  - [x] 즐겨찾기 없으면 빈 상태 문구가 보임
- 진행 로그:
  - 시작 260812 — main에 토글만 있고 모아보기 라우트 없음
  - 완료 260812 — `Favorites.js` · 라우트 · 뷰 토글 · PageHeader/드로어 링크

### 2. 북마크 페이지 가상 노트 모아보기 `P1`
- 상태: done
- Backlog 참조: 북마크 · 네비
- 수락 기준:
  - [x] Jukebox 맨 앞에 Bookmarks 가상 노트 카드(커스텀 표지)가 보임
  - [x] 열면 북마크된 페이지들이 한 앨범처럼 넘겨짐
  - [x] 앨범에서 북마크 해제 시 해당 장이 목록에서 빠짐
- 진행 로그:
  - 시작 260812 — 표지 생성 · API · 뷰어 album 모드
  - 완료 260812 — `cloudinaryBookmarkedPages` · Bookmark Note · Cloudinary 표지 · 원본 노트 링크

### 3. 업로드 진행률 + 완료 Dialog `P1`
- 상태: todo
- Backlog 참조: 업로드 · 안정성
- 수락 기준:
  - [ ] 업로드 중 N/M(또는 진행바) 표시
  - [ ] 끝나면 Dialog로 성공/부분실패/실패 확인
- 진행 로그:
  - (예정)

### 4. 카테고리별 노트 추가 모달 사전 채우기 `P1`
- 상태: todo
- Backlog 참조: 메타데이터 · OCR · 폼 UX
- 수락 기준:
  - [ ] Timeline/By type 현재 필터가 새 노트 모달 Period/Type에 반영
- 진행 로그:
  - (예정)

### 5. 포커스 패널 노트 삭제 → 휴지통 DB `P1`
- 상태: done
- Backlog 참조: [포커스 패널 노트 삭제](Backlog.md)
- 수락 기준:
  - [x] 주크박스 포커스 바(별·수정·페이지 추가 오른쪽)에 삭제 아이콘이 보임
  - [x] 누르면 사이트 Dialog로 「삭제 / 취소」를 묻고, 브라우저 기본 알럿은 쓰지 않음
  - [x] 삭제를 누르면 `/api/trashNote`가 휴지통 DB로 옮기고 목록을 새로고침 (DB ID 없으면 안내 토스트)
- 진행 로그:
  - 시작 260813 — 백로그에 없어 바로 진행. 휴지통 DB ID는 사용자 설정 필요
  - 완료 260813 — 삭제 아이콘 · Dialog · `trashNote` API. 휴지통 DB 생성·env는 사용자 작업

## Later (확정 방향 · 순서 뒤 · 또는 열린 PR에 초안)

에이전트 코드 작업 (미머지 초안 있으면 리뷰·머지 우선):

| 항목 | P | 비고 |
|------|---|------|
| slug URL · 공유 버튼 | P1 | 초안 PR #24 (Favorites 부분은 #26으로 완료) |
| JPG 정규화 · PDF 화질 | P1 | 초안 PR #24 |
| 2-Page gap 0 | P1 | 초안 PR #24 |
| 비공개 업로드 체크 | P1 | 초안 PR #24 |
| PDF 커버 페이지 선택 | P1 | Dialog UX 확인 후 |
| 라이트모드 포커스 · 실루엣 그림자 | P2 | 디자인 검수 |
| PC 사이드네비 | P2 | Favorites 라우트로 일부 대체 가능 |
| 스마트 OCR · 날짜 OCR | P2 | 메타데이터 이후 |
| 모자이크 · 북스파인 · React/MySQL | P3 | 장기 |

**사용자 전용** (에이전트가 Notion/시크릿에 대신 넣을 수 없음) → 맨 아래 「내가 할 일」 참고:

| 항목 | P |
|------|---|
| 기존 노트 `size` 데이터 채우기 | P1 |
| 휴지통 DB 생성 · `NOTION_TRASH_DATABASE_ID` | P1 |
| 구입처·블로그 링크 속성 | P3 |
| 프로덕션 env/시크릿 점검 | — |

> 노트 잠금 속성: 260812 사용자 요청으로 제외 (`Backlog` cancelled).

## Done

- 포커스 패널 노트 삭제 → 휴지통 DB (260813 · 휴지통 DB 연결은 사용자)
- 모바일 인디케이터 · 푸터 · 위글 (260812)
- 북마크 페이지 가상 노트 모아보기 (260812)
- Favorites 모아보기 · 네비 (260812)
- (이전 main: 즐겨찾기 토글, 북마크, 업로드 부분실패, 태블릿 FAB — Backlog `done` 참고)
