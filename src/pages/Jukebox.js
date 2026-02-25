/**
 * Jukebox 페이지
 * ----------------------------------------
 * 참고: https://codepen.io/palampinen/pen/OXGYdX
 *
 * [애니메이션 구성]
 * 1. 중앙 기준 3D 원근: 화면 정중앙을 기준으로 왼쪽 카드는 뒷면(rotateY +),
 *    오른쪽 카드는 앞면(rotateY -)이 보이도록 각 카드마다 rotateY를 동적으로 적용.
 * 2. 마우스 위치 기반 자동 스크롤: 갤러리 위에서 마우스가 왼쪽에 있으면 왼쪽으로,
 *    오른쪽에 있으면 오른쪽으로 스크롤되며, 중앙일 때는 멈춤.
 * 3. 스포트라이트: 카드 클릭 시 해당 노트 커버가 아래→위로 올라오듯이 상단에 크게 표시됨.
 */

import { getNotionNotebooks } from '../utils/notionNotebooks.js';
import { getNotionTypeItems } from '../utils/notionByType.js';
import './Jukebox.css';

/** 이미지 URL이 없을 때 사용하는 1x1 투명 GIF (깜빡임 방지) */
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

/** 마우스 위치 기반 스크롤: 화면 좌측/우측 이 비율(0~1)을 넘어야 스크롤 시작 (중앙 40%는 정지) */
const THRESHOLD = 0.6;
/** 스크롤 최대 속도 (px/10ms) */
const MAX_SPEED = 25;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 중앙 기준 3D 원근: 카드가 화면 끝에 있을 때 적용되는 최대 rotateY 각도(deg). 왼쪽 +32°, 오른쪽 -32° */
const MAX_ANGLE_DEG = 32;

/**
 * [애니메이션 1] 중앙 기준 3D 원근
 * 각 카드의 화면 내 위치에 따라 rotateY를 계산해 CSS 변수(--jukebox-rotate-y)로 넣음.
 * - 화면 정중앙: 0deg (정면)
 * - 화면 왼쪽: 양수 → 카드 오른쪽이 앞으로, 왼쪽(뒷면)이 살짝 보임
 * - 화면 오른쪽: 음수 → 카드 왼쪽이 앞으로, 앞면이 살짝 보임
 */
function updateCardAngles(gallery) {
  if (!gallery) return;
  const viewportCenterX = window.innerWidth / 2;
  const halfWidth = window.innerWidth / 2;
  const cards = gallery.querySelectorAll(':scope > div:not(.jukebox-loading):not(.jukebox-empty)');

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const offset = cardCenterX - viewportCenterX; /* 중앙 기준 픽셀 오프셋 (음수=왼쪽, 양수=오른쪽) */
    const ratio = Math.max(-1, Math.min(1, offset / halfWidth)); /* -1 ~ 1로 정규화 */
    const angle = -ratio * MAX_ANGLE_DEG; /* 왼쪽일수록 +, 오른쪽일수록 - */
    card.style.setProperty('--jukebox-rotate-y', `${angle}deg`);
  });
}

/**
 * 스크롤/리사이즈 시 카드 각도 갱신을 등록하고, 페이지 이탈 시 resize 리스너 제거.
 */
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

/**
 * [애니메이션 2] 마우스 위치 기반 자동 스크롤
 * 갤러리 위에 마우스가 있을 때:
 * - 마우스가 화면 왼쪽 60% 밖(왼쪽 영역)에 있으면 → 갤러리를 왼쪽으로 스크롤
 * - 마우스가 화면 오른쪽 40% 밖(오른쪽 영역)에 있으면 → 갤러리를 오른쪽으로 스크롤
 * - 중앙 40% 안에 있으면 → 스크롤 정지
 * 거리에 비례해 스크롤 속도가 빨라짐 (MAX_SPEED까지).
 */
