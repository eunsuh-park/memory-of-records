# API (Vercel Serverless)

프론트엔드에서 호출하는 Notion·Cloudinary 프록시입니다. 배포 시 Vercel이 `api/` 루트의 **파일 하나 = 서버리스 함수 하나**로 올립니다. Hobby 플랜은 함수 12개가 한도라, 엔드포인트는 아래 6개만 둡니다. `_lib/`는 `_`로 시작해 함수로 세지 않습니다.

| 경로 | 용도 | 호출처 |
|------|------|--------|
| `GET`/`POST /api/auth` | 로그인·로그아웃·세션 | `src/services/auth.js` |
| `POST /api/writeNotebooks` | 노트 만들기·수정·휴지통·즐겨찾기 (`op`: `create` \| `update` \| `trash` \| `favorite`) | `src/services/createNote.js` |
| `GET /api/readNotebooks` | 시기/타입 목록·폼 옵션·표지 (`view`: `period` \| `type` \| `formMeta` \| `covers`, period/type은 `visibility`) | `src/services/notionNotebooks.js` · `notionByType.js` · `createNote.js` · `noteCovers.js` |
| `POST /api/writePages` | 장 업로드·메타·폴더 이름·번호 이동·삭제 (`op`: `upload` \| `updateNote` \| `updateMeta` \| `renameFolder` \| `shiftPages` \| `deletePage`) | `src/services/pages.js` |
| `GET /api/readPages` | 장 목록·메타·숨긴 장·북마크된 장 (`op`: `list` \| `meta` \| `hidden` \| `bookmarked`, list는 `note`) | `src/services/notePages.js` · `pages.js` · `bookmarkedPages.js` · `NoteImageViewer.js` |
| `POST /api/writeCovers` | 표지 앞·뒤 Cloudinary 업로드 (`notebooks/{publicId}/cover_front\|cover_back`) | `src/services/createNote.js` |

**파일명:** API 엔트리 파일은 카멜케이스. 핸들러 구현은 `api/_lib/handlers/`에 두고, 엔트리끼리 import하지 않습니다.

**필요 환경 변수:** `NOTION_API_KEY`, `NOTION_DATABASE_ID` / `NOTION_DB_ID` (노트북), `NOTION_TRASH_DATABASE_ID` / `NOTION_TRASH_DB_ID` (휴지통, 삭제 시 필요), `NOTION_BY_TYPE_DB_ID` (by-type용, 없으면 `NOTION_DATABASE_ID` 사용), `CLOUDINARY_URL` 또는 `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`.
