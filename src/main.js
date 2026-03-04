/**
 * 메인 애플리케이션 진입점
 * 간단한 SPA 라우터를 구현합니다.
 */

import { router } from './router.js';
import { renderNavigation } from './components/TopNavigation.js';
import { renderFooter } from './components/Footer.js';
import './index.css';
import './App.css';

// 앱 초기화
async function initApp() {
  try {
    console.log('🚀 앱 초기화 시작...');
    
    const app = document.getElementById('app');
    if (!app) {
      console.error('❌ App container not found');
      return;
    }

    // 앱 구조 생성
    app.innerHTML = `
      <div class="app">
        <div id="navigation"></div>
        <aside id="sub-menu"></aside>
        <div class="main-wrapper">
          <main class="app-main" id="main-content"></main>
        </div>
        <div id="footer"></div>
      </div>
    `;

    // 네비게이션과 푸터 렌더링
    try {
      renderNavigation();
      renderFooter();
      console.log('✅ 네비게이션과 푸터 렌더링 완료');
    } catch (error) {
      console.error('❌ 네비게이션/푸터 렌더링 오류:', error);
    }

    // 라우터 초기화
    try {
      router.init();
      console.log('✅ 라우터 초기화 완료');
    } catch (error) {
      console.error('❌ 라우터 초기화 오류:', error);
      throw error;
    }

    // 초기 라우트 렌더링
    try {
      router.handleRoute();
      console.log('✅ 초기 라우트 렌더링 완료');
    } catch (error) {
      console.error('❌ 라우트 렌더링 오류:', error);
    }
    
    console.log('✅ 앱 초기화 완료');
  } catch (error) {
    console.error('❌ 앱 초기화 중 치명적 오류:', error);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h1>앱 로딩 오류</h1>
          <p>애플리케이션을 초기화하는 중 오류가 발생했습니다.</p>
          <p style="color: #999; font-size: 12px;">${error.message}</p>
          <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">
            페이지 새로고침
          </button>
        </div>
      `;
    }
  }
}

// DOM 로드 완료 후 앱 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

