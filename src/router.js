/**
 * 간단한 SPA 라우터
 */

import { renderHome } from './pages/Home.js';
import { renderTimeline } from './pages/Timeline.js';
import { renderYear } from './pages/Year.js';
import { renderStory } from './pages/Story.js';
import { renderStoryDetail } from './pages/StoryDetail.js';
import { renderNoteDetail } from './pages/NoteDetail.js';

class Router {
  constructor() {
    this.routes = [
      { path: '/', handler: renderHome },
      { path: '/timeline', handler: () => renderTimeline(null) },
      { path: '/timeline/:period', handler: (params) => renderTimeline(params.period) },
      { path: '/year', handler: () => renderYear(null) },
      { path: '/year/:year', handler: (params) => renderYear(parseInt(params.year)) },
      { path: '/story', handler: renderStory },
      { path: '/story/:id', handler: (params) => renderStoryDetail(parseInt(params.id)) },
      { path: '/note/:id', handler: (params) => renderNoteDetail(parseInt(params.id)) },
    ];
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
    window.history.pushState({}, '', path);
    this.handleRoute();
  }

  async handleRoute() {
    const path = window.location.pathname;
    const mainContent = document.getElementById('main-content');
    
    if (!mainContent) {
      console.error('Main content container not found');
      return;
    }

    // 상세 페이지가 아닐 때 클래스 제거
    if (!path.startsWith('/story/')) {
      document.body.classList.remove('story-detail-page-active');
    }

    // 네비게이션 업데이트
    const { renderTopNavigation } = await import('./components/TopNavigation.js');
    renderTopNavigation();

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
      mainContent.innerHTML = `
        <div style="text-align: center; padding: 4rem;">
          <h1>404 - 페이지를 찾을 수 없습니다</h1>
          <p>요청하신 페이지가 존재하지 않습니다.</p>
          <a href="/" data-link>홈으로 돌아가기</a>
        </div>
      `;
    }
  }
}

export const router = new Router();

