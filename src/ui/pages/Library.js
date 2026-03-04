/**
 * Library 페이지
 * Jukebox와 Bookshelf를 하나의 보기로 묶고, 토글로 전환.
 */

import { getNotionNotebooks } from '../../services/notionNotebooks.js';
import { getNotionTypeItems } from '../../services/notionByType.js';
import { fillJukeboxGallery } from './Jukebox.js';
import { renderBookshelfContent } from './Bookshelf.js';
import './Jukebox.css';
import './Bookshelf.css';
import './Library.css';

const JUKEBOX_LOADING_LOTTIE =
  'https://lottie.host/1ff458b1-27f6-4957-92d6-f3d5d9b52d17/qbzEiamboY.lottie';
const JUKEBOX_NAV_ICON_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><title>left_line</title><g fill='none' fill-rule='evenodd'><path d='M24 0v24H0V0z'/><path fill='currentColor' d='M8.293 12.707a1 1 0 0 1 0-1.414l5.657-5.657a1 1 0 1 1 1.414 1.414L10.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414l-5.657-5.657Z'/></g></svg>`;

const VIEW_JUKEBOX = 'jukebox';
const VIEW_BOOKSHELF = 'bookshelf';

export function renderLibrary(initialView = VIEW_JUKEBOX) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const view = initialView === VIEW_BOOKSHELF ? VIEW_BOOKSHELF : VIEW_JUKEBOX;

  mainContent.className = 'app-main library-active jukebox-active bookshelf-active';
  const mainWrapper = mainContent.closest('.main-wrapper');
  if (mainWrapper) mainWrapper.classList.add('library-active', 'jukebox-active', 'bookshelf-active');
  document.body.classList.add('library-active', 'jukebox-active', 'bookshelf-active');

  mainContent.innerHTML = `
    <div class="library-view" id="library-view">
      <div class="library-toggle" role="tablist" aria-label="보기 방식">
        <button type="button" class="library-toggle-btn ${view === VIEW_JUKEBOX ? 'active' : ''}" data-view="${VIEW_JUKEBOX}" role="tab" aria-selected="${view === VIEW_JUKEBOX}">주크박스</button>
        <button type="button" class="library-toggle-btn ${view === VIEW_BOOKSHELF ? 'active' : ''}" data-view="${VIEW_BOOKSHELF}" role="tab" aria-selected="${view === VIEW_BOOKSHELF}">책장</button>
      </div>
      <div class="library-panels">
        <div class="library-panel library-panel--jukebox" id="library-panel-jukebox" role="tabpanel" aria-hidden="${view !== VIEW_JUKEBOX}" ${view !== VIEW_JUKEBOX ? 'hidden' : ''}>
          <div class="jukebox-fullscreen">
            <div class="jukebox-gallery-wrap">
              <button type="button" class="jukebox-nav jukebox-nav--prev" id="library-jukebox-prev" aria-label="이전"><span class="jukebox-nav-icon">${JUKEBOX_NAV_ICON_SVG}</span></button>
              <button type="button" class="jukebox-nav jukebox-nav--next" id="library-jukebox-next" aria-label="다음"><span class="jukebox-nav-icon jukebox-nav-icon--next">${JUKEBOX_NAV_ICON_SVG}</span></button>
              <div class="jukebox-gallery centerized" id="library-jukebox-gallery">
                <div class="jukebox-loading" role="status" aria-live="polite">
                  <dotlottie-wc class="jukebox-loading-lottie" src="${JUKEBOX_LOADING_LOTTIE}" style="width:300px;height:300px" autoplay loop></dotlottie-wc>
                  <p class="jukebox-loading-text">노트를 불러오는 중...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="library-panel library-panel--bookshelf" id="library-panel-bookshelf" role="tabpanel" aria-hidden="${view !== VIEW_BOOKSHELF}" ${view !== VIEW_BOOKSHELF ? 'hidden' : ''}>
          <div class="bookshelf-fullscreen">
            <div class="bookshelf-viewport" id="library-bookshelf-viewport">
              <div class="bookshelf-loading" id="library-bookshelf-loading" role="status" aria-live="polite">
                <p class="bookshelf-loading-text">노트를 불러오는 중...</p>
              </div>
              <div id="library-bookshelf-rows-container" aria-hidden="true"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const root = document.getElementById('library-view');
  const panelJukebox = document.getElementById('library-panel-jukebox');
  const panelBookshelf = document.getElementById('library-panel-bookshelf');
  const toggleBtns = root.querySelectorAll('.library-toggle-btn');

  function setView(nextView) {
    const isJukebox = nextView === VIEW_JUKEBOX;
    root.setAttribute('data-view', nextView);
    panelJukebox.hidden = !isJukebox;
    panelJukebox.setAttribute('aria-hidden', !isJukebox);
    panelBookshelf.hidden = isJukebox;
    panelBookshelf.setAttribute('aria-hidden', isJukebox);
    toggleBtns.forEach((btn) => {
      const active = btn.getAttribute('data-view') === nextView;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active);
    });
  }

  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => setView(btn.getAttribute('data-view')));
  });

  Promise.allSettled([getNotionNotebooks(), getNotionTypeItems()])
    .then(([notebookResult, typeResult]) => {
      const notebooks = notebookResult.status === 'fulfilled' ? notebookResult.value : [];
      const typeItems = typeResult.status === 'fulfilled' ? typeResult.value : [];

      const byId = new Map();
      const add = (item) => {
        if (item?.id && !byId.has(item.id)) {
          byId.set(item.id, {
            id: item.id,
            title: item.title ?? '제목 없음',
            coverFrontUrl: item.coverFrontUrl || null,
            coverBackUrl: item.coverBackUrl || null
          });
        }
      };
      (Array.isArray(notebooks) ? notebooks : []).forEach(add);
      (Array.isArray(typeItems) ? typeItems : []).forEach(add);
      const allNotes = Array.from(byId.values());

      const gallery = document.getElementById('library-jukebox-gallery');
      const prevBtn = document.getElementById('library-jukebox-prev');
      const nextBtn = document.getElementById('library-jukebox-next');
      fillJukeboxGallery(gallery, prevBtn, nextBtn, allNotes);

      const loading = document.getElementById('library-bookshelf-loading');
      const viewport = document.getElementById('library-bookshelf-viewport');
      const container = document.getElementById('library-bookshelf-rows-container');
      loading.remove();
      renderBookshelfContent(viewport, container, notebooks, typeItems);

      const resizeObserver = new ResizeObserver(() => {
        if (container.querySelector('.bookshelf-empty')) return;
        renderBookshelfContent(viewport, container, notebooks, typeItems);
      });
      resizeObserver.observe(viewport);
    })
    .catch((err) => {
      console.warn('Library: 노트 로드 실패', err);
      document.getElementById('library-jukebox-gallery').innerHTML =
        '<div class="jukebox-empty">노트를 불러올 수 없습니다.</div>';
      document.getElementById('library-bookshelf-loading').remove();
      document.getElementById('library-bookshelf-rows-container').innerHTML =
        '<div class="bookshelf-empty">노트를 불러올 수 없습니다.</div>';
      document.getElementById('library-bookshelf-rows-container').removeAttribute('aria-hidden');
    });
}
