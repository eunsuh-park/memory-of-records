/**
 * 메인 애플리케이션 진입점
 * 간단한 SPA 라우터를 구현합니다.
 */

import { router } from './router.js';
import { renderTopNavigation } from './components/TopNavigation.js';
import { renderFooter } from './components/Footer.js';
import './index.css';
import './App.css';

// 앱 초기화
function initApp() {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App container not found');
    return;
  }

  // 앱 구조 생성
  app.innerHTML = `
    <div class="app">
      <div id="top-navigation"></div>
      <main class="app-main" id="main-content"></main>
      <div id="footer"></div>
    </div>
  `;

  // 네비게이션과 푸터 렌더링
  renderTopNavigation();
  renderFooter();

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

