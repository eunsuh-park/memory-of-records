# Notion API 프록시 설정 가이드

GitHub Pages에서 Notion API를 사용할 때 발생하는 CORS 문제를 해결하기 위한 프록시 서버 설정 가이드입니다.

## 문제 상황

브라우저에서 직접 Notion API를 호출하면 CORS(Cross-Origin Resource Sharing) 정책에 의해 차단됩니다. GitHub Pages는 정적 사이트만 호스팅하므로 서버 사이드 프록시가 필요합니다.

## 해결 방법: Vercel Functions 사용

Vercel Functions를 사용하여 Notion API 프록시를 만들고, GitHub Pages에서 이 프록시를 사용하도록 설정합니다.

---

## 1단계: Vercel Functions 파일 확인

프로젝트에 다음 파일들이 있는지 확인하세요:
- `api/notion/[...path].js` - 동적 경로를 처리하는 Vercel Function

---

## 2단계: Vercel에 프로젝트 배포

### 2-1. Vercel 계정 생성 및 로그인
1. [vercel.com](https://vercel.com)에 접속
2. GitHub 계정으로 로그인

### 2-2. 새 프로젝트 생성
1. Vercel 대시보드에서 **"Add New..."** → **"Project"** 클릭
2. GitHub 저장소 선택 (memory-of-records)
3. 프로젝트 설정:
   - **Framework Preset**: Vite (또는 Other)
   - **Root Directory**: `.` (기본값)
   - **Build Command**: `npm run build` (또는 비워두기 - Functions만 사용)
   - **Output Directory**: `dist` (또는 비워두기)
4. **"Deploy"** 클릭

### 2-3. 환경 변수 설정
1. 프로젝트 배포 후 **"Settings"** → **"Environment Variables"** 클릭
2. 다음 환경 변수 추가:
   - **Name**: `NOTION_API_KEY`
   - **Value**: Notion API 키 (예: `secret_abc123...`)
   - **Environment**: Production, Preview, Development 모두 선택
3. **"Save"** 클릭

### 2-4. 재배포
1. 환경 변수 추가 후 **"Deployments"** 탭으로 이동
2. 최신 배포 옆의 **"..."** 메뉴 클릭
3. **"Redeploy"** 선택
4. 재배포 완료 대기

---

## 3단계: 프록시 URL 확인 및 설정

### 3-1. Vercel 배포 URL 확인
1. Vercel 대시보드에서 프로젝트 선택
2. **"Deployments"** 탭에서 최신 배포 확인
3. 배포 URL 복사 (예: `https://memory-of-records.vercel.app`)

### 3-2. GitHub Secrets에 프록시 URL 추가
1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. **"New repository secret"** 클릭
3. 다음 정보 입력:
   - **Name**: `VITE_NOTION_PROXY_URL`
   - **Secret**: Vercel 배포 URL (예: `https://memory-of-records.vercel.app/api/notion`)
4. **"Add secret"** 클릭

### 3-3. 재배포
1. 코드를 커밋하고 푸시하여 GitHub Actions 재배포 트리거
2. 또는 GitHub Actions에서 수동으로 재실행

---

## 4단계: 테스트

1. 배포된 GitHub Pages 사이트에서 Story 페이지 접속
2. 브라우저 개발자 도구(F12) → Console 탭 확인
3. CORS 오류가 사라지고 Notion 데이터가 로드되는지 확인

---

## 대안: Netlify Functions 사용

Vercel 대신 Netlify를 사용할 수도 있습니다.

### Netlify Functions 설정
1. `netlify/functions/notion.js` 파일 생성
2. Netlify에 프로젝트 배포
3. Netlify 환경 변수에 `NOTION_API_KEY` 설정
4. GitHub Secrets에 `VITE_NOTION_PROXY_URL`을 Netlify 함수 URL로 설정

---

## 문제 해결

### 프록시가 작동하지 않는 경우
1. Vercel Functions 로그 확인 (Vercel 대시보드 → Functions 탭)
2. 환경 변수가 올바르게 설정되었는지 확인
3. 프록시 URL이 정확한지 확인 (끝에 `/api/notion` 포함)
4. CORS 헤더가 올바르게 설정되었는지 확인

### 여전히 CORS 오류가 발생하는 경우
1. 브라우저 캐시 삭제
2. Vercel Functions 코드에서 CORS 헤더 확인
3. 프록시 URL이 올바른지 확인

---

## 참고사항

- Vercel Functions는 무료 플랜에서도 사용 가능합니다
- 프록시를 통해 API 키가 노출되지 않도록 주의하세요
- 프로덕션 환경에서만 프록시를 사용하도록 설정되어 있습니다 (개발 환경은 로컬 프록시 사용)

