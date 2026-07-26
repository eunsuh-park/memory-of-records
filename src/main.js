/**
 * 메인 애플리케이션 진입점
 * 간단한 SPA 라우터를 구현합니다.
 */

import { router } from './router.js';
import { render as renderButton } from './components/Button/Button.js';
import { renderPageHeader } from './widgets/PageHeader/PageHeader.js';
import { renderFooter } from './components/Footer/Footer.js';
import { mountAddNoteFab } from './components/AddNoteFab/AddNoteFab.js';
import { requestPdfFolderSync } from './services/pdfFolderSync.js';
import { initTheme } from './utils/theme.js';
import './index.css';
import './App.css';

// 앱 초기화
async function initApp() {
  try {
    console.log('🚀 앱 초기화 시작...');
    initTheme();
    
    const app = document.getElementById('app');
    if (!app) {
      console.error('❌ App container not found');
      return;
    }

    // 앱 구조 생성
    app.innerHTML = `
      <div class="app">
        <div id="page-header"></div>
        <div class="main-wrapper">
          <main class="app-main" id="main-content"></main>
        </div>
        <div id="footer"></div>
      </div>
    `;

    // PageHeader와 푸터 렌더링
    try {
      renderPageHeader();
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

    /* 우측 하단 + FAB: 새 노트 추가 */
    mountAddNoteFab({
      onCreated: () => {
        router.handleRoute();
      }
    });
    
    console.log('✅ 앱 초기화 완료');

    /* Cloudinary → Notion pdf_folder_url 자동 채움 (백그라운드, 세션당 1회) */
    requestPdfFolderSync();
  } catch (error) {
    console.error('❌ 앱 초기화 중 치명적 오류:', error);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h1>앱 로딩 오류</h1>
          <p>애플리케이션을 초기화하는 중 오류가 발생했습니다.</p>
          <p style="color: #999; font-size: 12px;">${error.message}</p>
          <div style="margin-top: 20px;">
            ${renderButton({ variant: 'toolbar', ariaLabel: '페이지 새로고침', content: '페이지 새로고침', className: 'app-error-reload-btn' })}
          </div>
        </div>
      `;
      app.querySelector('.app-error-reload-btn')?.addEventListener('click', () => location.reload());
    }
  }
}

// DOM 로드 완료 후 앱 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

