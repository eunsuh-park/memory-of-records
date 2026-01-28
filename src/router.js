/**
 * 간단한 SPA 라우터
 */

import { renderHome } from './pages/Home.js';
import { renderTimeline } from './pages/Timeline.js';
import { renderStory } from './pages/Story.js';
import { renderStoryDetail } from './pages/StoryDetail.js';
import { renderNoteDetail } from './pages/NoteDetail.js';

// base 경로 가져오기 (Vite의 import.meta.env.BASE_URL 사용)
const BASE_URL = import.meta.env.BASE_URL || '/';

class Router {
  constructor() {
    this.routes = [
      { path: '/', handler: renderHome },
      { path: '/timeline', handler: () => renderTimeline(null) },
      { path: '/timeline/:period', handler: (params) => renderTimeline(params.period) },
      { path: '/story', handler: renderStory },
      { path: '/story/:id', handler: (params) => renderStoryDetail(params.id) },
      { path: '/note/:id', handler: (params) => renderNoteDetail(params.id) },
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

    // 상세 페이지가 아닐 때 클래스 제거
    if (!path.startsWith('/story/')) {
      document.body.classList.remove('story-detail-page-active');
    }
    if (!path.startsWith('/note/')) {
      document.body.classList.remove('note-detail-modal');
    }

    // Timeline 페이지가 아닐 때 서브 메뉴 제거
    if (!path.startsWith('/timeline')) {
      document.body.classList.remove(
        'timeline-active',
        'period-elementary',
        'period-middle-high',
        'period-university',
        'period-after-graduation'
      );
      const subMenu = document.getElementById('sub-menu');
      if (subMenu) {
        subMenu.remove();
      }
      
      // Timeline 페이지가 아닐 때 TimelineScrollBar 제거
      const timelineScrollBar = document.getElementById('timeline-scrollbar');
      if (timelineScrollBar) {
        timelineScrollBar.remove();
      }
    }

    // 네비게이션 업데이트
    const { renderNavigation } = await import('./components/TopNavigation.js');
    renderNavigation();

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

