# 문제 해결 가이드

## Story 페이지가 작동하지 않는 경우

### 1. 브라우저 콘솔 확인

브라우저 개발자 도구(F12) → Console 탭에서 다음을 확인하세요:

#### ✅ 정상적인 경우
```
🔗 Notion API 호출: {
  isDev: false,
  useProxy: true,
  proxyUrl: "https://your-project.vercel.app/api/notion",
  apiUrl: "https://your-project.vercel.app/api/notion/v1/databases/..."
}
```

#### ❌ 문제가 있는 경우

**케이스 1: 프록시 URL이 설정되지 않음**
```
❌ 프로덕션 환경에서는 VITE_NOTION_PROXY_URL이 필요합니다.
```
**해결 방법:**
- GitHub Secrets에 `VITE_NOTION_PROXY_URL` 추가 확인
- 값 형식: `https://your-project.vercel.app/api/notion` (끝에 `/api/notion` 포함)

**케이스 2: 여전히 직접 Notion API 호출**
```
🔗 Notion API 호출: {
  isDev: false,
  useProxy: false,
  proxyUrl: "",
  apiUrl: "https://api.notion.com/v1/databases/..."
}
```
**해결 방법:**
- GitHub Secrets에 `VITE_NOTION_PROXY_URL`이 올바르게 설정되었는지 확인
- GitHub Actions 빌드 로그에서 환경 변수가 전달되었는지 확인
- 코드를 다시 푸시하여 재배포

**케이스 3: CORS 오류**
```
Access to fetch at 'https://api.notion.com/...' has been blocked by CORS policy
```
**해결 방법:**
- 프록시 URL이 올바르게 설정되었는지 확인
- Vercel Functions가 제대로 배포되었는지 확인

**케이스 4: 프록시 서버 오류**
```
GET https://your-project.vercel.app/api/notion/... 500 (Internal Server Error)
```
**해결 방법:**
- Vercel 대시보드 → Functions 탭에서 오류 로그 확인
- Vercel 환경 변수에 `NOTION_API_KEY`가 설정되었는지 확인

---

### 2. GitHub Secrets 확인

1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. 다음 3개의 Secrets가 있는지 확인:
   - ✅ `VITE_NOTION_API_KEY`
   - ✅ `VITE_NOTION_DATABASE_ID`
   - ✅ `VITE_NOTION_PROXY_URL`

3. `VITE_NOTION_PROXY_URL` 값 확인:
   - 올바른 형식: `https://your-project.vercel.app/api/notion`
   - 잘못된 형식: `https://your-project.vercel.app` (끝에 `/api/notion` 없음)

---

### 3. Vercel Functions 확인

1. Vercel 대시보드 접속
2. 프로젝트 선택
3. **Functions** 탭 클릭
4. `api/notion/[...path]` 함수가 있는지 확인
5. 함수를 클릭하여 로그 확인

**함수가 없는 경우:**
- `api/notion/[...path].js` 파일이 프로젝트 루트에 있는지 확인
- Vercel에 프로젝트를 다시 배포

---

### 4. Vercel 환경 변수 확인

1. Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables**
2. 다음 환경 변수가 있는지 확인:
   - ✅ `NOTION_API_KEY` (또는 `VITE_NOTION_API_KEY`)

**주의사항:**
- Vercel 환경 변수 이름은 `NOTION_API_KEY` 또는 `VITE_NOTION_API_KEY` 둘 다 가능
- 값은 Notion API 키 (예: `secret_abc123...`)

---

### 5. GitHub Actions 빌드 로그 확인

1. GitHub 저장소 → **Actions** 탭
2. 최신 워크플로우 실행 클릭
3. **Build** 단계 로그 확인
4. 환경 변수가 전달되었는지 확인:
   ```
   VITE_NOTION_API_KEY=***
   VITE_NOTION_DATABASE_ID=***
   VITE_NOTION_PROXY_URL=***
   ```

**환경 변수가 전달되지 않는 경우:**
- GitHub Secrets에 값이 올바르게 설정되었는지 확인
- `.github/workflows/deploy.yml` 파일에서 환경 변수가 정의되어 있는지 확인

---

### 6. 재배포

모든 설정을 확인한 후:

1. **GitHub에 푸시:**
   ```bash
   git add .
   git commit -m "Fix: Notion proxy configuration"
   git push
   ```

2. **Vercel 재배포:**
   - Vercel 대시보드 → Deployments
   - 최신 배포 옆의 **"..."** 메뉴 → **"Redeploy"**

3. **배포 완료 대기 후 테스트**

---

## 체크리스트

문제 해결을 위해 다음을 확인하세요:

- [ ] GitHub Secrets에 3개의 Secrets 모두 추가됨
- [ ] `VITE_NOTION_PROXY_URL` 값이 올바른 형식 (`https://.../api/notion`)
- [ ] Vercel에 프로젝트 배포됨
- [ ] Vercel Functions에 `api/notion/[...path]` 함수 존재
- [ ] Vercel 환경 변수에 `NOTION_API_KEY` 설정됨
- [ ] GitHub Actions 빌드 로그에서 환경 변수 전달 확인
- [ ] 코드 푸시 후 재배포 완료
- [ ] 브라우저 콘솔에서 프록시 URL 사용 확인

---

## 여전히 문제가 있는 경우

1. 브라우저 콘솔의 전체 오류 메시지 복사
2. Vercel Functions 로그 확인
3. GitHub Actions 빌드 로그 확인
4. 위의 체크리스트를 다시 확인