function enableGalleryScroll(gallery) {
  if (!gallery) return;
  let scrolling = null;

  gallery.addEventListener('mouseover', (e) => {
    const pageX = e.clientX ?? e.screenX ?? 0;
    const screenWidth = window.innerWidth;
    /* 0 = 화면 오른쪽 끝, 1 = 화면 왼쪽 끝 */
    const currentPosPercentage = (screenWidth - pageX) / screenWidth;
    let speed;

    if (currentPosPercentage > THRESHOLD) {
      /* 왼쪽 영역: 갤러리를 왼쪽으로 스크롤 (scrollLeft 감소) */
      const positionPercentage = currentPosPercentage;
      const speedPercentage = (positionPercentage - THRESHOLD) / (1 - THRESHOLD);
      speed = speedPercentage * MAX_SPEED;
      if (scrolling) clearInterval(scrolling);
      scrolling = setInterval(() => {
        gallery.scrollLeft -= speed;
      }, 10);
    } else if (currentPosPercentage < 1 - THRESHOLD) {
      /* 오른쪽 영역: 갤러리를 오른쪽으로 스크롤 (scrollLeft 증가) */
      const positionPercentage = 1 - currentPosPercentage;
      const speedPercentage = (positionPercentage - THRESHOLD) / (1 - THRESHOLD);
      speed = speedPercentage * MAX_SPEED;
      if (scrolling) clearInterval(scrolling);
      scrolling = setInterval(() => {
        gallery.scrollLeft += speed;
      }, 10);
    } else {
      /* 중앙: 스크롤 정지 */
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

  /* 레이아웃: 상단 스포트라이트(카드가 올라갈 영역) + 하단 갤러리 */
  mainContent.innerHTML = `
    <div class="jukebox-fullscreen" id="jukebox-fullscreen">
      <div class="jukebox-spotlight" id="jukebox-spotlight" role="button" tabindex="0" aria-label="선택 해제"></div>
      <div class="jukebox-gallery-wrap">
        <div class="jukebox-gallery centerized" id="jukebox-gallery">
          <div class="jukebox-loading">노트를 불러오는 중...</div>
        </div>
      </div>
    </div>
  `;

  const gallery = document.getElementById('jukebox-gallery');
  const spotlight = document.getElementById('jukebox-spotlight');

  /* Timeline(노트북) + ByType 데이터를 합쳐서 id 기준 중복 제거 후 사용 */
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

      /* 각 노트를 카드 div로 렌더 (클릭 시 스포트라이트에 표시할 데이터를 data 속성으로 보관) */
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

      /* 겹친 카드에서 왼쪽이 앞에 보이도록 z-index: 첫 번째 카드가 가장 크게 */
      gallery.querySelectorAll(':scope > div').forEach((el, i) => {
        el.style.zIndex = String(allNotes.length - i);
      });

      gallery.querySelectorAll('img').forEach((img) => {
        img.addEventListener('error', () => {
          img.classList.add('jukebox-cover-image--error');
        }, { once: true });
      });

      /** 올라간 카드와 원래 인덱스 (닫을 때 복귀용) */
      let selectedCard = null;
      let selectedIndex = null;

      /**
       * [애니메이션 3] 클릭한 카드가 그대로 위로 올라감 (go up)
       * 카드 DOM을 스포트라이트로 옮기고, 현재 위치 → 상단 중앙 + scale 1.2 로 애니메이션.
       */
      function goUp(card) {
        if (!spotlight || selectedCard) return;
        const rect = card.getBoundingClientRect();
        const index = parseInt(card.getAttribute('data-note-index'), 10);

        spotlight.appendChild(card);
        card.classList.add('jukebox-card--flying');

        card.style.position = 'fixed';
        card.style.left = `${rect.left}px`;
        card.style.top = `${rect.top}px`;
        card.style.width = `${rect.width}px`;
        card.style.height = `${rect.height}px`;
        card.style.marginLeft = '0';
        card.style.transform = 'translate(0, 0) scale(1)';
        card.style.transition = 'left 0.45s cubic-bezier(0.34, 1.2, 0.64, 1), top 0.45s cubic-bezier(0.34, 1.2, 0.64, 1), width 0.45s cubic-bezier(0.34, 1.2, 0.64, 1), height 0.45s cubic-bezier(0.34, 1.2, 0.64, 1), transform 0.45s cubic-bezier(0.34, 1.2, 0.64, 1)';

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            card.style.left = '50%';
            card.style.top = '12px';
            card.style.width = 'auto';
            card.style.height = 'auto';
            card.style.maxWidth = 'min(80vw, 420px)';
            card.style.maxHeight = '35vh';
            card.style.transform = 'translateX(-50%) scale(1.2)';
          });
        });

        selectedCard = card;
        selectedIndex = index;
        spotlight.classList.add('jukebox-spotlight--active');
      }

      /**
       * 닫을 때: 카드가 원래 자리로 빠르게 복귀 (짧은 transition 후 갤러리에 다시 삽입)
       */
      function goBack() {
        if (!spotlight || !selectedCard || selectedIndex == null) return;
        const card = selectedCard;
        const index = selectedIndex;
        selectedCard = null;
        selectedIndex = null;
        spotlight.classList.remove('jukebox-spotlight--active');

        const placeholder = document.createElement('div');
        placeholder.className = 'jukebox-card-placeholder';
        const ref = gallery.children[index] || null;
        gallery.insertBefore(placeholder, ref);

        const targetRect = placeholder.getBoundingClientRect();
        card.style.transition = 'left 0.2s ease-out, top 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out, transform 0.2s ease-out';
        card.style.left = `${targetRect.left}px`;
        card.style.top = `${targetRect.top}px`;
        card.style.width = `${targetRect.width}px`;
        card.style.height = `${targetRect.height}px`;
        card.style.maxWidth = '';
        card.style.maxHeight = '';
        card.style.transform = 'translate(0, 0) scale(1)';

        const onEnd = () => {
          card.removeEventListener('transitionend', onEnd);
          card.classList.remove('jukebox-card--flying');
          card.style.cssText = '';
          placeholder.replaceWith(card);
          gallery.querySelectorAll(':scope > div').forEach((el, i) => {
            el.style.zIndex = String(gallery.children.length - i);
          });
          updateCardAngles(gallery);
        };
        card.addEventListener('transitionend', onEnd);
      }

      gallery.querySelectorAll('.jukebox-card').forEach((card) => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
          e.stopPropagation();
          if (selectedCard) return;
          goUp(card);
        });
      });

      spotlight?.addEventListener('click', () => goBack());
      spotlight?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goBack();
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
