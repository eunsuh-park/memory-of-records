

## 웹 페이지 구조

```
index.html (랜딩 페이지)
├── top-navigation (헤더)
│   ├── 로고
│   └── 네비게이션 메뉴 (메인/About/Year)
├── main (제목/소개)
└── footer (푸터 정보)

※ Top Navigation과 Footer는 모든 페이지에 사용

pages/timeline.html (시기별 노트 페이지)
├── Side menu
│   ├── Elementary School (2005-2010)
│   ├── Middle & High School (2012-2016)
│   ├── University (2017-2022)
│   └── After Graduation (2022-2024)
│       └── 각 시기별 노트 아이템들

pages/story.html (Story - Blog Style)
├── 블로그 리스트 (최대 3-6개 포스트 미리보기)
│   ├── Project Background & Purpose (프로젝트 배경 및 목적)
│   ├── My Organization Rules for Old Notebooks (과거 노트 정리 원칙)
│   ├── 4 Reasons why I prefer Analog (아날로그 노트 선호 이유 4가지)
│   ├── Next Step of My Recording (다음 기록 단계)
│   └── What's in My Desk/Book Shelf to Record - Product Recommendation (내 책상/책장 속 기록용품 추천)
└── 블로그 글별 상세 페이지
    ├── (제목/부제목/내용 등 포함)
    └── 홈으로 돌아가기(Story 블로그 리스트로)

pages/year.html (Year)
├── Side menu
│   ├── Overview (오버뷰 - 별도의 디자인)
│   └── 연도별 메뉴 (2012-2024)
│       └── 연도별 노트 리스트

components/NoteDetail.jsx (노트 상세 content 컴포넌트)
├── props: 선택된 노트의 데이터 (제목, 시기/연도, 내용, 이미지 등)
├── 상단: 노트 제목, 소속 시기/연도 정보 표시
├── 본문: 노트 내용(텍스트/이미지) 렌더링
├── 하단: 이전/다음 노트 이동 버튼 (props로 함수 전달받아 동작)
└── 홈 혹은 목록으로 돌아가기 버튼 (props로 함수 전달받아 동작)

※ 모든 시기별/연도별 노트 리스트에서 노트 클릭 시 해당 상세 페이지(note-detail.html, 특정 노트 id로 이동)로 연결
> **Note:** 모든 페이지(시기별, 연도별 리스트 및 상세 페이지)는 **동일한 노트 데이터 셋**을 공유합니다.  
즉, "노트 데이터"는 하나의 공통 데이터 소스(예: JSON 파일, DB 등)에서 불러와 각 페이지(타임라인/Year/NoteDetail 등)에서 **필터링/가공하여 각각의 뷰로 출력**됩니다.
