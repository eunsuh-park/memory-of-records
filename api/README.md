# API (Vercel Serverless)

프론트엔드에서 호출하는 Notion 프록시 API입니다. 배포 시 Vercel이 `api/` 폴더를 서버리스 함수로 올립니다.

| 경로 | 용도 | 호출처 |
|------|------|--------|
| `GET /api/notionByPeriod` | 시기(period)별 노트 DB 조회 | `src/services/notionNotebooks.js` |
| `GET /api/notionByType` | 타입별 노트 DB 조회 | `src/services/notionByType.js` |
| `GET /api/noteFormMeta` | 새 노트 폼 select 옵션 | `src/services/createNote.js` |
| `POST /api/uploadCover` | 표지 이미지 Cloudinary 업로드 | `src/services/createNote.js` |
| `POST /api/createNote` | Notion DB에 새 페이지 생성 | `src/services/createNote.js` |

**파일명:** API 파일은 카멜케이스 통일 (예: `notionByPeriod.js`, `notionByType.js`). 프로젝트 명명 규칙은 `docs/ARCHITECTURE.md` 참고.

**필요 환경 변수:** `NOTION_API_KEY`, `NOTION_DATABASE_ID` / `NOTION_DB_ID` (노트북), `NOTION_BY_TYPE_DB_ID` (by-type용, 없으면 `NOTION_DATABASE_ID` 사용), `CLOUDINARY_URL` 또는 `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`.
