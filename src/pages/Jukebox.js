/**
 * Jukebox 페이지
 * 참고: https://codepen.io/palampinen/pen/OXGYdX
 * Timeline과 동일한 노트 커버를 가로 갤러리 + 3D 원근(rotateY) + 반사 + 호버 스타일로 표시합니다.
 */

import { getNotionNotebooks } from '../utils/notionNotebooks.js';
import { getNotionTypeItems } from '../utils/notionByType.js';
import './Jukebox.css';

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const THRESHOLD = 0.6;
const MAX_SPEED = 25;
const LEFT = 'left';
const RIGHT = 'right';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const MAX_ANGLE_DEG = 32;

function updateCardAngles(gallery) {
  if (!gallery) return;
  const viewportCenterX = window.innerWidth / 2;
  const halfWidth = window.innerWidth / 2;
  const cards = gallery.querySelectorAll(':scope > div:not(.jukebox-loading):not(.jukebox-empty)');

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const offset = cardCenterX - viewportCenterX;
    const ratio = Math.max(-1, Math.min(1, offset / halfWidth));
    const angle = -ratio * MAX_ANGLE_DEG;
    card.style.setProperty('--jukebox-rotate-y', `${angle}deg`);
  });
}

function enableCenterPerspective(gallery) {
  if (!gallery) return;
  const onUpdate = () => {
    if (!gallery.isConnected) {
      window.removeEventListener('resize', onUpdate);
      return;
    }
    updateCardAngles(gallery);
  };
  gallery.addEventListener('scroll', onUpdate, { passive: true });
  window.addEventListener('resize', onUpdate);
  onUpdate();
}

function enableGalleryScroll(gallery) {
  if (!gallery) return;
  let scrolling = null;

  gallery.addEventListener('mouseover', (e) => {
    const pageX = e.clientX ?? e.screenX ?? 0;
    const screenWidth = window.innerWidth;
    const currentPosPercentage = (screenWidth - pageX) / screenWidth;
    let speed;

    if (currentPosPercentage > THRESHOLD) {
      const positionPercentage = currentPosPercentage;
      const speedPercentage = (positionPercentage - THRESHOLD) / (1 - THRESHOLD);
      speed = speedPercentage * MAX_SPEED;
      if (scrolling) clearInterval(scrolling);
      scrolling = setInterval(() => {
        gallery.scrollLeft -= speed;
      }, 10);
    } else if (currentPosPercentage < 1 - THRESHOLD) {
      const positionPercentage = 1 - currentPosPercentage;
      const speedPercentage = (positionPercentage - THRESHOLD) / (1 - THRESHOLD);
      speed = speedPercentage * MAX_SPEED;
      if (scrolling) clearInterval(scrolling);
      scrolling = setInterval(() => {
        gallery.scrollLeft += speed;
      }, 10);
    } else {
      if (scrolling) {
        clearInterval(scrolling);
        scrolling = null;
      }
    }
  });

  gallery.addEventListener('mouseleave', () => {
    if (scrolling) {
      clearInterval(scrolling);
      scrolling = null;
    }
  });
}

export function renderJukebox() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.className = 'app-main jukebox-active';
  const mainWrapper = mainContent.closest('.main-wrapper');
  if (mainWrapper) {
    mainWrapper.classList.add('jukebox-active');
  }
  document.body.classList.add('jukebox-active');

  mainContent.innerHTML = `
    <div class="jukebox-fullscreen" id="jukebox-fullscreen">
      <div class="jukebox-spotlight" id="jukebox-spotlight" role="button" tabindex="0" aria-label="선택 해제">
        <div class="jukebox-spotlight-inner">
          <img class="jukebox-spotlight-img" src="" alt="" />
        </div>
      </div>
      <div class="jukebox-gallery-wrap">
        <div class="jukebox-gallery centerized" id="jukebox-gallery">
          <div class="jukebox-loading">노트를 불러오는 중...</div>
        </div>
      </div>
    </div>
  `;

  const fullscreen = document.getElementById('jukebox-fullscreen');
  const gallery = document.getElementById('jukebox-gallery');
  const spotlight = document.getElementById('jukebox-spotlight');
  const spotlightImg = spotlight?.querySelector('.jukebox-spotlight-img');

  Promise.all([getNotionNotebooks(), getNotionTypeItems()])
    .then(([notebooks, typeItems]) => {
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
      (notebooks || []).forEach(add);
      (typeItems || []).forEach(add);
      const allNotes = Array.from(byId.values());

      if (allNotes.length === 0) {
        gallery.innerHTML = '<div class="jukebox-empty">표시할 노트가 없습니다.</div>';
        return;
      }

      const itemsHtml = allNotes
        .map((note, index) => {
          const coverSrc = note.coverFrontUrl || TRANSPARENT_PIXEL;
          const title = escapeHtml(note.title);
          return `
            <div class="jukebox-card" data-note-index="${index}" data-cover-src="${escapeHtml(coverSrc)}" data-title="${title}" role="button" tabindex="0">
              <img src="${escapeHtml(coverSrc)}" alt="${title}" loading="lazy" referrerpolicy="no-referrer" />
            </div>
          `;
        })
        .join('');

      gallery.innerHTML = itemsHtml;

      gallery.querySelectorAll(':scope > div').forEach((el, i) => {
        el.style.zIndex = String(allNotes.length - i);
      });

      gallery.querySelectorAll('img').forEach((img) => {
        img.addEventListener('error', () => {
          img.classList.add('jukebox-cover-image--error');
        }, { once: true });
      });

      function showInSpotlight(coverSrc, title) {
        if (!spotlight || !spotlightImg) return;
        spotlightImg.src = coverSrc || TRANSPARENT_PIXEL;
        spotlightImg.alt = title || '';
        spotlight.classList.add('jukebox-spotlight--active', 'jukebox-spotlight--rise');
      }

      function hideSpotlight() {
        if (!spotlight) return;
        spotlight.classList.remove('jukebox-spotlight--active', 'jukebox-spotlight--rise');
        if (spotlightImg) {
          spotlightImg.src = '';
          spotlightImg.alt = '';
        }
      }

      gallery.querySelectorAll('.jukebox-card').forEach((card) => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
          e.stopPropagation();
          const src = card.getAttribute('data-cover-src') || '';
          const title = card.getAttribute('data-title') || '';
          showInSpotlight(src, title);
        });
      });

      spotlight?.addEventListener('click', () => hideSpotlight());
      spotlight?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          hideSpotlight();
        }
      });

      enableCenterPerspective(gallery);
      enableGalleryScroll(gallery);
    })
    .catch((err) => {
      console.warn('Jukebox: 노트 로드 실패', err);
      gallery.innerHTML = '<div class="jukebox-empty">노트를 불러올 수 없습니다.</div>';
    });
}
