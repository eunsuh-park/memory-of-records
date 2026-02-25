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

/**
 * Cover Flow 스타일 상수 (참고: https://scroll-driven-animations.style/demos/cover-flow/css/)
 * - 양옆에 늘어선 카드는 옆으로 회전(rotateY ±45°), 중앙은 정면 + 살짝 확대 + 앞으로(translateZ)
 */
const COVER_FLOW_ANGLE_DEG = 45; /* 양끝 카드 rotateY (왼쪽 +45°, 오른쪽 -45°) */
const COVER_FLOW_SCALE_CENTER = 1.25; /* 중앙 카드 scale */
const COVER_FLOW_SCALE_SIDE = 0.88; /* 양옆 카드 scale */
const COVER_FLOW_Z_CENTER = '1.5em'; /* 중앙 카드 translateZ (앞으로) */
const COVER_FLOW_Z_SIDE = '0em';
const COVER_FLOW_Z_INDEX_CENTER = 100; /* 중앙에 가까울수록 위에 보이도록 */
const COVER_FLOW_Z_INDEX_SIDE = 1;

/**
 * [애니메이션 1] Cover Flow 스타일 – 중앙 기준 3D 원근 + 양옆 회전
 * 각 카드의 화면 내 위치(ratio -1~1)에 따라:
 * - rotateY: 양옆 ±45°, 중앙 0° (데모와 동일)
 * - scale: 중앙 1.25, 양옆 0.88
 * - translateZ: 중앙에서 앞으로, 양옆 0
 * - z-index: 중앙에 가까울수록 높게 (겹침 시 중앙 카드가 위로)
 */
function updateCardAngles(gallery) {
  if (!gallery) return;
  const viewportCenterX = window.innerWidth / 2;
  const halfWidth = window.innerWidth / 2;
  const cards = gallery.querySelectorAll(':scope > div:not(.jukebox-loading):not(.jukebox-empty)');

  let closestCard = null;
  let closestAbsOffset = Infinity;

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const offset = cardCenterX - viewportCenterX;
    const ratio = Math.max(-1, Math.min(1, offset / halfWidth)); /* -1(왼쪽 끝) ~ 1(오른쪽 끝), 0=중앙 */
    const absOffset = Math.abs(offset);
    if (absOffset < closestAbsOffset) {
      closestAbsOffset = absOffset;
      closestCard = card;
    }

    const angle = -ratio * COVER_FLOW_ANGLE_DEG;
    const absRatio = Math.abs(ratio);
    const scale = COVER_FLOW_SCALE_SIDE + (1 - absRatio) * (COVER_FLOW_SCALE_CENTER - COVER_FLOW_SCALE_SIDE);
    const translateZ = absRatio > 0.5 ? COVER_FLOW_Z_SIDE : COVER_FLOW_Z_CENTER;
    const zIndex = Math.round(COVER_FLOW_Z_INDEX_SIDE + (1 - absRatio) * (COVER_FLOW_Z_INDEX_CENTER - COVER_FLOW_Z_INDEX_SIDE));

    /* 호버 시 중앙 쪽으로 옆 이동 (중앙 포커스 카드에만 호버 적용) */
    const hoverX = ratio < -0.05 ? '3vw' : ratio > 0.05 ? '-3vw' : '0';

    card.style.setProperty('--jukebox-rotate-y', `${angle}deg`);
    card.style.setProperty('--jukebox-scale', String(scale));
    card.style.setProperty('--jukebox-translate-z', translateZ);
    card.style.setProperty('--jukebox-hover-x', hoverX);
    card.style.zIndex = String(zIndex);
  });

  /* 중앙에 가장 가까운 카드에만 포커스 클래스 (호버 효과는 이 카드에만 적용) */
  cards.forEach((card) => {
    card.classList.toggle('jukebox-card--centered', card === closestCard);
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
 * 갤러리 위에서 마우스를 움직일 때(mousemove)마다:
 * - 화면 왼쪽 60% 밖 → 갤러리 왼쪽으로 스크롤 (scrollLeft 감소)
 * - 화면 오른쪽 40% 밖 → 갤러리 오른쪽으로 스크롤 (scrollLeft 증가)
 * - 중앙 40% → 스크롤 정지
 * scrollLeft는 0 ~ maxScrollLeft 범위로 클램프해 끝에서 넘어가지 않도록 함.
 */
function enableGalleryScroll(gallery) {
  if (!gallery) return;
  let scrolling = null;

  function tick(direction) {
    const maxScroll = gallery.scrollWidth - gallery.clientWidth;
    if (maxScroll <= 0) return;
    if (direction < 0) {
      gallery.scrollLeft = Math.max(0, gallery.scrollLeft - Math.abs(direction));
    } else if (direction > 0) {
      gallery.scrollLeft = Math.min(maxScroll, gallery.scrollLeft + Math.abs(direction));
    }
  }

  function updateScroll(e) {
    const pageX = e.clientX ?? e.screenX ?? 0;
    const screenWidth = window.innerWidth;
    const currentPosPercentage = (screenWidth - pageX) / screenWidth;
    let direction = 0;

    if (currentPosPercentage > THRESHOLD) {
      const speedPercentage = (currentPosPercentage - THRESHOLD) / (1 - THRESHOLD);
      direction = -speedPercentage * MAX_SPEED;
    } else if (currentPosPercentage < 1 - THRESHOLD) {
      const speedPercentage = (1 - THRESHOLD - currentPosPercentage) / (1 - THRESHOLD);
      direction = speedPercentage * MAX_SPEED;
    }

    if (scrolling) {
      clearInterval(scrolling);
      scrolling = null;
    }
    if (direction !== 0) {
      scrolling = setInterval(() => tick(direction), 10);
    }
  }

  gallery.addEventListener('mousemove', updateScroll, { passive: true });
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

  /* Timeline(노트북) + ByType 데이터를 둘 다 불러와 id 기준 중복 제거 후 전부 표시 (한쪽 실패해도 다른 쪽은 표시) */
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

      /* z-index는 updateCardAngles에서 중앙 거리 기준으로 설정됨 (Cover Flow) */

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
