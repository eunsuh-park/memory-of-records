/**
 * Mingcute 아이콘 (서비스 UI용) — 자동 생성 파일이므로 직접 고치지 않는다.
 *
 * 생성: npm run icons (scripts/generate-mingcute-icons.mjs)
 * 출처: Iconify mingcute 세트 (세트 갱신일 2026-07-31)
 * fill·stroke는 currentColor — 버튼 color로 검정/호버 흰색 지정
 *
 * 버튼 아이콘은 반드시 이 세트에서 가져온다. 컴포넌트 파일에 SVG를 직접 적지 말고,
 * 없는 아이콘은 생성 스크립트의 ICONS 목록에 추가한 뒤 쓴다. (규칙: .cursor/rules/ui-buttons.mdc)
 */

export const MINGCUTE = {
  /** 노트 추가 (+) · mingcute:add-fill */
  addFill:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' fill-rule='evenodd' d='M12 3.5A1.5 1.5 0 0 1 13.5 5v5.5H19a1.5 1.5 0 0 1 0 3h-5.5V19a1.5 1.5 0 0 1-3 0v-5.5H5a1.5 1.5 0 0 1 0-3h5.5V5A1.5 1.5 0 0 1 12 3.5' clip-rule='evenodd'/></svg>",

  /** 노트 정보 편집 · mingcute:edit-2-fill */
  edit2Fill:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' d='m17.827 13.241l-7.173 7.174A2 2 0 0 1 9.239 21H4.006a1.01 1.01 0 0 1-1.01-1.011v-5.232a2 2 0 0 1 .586-1.414l7.174-7.174zm-3.931-10.21a2 2 0 0 1 2.828 0l4.243 4.241a2 2 0 0 1 0 2.83l-1.726 1.725l-7.07-7.071z'/></svg>",

  /** 노트 페이지 추가 · mingcute:file-new-fill */
  fileNewFill:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' d='M12 8.5a1.5 1.5 0 0 0 1.5 1.5H20v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h6zm0 4a1 1 0 0 0-1 1V15H9.5a1 1 0 1 0 0 2H11v1.5a1 1 0 1 0 2 0V17h1.5a1 1 0 1 0 0-2H13v-1.5a1 1 0 0 0-1-1m2-10.456a2 2 0 0 1 1 .542L19.414 7a2 2 0 0 1 .541 1H14z'/></svg>",

  /** 아래 화살표 (접힌 필터 네비 열기) · mingcute:down-line */
  downLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M17.657 9.343L12 15L6.343 9.343'/></svg>",

  /** 보기 (눈, line) · mingcute:eye-2-line */
  eye2Line:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-width='2' d='M21 12c0 1.5-4.03 6-9 6s-9-4.5-9-6s4.03-6 9-6s9 4.5 9 6Z'/><path fill='none' stroke='currentColor' stroke-width='2' d='M14 12a2 2 0 1 1-4 0a2 2 0 0 1 4 0Z'/></svg>",

  /** 보기 (눈, fill) · mingcute:eye-2-fill */
  eye2Fill:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' d='M12 5c3.679 0 8.162 2.417 9.73 5.901c.147.328.27.711.27 1.099s-.123.771-.27 1.099C20.162 16.583 15.679 19 12 19s-8.162-2.417-9.73-5.901C2.124 12.77 2 12.388 2 12s.123-.771.27-1.099C3.839 7.417 8.322 5 12 5m0 3a4 4 0 1 0 0 8a4 4 0 0 0 0-8m0 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4'/></svg>",

  /** 왼쪽 화살표 (이전 페이지 · 오른쪽은 CSS scaleX(-1)로 반전) · mingcute:left-line */
  leftLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M14.657 17.657L9 12l5.657-5.657'/></svg>",

  /** 맨 앞으로 (겹친 왼쪽 화살표) · mingcute:arrows-left-line */
  arrowsLeftLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m17 7l-5 5l5 5M11 7l-5 5l5 5'/></svg>",

  /** 맨 끝으로 (겹친 오른쪽 화살표) · mingcute:arrows-right-line */
  arrowsRightLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m7 17l5-5l-5-5m6 10l5-5l-5-5'/></svg>",

  /** 양면 보기 (펼친 책) · mingcute:book-6-line */
  bookOpenLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-linejoin='round' stroke-width='2' d='M12 6v14m0 0s2-1.5 4.5-1.5c1.508 0 2.834.546 3.648.979c.364.193.852-.067.852-.479V6.5a.89.89 0 0 0-.417-.774C19.871 5.293 18.318 4.5 16.5 4.5C14 4.5 12 6 12 6s-2-1.5-4.5-1.5c-1.817 0-3.37.793-4.083 1.226A.89.89 0 0 0 3 6.5V19c0 .412.488.672.851.479c.815-.433 2.141-.979 3.649-.979C10 18.5 12 20 12 20Z'/></svg>",

  /** 되돌리기 (뷰 원상복구) · mingcute:refresh-anticlockwise-1-line */
  refreshLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m4.04 10.41l1.708-.382c.108-.024.17.12.077.181L3.152 12.01a.098.098 0 0 1-.154-.081q.004-.588.085-1.163a9.003 9.003 0 0 1 17.61-1.096A9 9 0 0 1 4.513 17'/></svg>",

  /** 닫기 (X) · mingcute:close-medium-line */
  closeLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-linecap='round' stroke-width='2' d='m7.05 7.05l9.9 9.9m-9.9 0l9.9-9.9'/></svg>",

  /** 확대 · mingcute:zoom-in-line */
  zoomInLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-linecap='round' stroke-width='2' d='M7 10.5h7M10.5 14V7m5.379 8.879l4.242 4.242M18 10.5a7.5 7.5 0 1 1-15 0a7.5 7.5 0 0 1 15 0Z'/></svg>",

  /** 축소 · mingcute:zoom-out-line */
  zoomOutLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-linecap='round' stroke-width='2' d='M7 10.5h7m1.803 5.303l4.318 4.318M18 10.5a7.5 7.5 0 1 1-15 0a7.5 7.5 0 0 1 15 0Z'/></svg>",

  /** 모바일 메뉴 열기 (햄버거) · mingcute:menu-line */
  menuLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-linecap='round' stroke-width='2' d='M4 6h16M4 12h16M4 18h16'/></svg>",

  /** 우측 드로어 닫기 · mingcute:arrow-to-right-line */
  arrowToRightLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m11.297 16.95l4.95-4.95l-4.95-4.95M16 12H4m16-7v14'/></svg>",

  /** 테마 스위치 · 라이트 · mingcute:sun-fill */
  sunFill:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' d='M12 19a1 1 0 0 0-1 1v1a1 1 0 1 0 2 0v-1a1 1 0 0 0-1-1m6.364-2.05a1 1 0 1 0-1.414 1.414l.707.707a1 1 0 0 0 1.414-1.414zm-11.314 0a1 1 0 0 0-1.414 0l-.707.707a1 1 0 0 0 1.414 1.414l.707-.707a1 1 0 0 0 0-1.414M12 6a6 6 0 1 0 0 12a6 6 0 0 0 0-12m8 5a1 1 0 1 0 0 2h1a1 1 0 1 0 0-2zM3 11a1 1 0 1 0 0 2h1a1 1 0 1 0 0-2zm16.071-6.071a1 1 0 0 0-1.414 0l-.707.707a1 1 0 1 0 1.414 1.414l.707-.707a1 1 0 0 0 0-1.414m-12.728 0a1 1 0 0 0-1.414 1.414l.707.707A1 1 0 1 0 7.05 5.636zM12 2a1 1 0 0 0-1 1v1a1 1 0 1 0 2 0V3a1 1 0 0 0-1-1'/></svg>",

  /** 테마 스위치 · 다크 · mingcute:moon-fill */
  moonFill:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' fill-rule='evenodd' d='M13.574 3.137a1.01 1.01 0 0 0-1.097 1.408a6 6 0 0 1-7.931 7.931c-.747-.335-1.548.307-1.409 1.098A9 9 0 0 0 21 12c0-4.435-3.206-8.118-7.426-8.863' clip-rule='evenodd'/></svg>",

  /** 이미지 플레이스홀더 · mingcute:pic-2-fill */
  pic2Fill:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' fill-rule='evenodd' d='M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm18 8.686l-4.172-4.171a1 1 0 0 0-1.414 0L4.93 19H4V5h16zM6 8.5a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0' clip-rule='evenodd'/></svg>",

  /** 즐겨찾기 on (채운 별) · mingcute:star-fill */
  starFill:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' d='M10.92 2.37a1.25 1.25 0 0 1 2.16 0l2.795 4.8l5.428 1.175a1.25 1.25 0 0 1 .667 2.054l-3.7 4.142l.56 5.525a1.25 1.25 0 0 1-1.748 1.27L12 19.096l-5.082 2.24a1.25 1.25 0 0 1-1.747-1.27l.559-5.525l-3.7-4.142a1.25 1.25 0 0 1 .667-2.054L8.125 7.17z'/></svg>",

  /** 즐겨찾기 off · 모바일 (라인 별) · mingcute:star-line */
  starLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-width='2' d='M11.784 2.87a.25.25 0 0 1 .432 0l2.961 5.085a.25.25 0 0 0 .164.119l5.75 1.245a.25.25 0 0 1 .134.41l-3.92 4.388a.25.25 0 0 0-.063.192l.593 5.854a.25.25 0 0 1-.35.254l-5.384-2.373a.25.25 0 0 0-.202 0l-5.384 2.373a.25.25 0 0 1-.35-.254l.593-5.854a.25.25 0 0 0-.062-.192L2.776 9.73a.25.25 0 0 1 .133-.411l5.75-1.245a.25.25 0 0 0 .164-.119z'/></svg>",

  /** 페이지 북마크 on (채운 북마크) · mingcute:bookmark-fill */
  bookmarkFill:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' fill-rule='evenodd' d='M5 6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v14.066c0 1.198-1.335 1.912-2.332 1.248L12 18.202l-4.668 3.112C6.335 21.978 5 21.264 5 20.066z' clip-rule='evenodd'/></svg>",

  /** 페이지 북마크 off · 모바일 (라인 북마크) · mingcute:bookmark-line */
  bookmarkLine:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='none' stroke='currentColor' stroke-width='2' d='M6 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14.066a.5.5 0 0 1-.777.416l-4.946-3.297a.5.5 0 0 0-.554 0l-4.946 3.297A.5.5 0 0 1 6 20.066z'/></svg>",

  /** 노트 삭제 (휴지통) · mingcute:delete-2-fill */
  delete2Fill:
    "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><path fill='currentColor' fill-rule='evenodd' d='M7.823 3.368A2 2 0 0 1 9.721 2h4.558a2 2 0 0 1 1.898 1.368L16.72 5H20a1 1 0 1 1 0 2h-.064l-.814 12.2A3 3 0 0 1 16.13 22H7.87a3 3 0 0 1-2.993-2.8L4.064 7H4a1 1 0 0 1 0-2h3.28zM14.613 5H9.387l.334-1h4.558zM9 10a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1m6 0a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1' clip-rule='evenodd'/></svg>"
};
