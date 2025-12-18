/**
 * 메인 애플리케이션 진입점
 * 간단한 SPA 라우터를 구현합니다.
 */

import { router } from './router.js';
import { renderNavigation } from './components/TopNavigation.js';
import { renderFooter } from './components/Footer.js';
import { testNotionConnection } from './utils/notion.js';
import './index.css';
import './App.css';

// 앱 초기화
async function initApp() {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App container not found');
    return;
  }

  // 앱 구조 생성
  app.innerHTML = `
    <div class="app">
      <div id="navigation"></div>
      <div class="main-wrapper">
        <main class="app-main" id="main-content"></main>
      </div>
      <div id="footer"></div>
    </div>
  `;

  // 네비게이션과 푸터 렌더링
  renderNavigation();
  renderFooter();

  // 노션 DB 자동 연결 테스트
  console.log('🔗 노션 DB 연결 확인 중...');
  await testNotionConnection();

  // 라우터 초기화
  router.init();

  // 초기 라우트 렌더링
  router.handleRoute();
}

// DOM 로드 완료 후 앱 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

