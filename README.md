# Memory of Records

> 아날로그 기록의 추억을 디지털로 아카이브하는 웹 애플리케이션

**Memory of Records**는 2005년부터 현재까지 사용해온 아날로그 노트들을 시기별, 유형별로 정리하고 아카이브하는 개인 프로젝트입니다. Notion을 데이터 소스로 활용하여 노트의 메타데이터와 이미지를 관리하며, 레코드판의 미학적 감성을 웹 디자인에 담았습니다.

## ✨ 주요 기능

- **시기별 보기 (Timeline)**: 초등학교, 중고등학교, 대학교, 졸업 후 등 시기별로 노트 탐색
- **유형별 보기 (By Type)**: 노트의 종류(일기장, 스케치북, 플래너 등)별로 분류하여 탐색
- **갤러리 뷰**: 노트 표지를 이미지 갤러리 형태로 탐색
- **노트 상세 보기**: PDF 뷰어로 노트의 내용을 확인
- **Story 페이지**: 프로젝트 소개 및 기록에 대한 철학 공유

## 🛠 기술 스택

- **Frontend**: Vanilla JavaScript (ES6+)
- **Build Tool**: Vite 7
- **CMS**: Notion API
- **Hosting**: GitHub Pages / Vercel / Netlify
- **Styling**: CSS3 (Custom Properties, Grid, Flexbox)
- **Animation**: Lottie, CSS Animations

## 📦 설치 및 실행

### 필수 요구사항

- Node.js 18 이상
- npm 또는 yarn

### 로컬 개발 환경 설정

1. **저장소 클론**
   ```bash
   git clone https://github.com/your-username/memory-of-records.git
   cd memory-of-records
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정**
   ```bash
   # .env.example을 복사하여 .env 파일 생성
   cp .env.example .env
   
   # .env 파일을 열어 필요한 값 입력
   # - VITE_NOTION_API_KEY: Notion API 키
   # - VITE_NOTION_DATABASE_ID: Notion 데이터베이스 ID
   ```

4. **개발 서버 실행**
   ```bash
   npm run dev
   ```
   
   브라우저에서 `http://localhost:5173` 접속

### 빌드

```bash
# 프로덕션 빌드
npm run build

# 빌드된 파일 미리보기
npm run preview
```

## 🔧 환경 변수 설정

자세한 환경 변수 설명은 `.env.example` 파일을 참조하세요.

주요 환경 변수:
- `VITE_NOTION_API_KEY`: Notion API Integration Token
- `VITE_NOTION_DATABASE_ID`: Notion 데이터베이스 ID
- `VITE_BASE_PATH`: GitHub Pages 배포 시 base 경로 (선택)

### Notion 설정 방법

1. [Notion Integrations](https://www.notion.so/my-integrations) 페이지에서 새 Integration 생성
2. Integration Token을 복사하여 `VITE_NOTION_API_KEY`에 설정
3. Notion에서 사용할 데이터베이스를 Integration과 연결
4. 데이터베이스 URL에서 ID를 추출하여 `VITE_NOTION_DATABASE_ID`에 설정

자세한 Notion 설정 가이드는 [`docs/README_NOTION_SETUP.md`](docs/README_NOTION_SETUP.md)를 참조하세요.

## 📁 프로젝트 구조

```
memory-of-records/
├── api/                    # Vercel Serverless Functions
│   ├── notionByPeriod.js  # 시기별 노트 API
│   └── notionByType.js    # 유형별 노트 API
├── docs/                   # 프로젝트 문서
├── public/                 # 정적 파일
├── src/
│   ├── components/         # 재사용 가능한 컴포넌트
│   ├── data/              # 정적 데이터 (Story 컨텐츠 등)
│   ├── pages/             # 페이지 컴포넌트
│   ├── services/          # API 호출 및 비즈니스 로직
│   ├── styles/            # 전역 스타일
│   ├── utils/             # 유틸리티 함수
│   ├── widgets/           # 복합 컴포넌트
│   ├── main.js            # 앱 진입점
│   └── router.js          # SPA 라우터
├── .env.example           # 환경 변수 예시
├── index.html             # HTML 진입점
├── package.json           # 프로젝트 설정
└── vite.config.js         # Vite 설정
```

## 🚀 배포

### GitHub Pages

GitHub Actions를 통해 자동 배포됩니다. `main` 또는 `master` 브랜치에 푸시하면 자동으로 빌드 및 배포가 진행됩니다.

필요한 GitHub Secrets:
- `VITE_NOTION_API_KEY`
- `VITE_NOTION_DATABASE_ID`

### Vercel

```bash
# Vercel CLI로 배포
npm install -g vercel
vercel
```

### Netlify

Netlify Dashboard에서 저장소를 연결하거나 Netlify CLI를 사용하세요.

```bash
# Netlify CLI로 배포
npm install -g netlify-cli
netlify deploy --prod
```

## 📚 문서

프로젝트 관련 상세 문서는 [`docs/`](docs/) 폴더를 참조하세요:

- [Notion 설정 가이드](docs/README_NOTION_SETUP.md)
- [메뉴 구조](docs/MENU-TREE.md)
- [Jukebox 캐러셀 사용법](docs/JUKEBOX-CAROUSEL-MANUAL.md)
- [Timeline ByType 서브메뉴](docs/TIMELINE_BYTYPE_SUBMENU.md)

## 🎨 디자인 철학

이 프로젝트는 아날로그 레코드의 **미학(Aesthetics)**을 웹 디자인에 녹여내고자 했습니다:

- **빈티지 감성**: 오래된 노트의 질감과 색감
- **책형 레이아웃**: Story 페이지의 책 넘기기 애니메이션
- **갤러리 뷰**: 레코드판처럼 노트를 진열하는 인터페이스

## 🤝 기여

이 프로젝트는 개인 프로젝트이지만, 버그 리포트나 제안은 환영합니다.

## 📄 라이선스

모든 사진과 글에 대한 개인 및 상업적 이용은 불가합니다.

## 👤 제작자

© 2026 Memory of Records. PES All rights reserved.

---

## React + Vite (원본 템플릿 정보)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

