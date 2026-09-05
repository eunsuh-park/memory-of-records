import { defineConfig } from 'vite'
import { loadEnv } from 'vite'

/** 카톡 크롤러는 상대경로 og:image를 무시한다. 빌드 HTML에 절대 URL을 심는다. */
function siteHost(env) {
  return String(env.VITE_SITE_ORIGIN || env.VERCEL_PROJECT_PRODUCTION_URL || 'memory-of-records.vercel.app')
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
}

function ogImageAbsoluteUrl(env) {
  return `https://${siteHost(env)}/og-default.jpg?v=2`;
}

function ogPageAbsoluteUrl(env) {
  return `https://${siteHost(env)}/`;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 환경 변수 로드
  const env = loadEnv(mode, process.cwd(), '');
  
  // GitHub Pages base 경로 설정
  // VITE_BASE_PATH 환경 변수가 있으면 사용, 없으면 기본값 '/'
  const base = env.VITE_BASE_PATH || '/';
  const envForOg = { ...env, ...process.env };
  const ogImage = ogImageAbsoluteUrl(envForOg);
  const ogPage = ogPageAbsoluteUrl(envForOg);
  
  return {
    base: base,
    assetsInclude: ['**/*.lottie'],
    plugins: [
      {
        name: 'og-image-absolute-url',
        transformIndexHtml(html) {
          return html.replaceAll('__OG_IMAGE_URL__', ogImage).replaceAll('__OG_PAGE_URL__', ogPage);
        }
      }
    ],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  };
})
