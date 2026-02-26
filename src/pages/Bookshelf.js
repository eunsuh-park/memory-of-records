/**
 * Bookshelf 페이지
 * 전체 노트를 한 줄로 축소해 보여줍니다. 노트 이미지 높이 480px, 비율 고정, 너비 전체에 맞춤.
 */

import { getNotionNotebooks } from '../utils/notionNotebooks.js';
import { getNotionTypeItems } from '../utils/notionByType.js';
import './Bookshelf.css';

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 한 줄 행을 뷰포트 너비에 맞게 축소하는 scale 값 적용 */
function fitRowToViewport(viewportEl, rowEl) {
  if (!viewportEl || !rowEl) return;
  const viewportWidth = viewportEl.clientWidth;
  const rowWidth = rowEl.scrollWidth;
  if (rowWidth <= 0) return;
  const scale = Math.min(1, (viewportWidth - 48) / rowWidth); /* 좌우 여백 고려 */
  rowEl.style.transform = `scale(${scale})`;
}

export function renderBookshelf() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.className = 'app-main bookshelf-active';
  const mainWrapper = mainContent.closest('.main-wrapper');
  if (mainWrapper) mainWrapper.classList.add('bookshelf-active');
  document.body.classList.add('bookshelf-active');

  mainContent.innerHTML = `
    <div class="bookshelf-fullscreen" id="bookshelf-fullscreen">
      <div class="bookshelf-viewport" id="bookshelf-viewport">
        <div class="bookshelf-loading" id="bookshelf-loading" role="status" aria-live="polite">
          <p class="bookshelf-loading-text">노트를 불러오는 중...</p>
        </div>
        <div class="bookshelf-row" id="bookshelf-row" aria-hidden="true"></div>
      </div>
    </div>
  `;

  const viewport = document.getElementById('bookshelf-viewport');
  const row = document.getElementById('bookshelf-row');
  const loading = document.getElementById('bookshelf-loading');

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
            coverFrontUrl: item.coverFrontUrl || null
          });
        }
      };
      (Array.isArray(notebooks) ? notebooks : []).forEach(add);
      (Array.isArray(typeItems) ? typeItems : []).forEach(add);
      const allNotes = Array.from(byId.values());

      loading.remove();

      if (allNotes.length === 0) {
        row.innerHTML = '<div class="bookshelf-empty">표시할 노트가 없습니다.</div>';
        row.removeAttribute('aria-hidden');
        return;
      }

      row.innerHTML = allNotes
        .map((note) => {
          const coverSrc = note.coverFrontUrl || TRANSPARENT_PIXEL;
          const title = escapeHtml(note.title);
          return `
            <div class="bookshelf-item">
              <img src="${escapeHtml(coverSrc)}" alt="${title}" loading="lazy" referrerpolicy="no-referrer" class="bookshelf-cover" />
            </div>
          `;
        })
        .join('');

      row.removeAttribute('aria-hidden');

      row.querySelectorAll('.bookshelf-cover').forEach((img) => {
        img.addEventListener('error', () => img.classList.add('bookshelf-cover--error'), { once: true });
        img.addEventListener('load', () => fitRowToViewport(viewport, row), { once: true });
      });

      fitRowToViewport(viewport, row);
      const resizeObserver = new ResizeObserver(() => fitRowToViewport(viewport, row));
      resizeObserver.observe(viewport);
    })
    .catch((err) => {
      console.warn('Bookshelf: 노트 로드 실패', err);
      loading.remove();
      row.innerHTML = '<div class="bookshelf-empty">노트를 불러올 수 없습니다.</div>';
      row.removeAttribute('aria-hidden');
    });
}
