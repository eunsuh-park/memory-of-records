# Notion API 연동 설정 가이드

## 필요한 정보

노션 DB와 연동하기 위해 다음 정보가 필요합니다:

### 1. Notion Integration Token (API Key)
- 노션 워크스페이스에서 Integration을 생성하고 API 키를 발급받아야 합니다.
- 발급 방법:
  1. https://www.notion.so/my-integrations 접속
  2. "New integration" 클릭
  3. 이름과 아이콘 설정 후 생성
  4. "Internal Integration Token" 복사

### 2. Notion Database ID
- 연동할 노션 데이터베이스의 ID가 필요합니다.
- 확인 방법:
  1. 노션 데이터베이스 페이지 열기
  2. URL에서 데이터베이스 ID 확인
  3. 예: `https://www.notion.so/workspace/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
     - 여기서 `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` 부분이 데이터베이스 ID

### 3. 노션 데이터베이스 속성 구조
현재 코드에서 예상하는 속성명:
- **Title** 또는 **제목**: 제목 필드 (Title 타입)
- **Subtitle** 또는 **부제목**: 부제목 필드 (Rich Text 타입)
- **Date** 또는 **날짜**: 발행일 필드 (Date 타입)
- **Preview** 또는 **미리보기**: 미리보기 텍스트 (Rich Text 타입, 선택)
- **Image** 또는 **이미지**: 이미지 URL (URL 또는 Files 타입, 선택)

> **참고**: 실제 노션 DB의 속성명에 맞게 `src/utils/notion.js`의 `convertNotionPageToStoryPost` 함수를 수정해야 합니다.

## 설정 방법

1. `.env.example` 파일을 `.env`로 복사
2. `.env` 파일에 실제 값 입력:
   ```
   VITE_NOTION_API_KEY=발급받은_API_키
   VITE_NOTION_DATABASE_ID=데이터베이스_ID
   ```
3. 노션 데이터베이스에 Integration 연결:
   - 데이터베이스 페이지에서 "..." 메뉴 → "Connections" → 생성한 Integration 선택

## 사용 방법

`src/pages/Story.js`에서 노션 데이터를 사용하도록 수정하면 됩니다.
현재는 기본 구조만 세팅되어 있으며, 실제 연동 코드는 추가로 작성해야 합니다.

> **주의**: API 키와 데이터베이스 ID는 `.env` 파일에 저장하고, 절대 Git에 커밋하지 마세요!