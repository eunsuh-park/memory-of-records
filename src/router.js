/**
 * 간단한 SPA 라우터
 */

import { renderTimeline } from './pages/Notes/Timeline.js';
import { renderByType } from './pages/Notes/ByType.js';
import { renderStory } from './pages/Story/Story.js';
import { renderNoteDetailPage } from './components/NoteImageViewer/NoteImageViewer.js';
import { renderUiLab } from './pages/UiLab/UiLab.js';
import { renderLogin } from './pages/Login/Login.js';

// base 경로 가져오기 (Vite의 import.meta.env.BASE_URL 사용)
const BASE_URL = import.meta.env.BASE_URL || '/';

class Router {
  constructor() {
    this.routes = [
      { path: '/', handler: () => renderTimeline(null) },
      { path: '/timeline', handler: () => renderTimeline(null) },
      { path: '/timeline/:period', handler: (params) => renderTimeline(params.period) },
      { path: '/by-type', handler: () => renderByType(null) },
      { path: '/by-type/:type', handler: (params) => renderByType(params.type) },
      { path: '/story', handler: renderStory },
      { path: '/note/:id', handler: (params) => renderNoteDetailPage(params.id) },
      { path: '/login', handler: () => { void renderLogin(); } },
      /* 내부 리뷰용 — 메인 네비에 노출하지 않음 */
      { path: '/ui-lab', handler: renderUiLab },
    ];
  }

  // base 경로를 제거한 실제 경로 반환
  getActualPath(pathname) {
    if (BASE_URL === '/') {
      return pathname;
    }
    // base 경로가 있으면 제거
    // BASE_URL은 항상 '/'로 끝나므로, 마지막 '/'를 제거한 길이만큼 슬라이스
    const basePathWithoutTrailingSlash = BASE_URL.endsWith('/') 
      ? BASE_URL.slice(0, -1) 
      : BASE_URL;
    
    if (pathname.startsWith(basePathWithoutTrailingSlash)) {
      const actualPath = pathname.slice(basePathWithoutTrailingSlash.length) || '/';
      return actualPath;
    }
    return pathname;
  }

  init() {
    // popstate 이벤트 리스너 (뒤로가기/앞으로가기)
    window.addEventListener('popstate', () => {
      this.handleRoute();
    });

    // 링크 클릭 이벤트 위임
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-link]');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          this.navigate(href);
        }
      }
    });
  }

  navigate(path) {
    // base 경로를 포함한 전체 경로 생성
    const fullPath = BASE_URL === '/' ? path : BASE_URL.slice(0, -1) + path;
    
    // 같은 경로로 이동하는 경우 아무것도 하지 않음
    if (window.location.pathname === fullPath) {
      return;
    }
    window.history.pushState({}, '', fullPath);
    this.handleRoute();
  }

  async handleRoute() {
    // base 경로를 제거한 실제 경로 사용
    const path = this.getActualPath(window.location.pathname);
    const mainContent = document.getElementById('main-content');
    
    if (!mainContent) {
      console.error('Main content container not found');
      return;
    }

    if (!path.startsWith('/note/')) {
      document.body.classList.remove('note-detail-modal');
    }

    // Jukebox(갤러리)가 아닐 때 jukebox-active 제거 (Timeline/By Type 통합 페이지에서 사용)
    const isNotesPage = path === '/' || path.startsWith('/timeline') || path.startsWith('/by-type');
    if (!isNotesPage) {
      document.body.classList.remove('jukebox-active', 'filter-nav-collapsed', 'filter-nav-open');
      mainContent?.classList.remove('jukebox-active');
      mainContent?.closest('.main-wrapper')?.classList.remove('jukebox-active');
    }

    // Timeline/By type 페이지가 아닐 때 서브 메뉴 내용만 비움 (노드는 유지)
    if (!isNotesPage) {
      const subMenu = document.getElementById('sub-menu');
      if (subMenu) subMenu.innerHTML = '';
    }

    // PageHeader 업데이트
    const { renderPageHeader } = await import('./widgets/PageHeader/PageHeader.js');
    renderPageHeader();

    // 경로 매칭
    for (const route of this.routes) {
      const match = this.matchRoute(route.path, path);
      if (match) {
        try {
          route.handler(match.params);
          return;
        } catch (error) {
          console.error('Error rendering route:', error);
          this.render404();
          return;
        }
      }
    }

    // 매칭되는 라우트가 없으면 404
    this.render404();
  }

  matchRoute(routePath, currentPath) {
    const routeParts = routePath.split('/');
    const pathParts = currentPath.split('/');

    if (routeParts.length !== pathParts.length) {
      return null;
    }

    const params = {};

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const pathPart = pathParts[i];

      if (routePart.startsWith(':')) {
        // 파라미터 추출
        const paramName = routePart.slice(1);
        params[paramName] = pathPart;
      } else if (routePart !== pathPart) {
        return null;
      }
    }

    return { params };
  }

  render404() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      const homePath = BASE_URL === '/' ? '/' : BASE_URL.slice(0, -1) + '/';
      mainContent.innerHTML = `
        <div style="text-align: center; padding: 4rem;">
          <h1>404 - 페이지를 찾을 수 없습니다</h1>
          <p>요청하신 페이지가 존재하지 않습니다.</p>
          <a href="${homePath}" data-link>홈으로 돌아가기</a>
        </div>
      `;
    }
  }
}

export const router = new Router();

