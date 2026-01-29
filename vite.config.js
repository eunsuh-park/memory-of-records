import { defineConfig } from 'vite'
import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 환경 변수 로드
  const env = loadEnv(mode, process.cwd(), '');
  
  // GitHub Pages base 경로 설정
  // VITE_BASE_PATH 환경 변수가 있으면 사용, 없으면 기본값 '/'
  const base = env.VITE_BASE_PATH || '/';
  
  return {
    base: base,
    assetsInclude: ['**/*.lottie'],
    // Vanilla JS 프로젝트이므로 플러그인 없음
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
