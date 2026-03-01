/**
 * Bookshelf 페이지
 * 노트 240×240 고정, 100vw를 채우도록 겹침(음수 간격). 겹침이 크면 2줄로 나눔.
 */

import { getNotionNotebooks } from '../utils/notionNotebooks.js';
import { getNotionTypeItems } from '../utils/notionByType.js';
import './Bookshelf.css';

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const ITEM_SIZE_PX = 240;
/** 겹침이 이 값(px)보다 크면 2줄로 나눔 */
const OVERLAP_THRESHOLD_PX = 240;

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
 * 1줄 vs 2줄 결정 후, 행별 overlap 적용해 DOM 구성.
 * - 1줄: 한 row에 전부, --bookshelf-overlap 설정
 * - 2줄: rows-wrap 안에 row 두 개, 각 row에 --bookshelf-overlap 설정
 */
function buildRows(allNotes, viewportWidth) {
  const n = allNotes.length;
  if (n === 0) return { rows: [], useTwoRows: false };

  const overlap1 = getOverlapForRow(viewportWidth, n);
  const useTwoRows = n > 1 && overlap1 > OVERLAP_THRESHOLD_PX;

  if (!useTwoRows) {
    return { rows: [allNotes], useTwoRows: false, overlaps: [Math.round(overlap1)] };
  }

  const half = Math.ceil(n / 2);
  const row1 = allNotes.slice(0, half);
  const row2 = allNotes.slice(half);
  const overlapR1 = getOverlapForRow(viewportWidth, row1.length);
  const overlapR2 = getOverlapForRow(viewportWidth, row2.length);
  return {
    rows: [row1, row2],
    useTwoRows: true,
    overlaps: [Math.round(overlapR1), Math.round(overlapR2)]
  };
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

  function renderBookshelfRows(allNotes) {
    const vw = viewport.clientWidth;
    const { rows, useTwoRows, overlaps } = buildRows(allNotes, vw);

    if (rows.length === 0) {
      container.innerHTML = '<div class="bookshelf-empty">표시할 노트가 없습니다.</div>';
      container.removeAttribute('aria-hidden');
      return;
    }

    if (useTwoRows && rows.length === 2) {
      container.innerHTML = `
        <div class="bookshelf-rows-wrap">
          <div class="bookshelf-row" style="--bookshelf-overlap: -${overlaps[0]}px;">${rows[0].map(itemHtml).join('')}</div>
          <div class="bookshelf-row" style="--bookshelf-overlap: -${overlaps[1]}px;">${rows[1].map(itemHtml).join('')}</div>
        </div>
      `;
    } else {
      const overlap = overlaps[0] || 0;
      container.innerHTML = `
        <div class="bookshelf-row" style="--bookshelf-overlap: -${overlap}px;">${rows[0].map(itemHtml).join('')}</div>
      `;
    }

    container.removeAttribute('aria-hidden');
    container.querySelectorAll('.bookshelf-cover').forEach((img) => {
      img.addEventListener('error', () => img.classList.add('bookshelf-cover--error'), { once: true });
    });
  }

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
        container.innerHTML = '<div class="bookshelf-empty">표시할 노트가 없습니다.</div>';
        container.removeAttribute('aria-hidden');
        return;
      }

      renderBookshelfRows(allNotes);

      const resizeObserver = new ResizeObserver(() => {
        if (container.querySelector('.bookshelf-empty') || allNotes.length === 0) return;
        renderBookshelfRows(allNotes);
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
