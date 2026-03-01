/**
 * Bookshelf 페이지
 * 3줄 구조: 1줄 타임라인 노트, 2~3줄 타입별 노트(2종류씩).
 * 노트 크기 고정, 100vw·100vh에 맞춰 겹침 적용.
 */

import { getNotionNotebooks } from '../utils/notionNotebooks.js';
import { getNotionTypeItems } from '../utils/notionByType.js';
import './Bookshelf.css';

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const ITEM_SIZE_PX = 140;
/** 한 줄에 넣을 타입 종류 수 */
const TYPES_PER_ROW = 2;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 한 줄에 K개 아이템이 100vw에 들어가도록 겹침(px) 계산.
 * overlap = (K * ITEM_SIZE - viewportWidth) / (K - 1), K > 1.
 */
function getOverlapForRow(viewportWidth, itemCount) {
  if (itemCount <= 0) return 0;
  if (itemCount === 1) return 0;
  const totalWidth = itemCount * ITEM_SIZE_PX;
  if (totalWidth <= viewportWidth) return 0;
  return (totalWidth - viewportWidth) / (itemCount - 1);
}

/**
 * 타입 아이템을 type별로 그룹화 후, TYPES_PER_ROW개씩 묶어 행 배열로 반환.
 * @returns {Array<Array<{id, title, coverFrontUrl}>>} 각 행의 노트 배열
 */
function groupTypeItemsByRow(typeItems) {
  if (!Array.isArray(typeItems) || typeItems.length === 0) return [];

  const byType = new Map();
  for (const item of typeItems) {
    if (!item?.id) continue;
    const type = String(item.type ?? item.title ?? '기타').trim() || '기타';
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push({
      id: item.id,
      title: item.title ?? '제목 없음',
      coverFrontUrl: item.coverFrontUrl || null
    });
  }

  const types = Array.from(byType.keys());
  const rows = [];
  const maxTypeRows = 2;

  for (let i = 0; i < types.length && rows.length < maxTypeRows; i += TYPES_PER_ROW) {
    const chunk = types.slice(i, i + TYPES_PER_ROW);
    const rowNotes = chunk.flatMap((t) => byType.get(t));
    if (rowNotes.length > 0) rows.push(rowNotes);
  }

  return rows;
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
        <div id="bookshelf-rows-container" aria-hidden="true"></div>
      </div>
    </div>
  `;

  const viewport = document.getElementById('bookshelf-viewport');
  const container = document.getElementById('bookshelf-rows-container');
  const loading = document.getElementById('bookshelf-loading');

  function itemHtml(note) {
    const coverSrc = note.coverFrontUrl || TRANSPARENT_PIXEL;
    const title = escapeHtml(note.title);
    return `
      <div class="bookshelf-item">
        <img src="${escapeHtml(coverSrc)}" alt="${title}" loading="lazy" referrerpolicy="no-referrer" class="bookshelf-cover" />
      </div>
    `;
  }

  function renderBookshelfRows(timelineNotes, typeRows) {
    const vw = viewport.clientWidth;
    const allRows = [];
    if (timelineNotes.length > 0) allRows.push(timelineNotes);
    typeRows.forEach((r) => allRows.push(r));

    if (allRows.length === 0) {
      container.innerHTML = '<div class="bookshelf-empty">표시할 노트가 없습니다.</div>';
      container.removeAttribute('aria-hidden');
      return;
    }

    const overlaps = allRows.map((row) => Math.round(getOverlapForRow(vw, row.length)));
    const rowEls = allRows
      .map((row, i) => {
        const overlap = overlaps[i] || 0;
        return `<div class="bookshelf-row" style="--bookshelf-overlap: -${overlap}px;">${row.map(itemHtml).join('')}</div>`;
      })
      .join('');

    container.innerHTML = `<div class="bookshelf-rows-wrap">${rowEls}</div>`;
    container.removeAttribute('aria-hidden');
    container.querySelectorAll('.bookshelf-cover').forEach((img) => {
      img.addEventListener('error', () => img.classList.add('bookshelf-cover--error'), { once: true });
    });
  }

  Promise.allSettled([getNotionNotebooks(), getNotionTypeItems()])
    .then(([notebookResult, typeResult]) => {
      const notebooks = notebookResult.status === 'fulfilled' ? notebookResult.value : [];
      const typeItems = typeResult.status === 'fulfilled' ? typeResult.value : [];

      const timelineNotes = (Array.isArray(notebooks) ? notebooks : []).map((n) => ({
        id: n.id,
        title: n.title ?? '제목 없음',
        coverFrontUrl: n.coverFrontUrl || null
      }));

      const typeRows = groupTypeItemsByRow(Array.isArray(typeItems) ? typeItems : []);

      loading.remove();

      if (timelineNotes.length === 0 && typeRows.length === 0) {
        container.innerHTML = '<div class="bookshelf-empty">표시할 노트가 없습니다.</div>';
        container.removeAttribute('aria-hidden');
        return;
      }

      renderBookshelfRows(timelineNotes, typeRows);

      const resizeObserver = new ResizeObserver(() => {
        if (container.querySelector('.bookshelf-empty')) return;
        renderBookshelfRows(timelineNotes, typeRows);
      });
      resizeObserver.observe(viewport);
    })
    .catch((err) => {
      console.warn('Bookshelf: 노트 로드 실패', err);
      loading.remove();
      container.innerHTML = '<div class="bookshelf-empty">노트를 불러올 수 없습니다.</div>';
      container.removeAttribute('aria-hidden');
    });
}
