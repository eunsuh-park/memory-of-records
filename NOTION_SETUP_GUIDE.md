# 노션 DB 연동 완전 가이드

이 가이드는 노션 데이터베이스를 웹 애플리케이션에 연동하는 전체 과정을 단계별로 안내합니다.

## 📋 목차
1. [노션 Integration 생성](#1-노션-integration-생성)
2. [데이터베이스 ID 확인](#2-데이터베이스-id-확인)
3. [환경 변수 설정](#3-환경-변수-설정)
4. [데이터베이스에 Integration 연결](#4-데이터베이스에-integration-연결)
5. [데이터베이스 속성 설정](#5-데이터베이스-속성-설정)
6. [연동 확인](#6-연동-확인)

---

## 1. 노션 Integration 생성

### 1-1. Integration 페이지 접속
1. 브라우저에서 https://www.notion.so/my-integrations 접속
2. 노션 계정으로 로그인

### 1-2. 새 Integration 생성
1. **"+ New integration"** 버튼 클릭
2. 다음 정보 입력:
   - **Name**: 원하는 이름 (예: "Memory of Records")
   - **Logo**: 원하는 아이콘 (선택사항)
   - **Associated workspace**: 사용할 워크스페이스 선택
3. **"Submit"** 클릭

### 1-3. API Key 복사
1. 생성된 Integration 페이지에서 **"Internal Integration Token"** 섹션 확인
2. **"Show"** 버튼 클릭하여 토큰 표시
3. 토큰을 복사 (예: `secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - ⚠️ **중요**: 이 토큰은 한 번만 표시되므로 안전한 곳에 저장하세요!

### 1-4. Capabilities 설정 (선택사항)
- **Content Capabilities**: 
  - ✅ Read content 체크 (데이터 읽기)
  - ✅ Update content 체크 (데이터 수정, 필요한 경우)
- **Comment Capabilities**: 필요시 체크
- **User Capabilities**: 필요시 체크

---

## 2. 데이터베이스 ID 확인

### 2-1. 노션 데이터베이스 열기
1. 연동할 노션 데이터베이스 페이지를 엽니다
2. 브라우저 주소창의 URL을 확인합니다

### 2-2. URL에서 ID 추출
노션 데이터베이스 URL 형식:
```
https://www.notion.so/workspace/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

여기서 `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` 부분이 **데이터베이스 ID**입니다.

**예시:**
- URL: `https://www.notion.so/myworkspace/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- 데이터베이스 ID: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### 2-3. ID 형식 확인
- 데이터베이스 ID는 보통 32자리 문자열입니다
- 하이픈(-)이 포함되어 있을 수 있습니다 (제거하지 않아도 됩니다)

---

## 3. 환경 변수 설정

### 3-1. .env 파일 생성
프로젝트 루트 디렉토리에 `.env` 파일을 생성합니다.

**Windows:**
```bash
# 명령 프롬프트 또는 PowerShell에서
copy .env.example .env
```

**Mac/Linux:**
```bash
cp .env.example .env
```

또는 직접 `.env` 파일을 생성할 수 있습니다.

### 3-2. .env 파일에 값 입력
`.env` 파일을 열고 다음 형식으로 입력합니다:

```env
VITE_NOTION_API_KEY=secret_여기에_복사한_API_키_붙여넣기
VITE_NOTION_DATABASE_ID=여기에_데이터베이스_ID_붙여넣기
```

**예시:**
```env
VITE_NOTION_API_KEY=secret_abc123def456ghi789jkl012mno345pqr678stu901vwx234
VITE_NOTION_DATABASE_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### 3-3. 주의사항
- ✅ `.env` 파일은 **절대 Git에 커밋하지 마세요!**
- ✅ `.gitignore`에 `.env`가 포함되어 있는지 확인하세요
- ✅ 공백이나 따옴표 없이 값만 입력하세요
- ✅ 개발 서버를 재시작해야 환경 변수가 적용됩니다

---

## 4. 데이터베이스에 Integration 연결

### 4-1. 데이터베이스 페이지 열기
연동할 노션 데이터베이스 페이지를 엽니다.

### 4-2. Connections 메뉴 열기
1. 데이터베이스 페이지 우측 상단의 **"..."** (점 3개) 메뉴 클릭
2. **"Connections"** 또는 **"연결"** 선택

### 4-3. Integration 선택
1. 연결 목록에서 방금 생성한 Integration 이름을 찾습니다
2. Integration 옆의 토글을 **ON**으로 설정
3. 확인 메시지가 나타나면 **"Allow"** 클릭

### 4-4. 연결 확인
- 데이터베이스 페이지 우측 상단에 Integration 아이콘이 표시되면 연결 성공입니다!

---

## 5. 데이터베이스 속성 설정

애플리케이션이 노션 데이터를 올바르게 읽으려면 다음 속성들이 필요합니다.

### 5-1. 필수 속성
데이터베이스에 다음 속성들을 추가하세요:

| 속성명 (영어) | 속성 타입 | 설명 | 필수 여부 |
|------------|---------|------|---------|
| **Title** | Title | 포스트 제목 | ✅ 필수 |
| **Date** | Date | 발행일 | ✅ 필수 |
| **Subtitle** | Text | 부제목 | 선택 |
| **Preview** | Text | 미리보기 텍스트 | 선택 |
| **Image** | URL 또는 Files | 이미지 URL | 선택 |

### 5-2. 속성 추가 방법
1. 데이터베이스 페이지에서 **"+"** 버튼 클릭
2. 속성 타입 선택 (Title, Date, Text 등)
3. 속성명 입력 (영어로 입력하는 것을 권장합니다)

### 5-3. 속성명 확인
현재 코드는 **영어 속성명**을 사용합니다:
- `Title` (대소문자 구분)
- `Date`
- `Subtitle`
- `Preview`
- `Image`

한국어 속성명을 사용하려면 `src/utils/notion.js`의 `convertNotionPageToStoryPost` 함수를 수정해야 합니다.

---

## 6. 연동 확인

### 6-1. 개발 서버 재시작
환경 변수를 변경했다면 개발 서버를 재시작하세요:

```bash
# 서버 중지 (Ctrl+C)
# 서버 재시작
npm run dev
```

### 6-2. 브라우저 콘솔 확인
1. 브라우저에서 애플리케이션 열기
2. 개발자 도구 열기 (F12)
3. Console 탭 확인

**성공 메시지:**
```
🔗 노션 DB 연결 확인 중...
✅ 노션 DB 연결 성공!
📊 데이터베이스 정보: { title: "...", id: "..." }
```

**실패 메시지:**
```
❌ 노션 연결 실패: [오류 내용]
```

### 6-3. Story 페이지 확인
1. 애플리케이션에서 **Story** 페이지로 이동
2. 노션 데이터베이스의 페이지들이 표시되는지 확인

---

## 🔧 문제 해결

### 문제 1: "API 키 또는 데이터베이스 ID가 설정되지 않았습니다"
**해결 방법:**
- `.env` 파일이 프로젝트 루트에 있는지 확인
- 환경 변수 이름이 정확한지 확인 (`VITE_NOTION_API_KEY`, `VITE_NOTION_DATABASE_ID`)
- 개발 서버를 재시작했는지 확인

### 문제 2: "401 Unauthorized" 오류
**해결 방법:**
- API 키가 올바른지 확인
- API 키에 `secret_` 접두사가 포함되어 있는지 확인
- Integration이 데이터베이스에 연결되어 있는지 확인

### 문제 3: "404 Not Found" 오류
**해결 방법:**
- 데이터베이스 ID가 올바른지 확인
- 데이터베이스가 Integration에 연결되어 있는지 확인
- 데이터베이스가 삭제되지 않았는지 확인

### 문제 4: 데이터가 표시되지 않음
**해결 방법:**
- 데이터베이스에 페이지가 있는지 확인
- 속성명이 코드와 일치하는지 확인 (`src/utils/notion.js` 확인)
- 브라우저 콘솔에서 오류 메시지 확인

---

## 📚 추가 리소스

- [Notion API 공식 문서](https://developers.notion.com/)
- [Notion Integrations 가이드](https://developers.notion.com/docs/getting-started)

---

## ✅ 체크리스트

연동 완료를 위해 다음 항목을 확인하세요:

- [ ] 노션 Integration 생성 완료
- [ ] API Key 복사 및 저장 완료
- [ ] 데이터베이스 ID 확인 완료
- [ ] `.env` 파일 생성 및 값 입력 완료
- [ ] 데이터베이스에 Integration 연결 완료
- [ ] 데이터베이스 속성 설정 완료 (Title, Date 등)
- [ ] 개발 서버 재시작 완료
- [ ] 브라우저 콘솔에서 연결 성공 메시지 확인
- [ ] Story 페이지에서 데이터 표시 확인

---

**도움이 필요하신가요?** 
- 브라우저 콘솔의 오류 메시지를 확인하세요
- `src/utils/notion.js` 파일의 로그를 확인하세요

