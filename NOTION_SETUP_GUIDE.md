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

환경 변수 설정은 **로컬 개발 환경**과 **GitHub Pages 배포 환경**에서 각각 설정해야 합니다.

---

### 3-1. 로컬 개발 환경 설정 (.env 파일)

#### 3-1-1. .env 파일 생성
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

#### 3-1-2. .env 파일에 값 입력
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

#### 3-1-3. 로컬 환경 주의사항
- ✅ `.env` 파일은 **절대 Git에 커밋하지 마세요!**
- ✅ `.gitignore`에 `.env`가 포함되어 있는지 확인하세요
- ✅ 공백이나 따옴표 없이 값만 입력하세요
- ✅ 개발 서버를 재시작해야 환경 변수가 적용됩니다

---

### 3-2. GitHub Pages 배포 환경 설정 (GitHub Secrets)

GitHub Pages에 배포할 때는 GitHub Secrets를 사용하여 환경 변수를 설정해야 합니다.

#### 3-2-1. GitHub 저장소 페이지 접속
1. 웹 브라우저에서 GitHub에 로그인
2. 배포할 저장소 페이지로 이동 (예: `https://github.com/사용자명/memory-of-records`)

#### 3-2-2. Settings 페이지로 이동
1. 저장소 페이지 상단의 탭 메뉴에서 **"Settings"** 클릭
   - ⚠️ Settings 탭이 보이지 않으면 저장소에 대한 관리자 권한이 있는지 확인하세요

#### 3-2-3. Secrets and variables 메뉴 찾기
1. Settings 페이지 왼쪽 사이드바에서 **"Secrets and variables"** 섹션 찾기
2. **"Actions"** 클릭
   - 경로: `Settings` → `Secrets and variables` → `Actions`

#### 3-2-4. 첫 번째 Secret 추가 (VITE_NOTION_API_KEY)
1. **"New repository secret"** 버튼 클릭
   - 페이지 오른쪽 상단에 위치
2. **"Name"** 필드에 다음을 입력:
   ```
   VITE_NOTION_API_KEY
   ```
   - ⚠️ 정확히 이 이름으로 입력해야 합니다 (대소문자 구분)
3. **"Secret"** 필드에 Notion API 키 붙여넣기:
   ```
   secret_여기에_복사한_API_키_붙여넣기
   ```
   - 예시: `secret_abc123def456ghi789jkl012mno345pqr678stu901vwx234`
4. **"Add secret"** 버튼 클릭
   - ✅ "Secret VITE_NOTION_API_KEY created" 메시지가 표시되면 성공

#### 3-2-5. 두 번째 Secret 추가 (VITE_NOTION_DATABASE_ID)
1. 다시 **"New repository secret"** 버튼 클릭
2. **"Name"** 필드에 다음을 입력:
   ```
   VITE_NOTION_DATABASE_ID
   ```
3. **"Secret"** 필드에 Notion 데이터베이스 ID 붙여넣기:
   ```
   여기에_데이터베이스_ID_붙여넣기
   ```
   - 예시: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
4. **"Add secret"** 버튼 클릭
   - ✅ "Secret VITE_NOTION_DATABASE_ID created" 메시지가 표시되면 성공

#### 3-2-6. 추가된 Secrets 확인
Secrets 목록에 다음 두 항목이 표시되는지 확인:
- ✅ `VITE_NOTION_API_KEY` (값은 마스킹되어 표시됨)
- ✅ `VITE_NOTION_DATABASE_ID` (값은 마스킹되어 표시됨)

#### 3-2-7. Secrets 적용을 위한 재배포
1. 저장소의 **"Actions"** 탭으로 이동
2. 최근 워크플로우 실행을 확인하거나
3. 코드를 커밋하고 푸시하여 자동 배포 트리거
   ```bash
   git add .
   git commit -m "Update: GitHub Secrets 설정 완료"
   git push
   ```
4. Actions 탭에서 배포 진행 상황 확인
   - ✅ 빌드가 성공하면 Secrets가 적용된 것입니다

#### 3-2-8. GitHub Secrets 주의사항
- ✅ Secret 이름은 정확히 `VITE_NOTION_API_KEY`와 `VITE_NOTION_DATABASE_ID`로 입력해야 합니다
- ✅ Secret 값에는 공백이나 따옴표를 포함하지 마세요
- ✅ Secret을 추가한 후에는 값을 다시 볼 수 없으므로, 안전한 곳에 별도로 보관하세요
- ✅ Secret을 수정하려면 기존 Secret을 삭제하고 새로 추가해야 합니다
- ✅ Secret을 삭제하려면 Secret 이름 옆의 휴지통 아이콘을 클릭하세요

#### 3-2-9. 문제 해결
**Secret이 적용되지 않는 경우:**
1. Secret 이름이 정확한지 확인 (`VITE_NOTION_API_KEY`, `VITE_NOTION_DATABASE_ID`)
2. Actions 탭에서 최근 워크플로우 실행 로그 확인
3. 빌드 단계에서 환경 변수가 제대로 전달되는지 확인
4. 코드를 다시 푸시하여 재배포 시도

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

### 로컬 개발 환경
- [ ] 노션 Integration 생성 완료
- [ ] API Key 복사 및 저장 완료
- [ ] 데이터베이스 ID 확인 완료
- [ ] `.env` 파일 생성 및 값 입력 완료
- [ ] 데이터베이스에 Integration 연결 완료
- [ ] 데이터베이스 속성 설정 완료 (Title, Date 등)
- [ ] 개발 서버 재시작 완료
- [ ] 브라우저 콘솔에서 연결 성공 메시지 확인
- [ ] Story 페이지에서 데이터 표시 확인

### GitHub Pages 배포 환경
- [ ] GitHub 저장소 Settings 페이지 접속 완료
- [ ] Secrets and variables > Actions 메뉴 접근 완료
- [ ] `VITE_NOTION_API_KEY` Secret 추가 완료
- [ ] `VITE_NOTION_DATABASE_ID` Secret 추가 완료
- [ ] 코드 커밋 및 푸시 완료
- [ ] GitHub Actions 워크플로우 실행 확인
- [ ] 배포된 사이트에서 Story 페이지 확인

---

**도움이 필요하신가요?** 
- 브라우저 콘솔의 오류 메시지를 확인하세요
- `src/utils/notion.js` 파일의 로그를 확인하세요

