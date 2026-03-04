# Notion DB 연결 정리

이 프로젝트는 여러 페이지에서 서로 다른 Notion 데이터베이스를 사용합니다. 각 API별로 필요한 환경 변수를 정리했습니다.

## 요약표

| 기능 | API 경로 | 환경 변수 | Notion DB 속성 구조 |
|------|----------|-----------|---------------------|
| **Timeline** (시기별 노트) | `/api/notebooks/notion` | `NOTION_DATABASE_ID` 또는 `NOTION_DB_ID` | period_name, period_start, cover_front_url 등 |
| **Story** (스토리 갤러리) | `/api/story` | `NOTION_STORY_DB_ID` (권장) 또는 `NOTION_DB_ID` | Title, Subtitle, Date, Image, Preview |
| **By type** (타입별 갤러리) | `/api/by-type/notion` | `NOTION_BY_TYPE_DB_ID` 또는 `NOTION_DATABASE_ID` | notebook_type, cover_front_url 등 |

## 1. Timeline / 노트 (Notebooks)

- **API**: `api/notebooks/notion.js`
- **환경 변수**: `NOTION_API_KEY`, `NOTION_DATABASE_ID` 또는 `NOTION_DB_ID`
- **기본값**: `18dfb9c7066e4df99962c5fed616b3db`
- **Notion DB 필수 속성**:
  - period_name (Select): Elementary School, University, Middle & High School, After School (1:1 매칭)
  - period_start, period_end (Date)
  - cover_front_url, cover_back_url (URL)
  - 이름/Name/title (Title)

## 2. Story

- **API**: `api/story.ts`
- **환경 변수**: `NOTION_API_KEY`, **`NOTION_STORY_DB_ID`** (권장)
  - fallback: `NOTION_DB_ID`, `NOTION_DATABASE_ID`
- **Notion DB 필수 속성**:
  - Title (제목)
  - Subtitle (부제목)
  - Date (발행일)
  - Image (이미지 URL, 선택)
  - Preview (미리보기, 선택)

> **중요**: Story는 노트북과 다른 구조의 데이터를 사용합니다. 별도의 Notion 데이터베이스를 만들고 `NOTION_STORY_DB_ID`에 해당 DB ID를 설정하는 것을 권장합니다. 같은 DB를 쓰면 노트북용 속성과 혼동됩니다.

## 3. By type

- **API**: `api/by-type/notion.js`
- **환경 변수**: `NOTION_API_KEY`, `NOTION_BY_TYPE_DB_ID` 또는 `NOTION_DATABASE_ID`
- **Notion DB notebook_type 태그** (1:1 매칭):
  - 다이어리(일기장), 스케줄러, 수첩/메모지, 스케치북, 줄공책

---

## 설정 방법 (Vercel 예시)

Vercel 프로젝트 → Settings → Environment Variables에서:

```
NOTION_API_KEY=secret_xxxxx
NOTION_DATABASE_ID=18dfb9c7066e4df99962c5fed616b3db   # Timeline/노트용
NOTION_STORY_DB_ID=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy   # Story 전용 (별도 DB)
NOTION_BY_TYPE_DB_ID=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz   # By type (별도 DB, 선택)
```

Story 전용 DB를 만들 때는 `convertNotionPageToStoryPost`가 기대하는 속성(Title, Subtitle, Date, Image 등)을 갖춘 페이지를 추가하면 됩니다.
