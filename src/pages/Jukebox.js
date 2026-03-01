/**
 * Jukebox 페이지
 *
 * 참고
 * - Cover Flow: https://scroll-driven-animations.style/demos/cover-flow/css/
 * - CodePen: https://codepen.io/palampinen/pen/OXGYdX
 *
 * 구성
 * 1. 스크롤 연동 Cover Flow: 가로 스크롤 시 카드별 뷰포트 위치에 따라
 *    rotateY·scale·translateZ·z-index 갱신 (scroll 이벤트 + updateCardAngles).
 * 2. 마우스 위치 기반 자동 스크롤: 갤러리 위 마우스가 왼쪽/오른쪽이면 해당 방향 스크롤, 중앙이면 정지.
 */

import { getNotionNotebooks } from '../utils/notionNotebooks.js';
import { getNotionTypeItems } from '../utils/notionByType.js';
import './Jukebox.css';

const JUKEBOX_LOADING_LOTTIE = 'https://lottie.host/1ff458b1-27f6-4957-92d6-f3d5d9b52d17/qbzEiamboY.lottie';

/** 이전 버튼용 왼쪽 화살표 SVG (오른쪽 버튼은 CSS scaleX(-1)로 좌우 반전) */
const JUKEBOX_NAV_ICON_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' aria-hidden='true'><title>left_line</title><g fill='none' fill-rule='evenodd'><path d='M24 0v24H0V0h24ZM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018Zm.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01-.184-.092Z'/><path fill='currentColor' d='M8.293 12.707a1 1 0 0 1 0-1.414l5.657-5.657a1 1 0 1 1 1.414 1.414L10.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414l-5.657-5.657Z'/></g></svg>`;

/** 이미지 URL이 없을 때 사용하는 1x1 투명 GIF (깜빡임 방지) */
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

/** 화면 왼쪽 이 비율(0~1) 안에 마우스가 있으면 왼쪽 스크롤 (가장자리만 반응하도록 작게) */
const EDGE_ZONE_LEFT = 0.12;
/** 화면 오른쪽 이 비율(0~1) 안에 마우스가 있으면 오른쪽 스크롤 */
const EDGE_ZONE_RIGHT = 0.12;
/** 가장자리 호버 시 스크롤 시작 전 대기(ms). 짧게 지나갈 때는 스크롤 안 함 */
const EDGE_HOVER_DELAY_MS = 280;
/** 가장자리 스크롤 최대 속도 (px/10ms) */
const EDGE_SCROLL_SPEED = 18;

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
export function updateCardAngles(gallery) {
  if (!gallery) return;
  const viewportCenterX = window.innerWidth / 2;
  const halfWidth = window.innerWidth / 2;
  const cards = gallery.querySelectorAll(':scope > div.jukebox-card');

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

    /* 양옆 카드는 이미지 더 어둡게. 중앙 1, 양끝 0.48 (끝으로 갈수록 더 어둡게) */
    const brightness = 1 - (1 - 0.48) * absRatio;

    /* 바닥 그림자: 비추는 정도만 줄임. 중앙↔끝 그라데이션 비율을 더 짧뚱하게(가파르게) */
    // 원래: (0.32 - absRatio * 0.26) * 0.5;
    // "짧뚱하게": 그라데이션이 더 짧은 구간에서 끝나도록 absRatio 가중치를 늘려 더 급격하게 변화하게 조정
    const gradientSlope = 0.42; // absRatio 가중치 증가
    const minShadowOpacity = 0.03;
    const baseShadowOpacity = 0.32;
    const shadowOpacity = (baseShadowOpacity - absRatio * gradientSlope) * 0.5;
    const shadowBlur = 22 - Math.round(absRatio * 10);

    card.style.setProperty('--jukebox-shadow', `0 6px ${shadowBlur}px rgba(0,0,0,${Math.max(minShadowOpacity, shadowOpacity).toFixed(2)})`);

    card.style.setProperty('--jukebox-rotate-y', `${angle}deg`);
    card.style.setProperty('--jukebox-scale', String(scale));
    card.style.setProperty('--jukebox-translate-z', translateZ);
    card.style.setProperty('--jukebox-hover-x', hoverX);
    card.style.setProperty('--jukebox-brightness', String(brightness));
    card.style.zIndex = String(zIndex);
  });

  /* 중앙에 가장 가까운 카드에만 포커스 클래스 (호버 효과는 이 카드에만 적용) */
  cards.forEach((card) => {
    card.classList.toggle('jukebox-card--centered', card === closestCard);
  });
}

/**
 * Cover Flow 스크롤 연동
 * 갤러리 scroll 이벤트·리사이즈 시 updateCardAngles 호출 → 카드별 위치에 따라 3D 변환 갱신.
 * (휠/터치/마우스 자동 스크롤 모두 scrollLeft를 바꾸므로 동일하게 scroll 이벤트로 연동됨.)
 * 반응형: window.innerWidth 기준으로 ratio 계산하므로 뷰포트 변경 시 resize 이벤트로 자동 재계산됨.
 */
export function enableCenterPerspective(gallery) {
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
 * PC 사용성: 가장자리 호버 스크롤 + 이전/다음 버튼
 * - 가장자리만 반응: 화면 왼쪽 12% / 오른쪽 12% 안에 마우스가 있을 때만 스크롤. 중앙 76%는 정지.
 * - EDGE_HOVER_DELAY_MS 동안 가장자리에 머물렀을 때만 스크롤 시작 (지나가기만 하면 동작 안 함).
 * - 이전/다음 버튼: 클릭 시 카드 한 장씩 이동.
 * 반응형: 터치 기기에서는 mousemove가 없어 호버 스크롤은 동작하지 않음. 스와이프·버튼·휠만 사용.
 */
export function enableGalleryScroll(gallery, prevBtn, nextBtn) {
  if (!gallery) return;
  let scrolling = null;
  let edgeDelayTimer = null;

  function tick(direction) {
    const maxScroll = gallery.scrollWidth - gallery.clientWidth;
    if (maxScroll <= 0) return;
    if (direction < 0) {
      gallery.scrollLeft = Math.max(0, gallery.scrollLeft - Math.abs(direction));
    } else if (direction > 0) {
      gallery.scrollLeft = Math.min(maxScroll, gallery.scrollLeft + Math.abs(direction));
    }
  }

  function stopScroll() {
    if (edgeDelayTimer) {
      clearTimeout(edgeDelayTimer);
      edgeDelayTimer = null;
    }
    if (scrolling) {
      clearInterval(scrolling);
      scrolling = null;
    }
  }

  function startScrollIfEdge(pageX) {
    const screenWidth = window.innerWidth;
    const ratio = pageX / screenWidth;
    let direction = 0;
    if (ratio < EDGE_ZONE_LEFT) {
      direction = -EDGE_SCROLL_SPEED * (1 - ratio / EDGE_ZONE_LEFT);
    } else if (ratio > 1 - EDGE_ZONE_RIGHT) {
      direction = EDGE_SCROLL_SPEED * ((ratio - (1 - EDGE_ZONE_RIGHT)) / EDGE_ZONE_RIGHT);
    }
    if (direction === 0) {
      stopScroll();
      return;
    }
    stopScroll();
    edgeDelayTimer = setTimeout(() => {
      edgeDelayTimer = null;
      scrolling = setInterval(() => tick(direction), 10);
    }, EDGE_HOVER_DELAY_MS);
  }

  gallery.addEventListener('mousemove', (e) => {
    const pageX = e.clientX ?? e.screenX ?? 0;
    const ratio = pageX / window.innerWidth;
    if (ratio >= EDGE_ZONE_LEFT && ratio <= 1 - EDGE_ZONE_RIGHT) {
      stopScroll();
      return;
    }
    startScrollIfEdge(pageX);
  }, { passive: true });

  gallery.addEventListener('mouseleave', stopScroll);

  /* 마우스 휠: 세로 휠을 가로 스크롤로 변환 (휠 아래 = 오른쪽, 휠 위 = 왼쪽) */
  const WHEEL_SCROLL_SPEED = 1.2;
  gallery.addEventListener(
    'wheel',
    (e) => {
      const maxScroll = gallery.scrollWidth - gallery.clientWidth;
      if (maxScroll <= 0) return;
      const delta = e.deltaY * WHEEL_SCROLL_SPEED;
      const newScroll = gallery.scrollLeft + delta;
      if (delta > 0 && newScroll < maxScroll) {
        e.preventDefault();
        gallery.scrollLeft = Math.min(maxScroll, newScroll);
      } else if (delta < 0 && newScroll > 0) {
        e.preventDefault();
        gallery.scrollLeft = Math.max(0, newScroll);
      }
    },
    { passive: false }
  );

  /**
   * 이전/다음 버튼: 카드 한 장씩 이동.
   * 현재 뷰포트 중앙에 가장 가까운 카드 기준으로 이전/다음 카드로 부드럽게 스크롤.
   */
  function scrollToCenterCard(card) {
    if (!card) return;
    const targetScroll =
      card.offsetLeft + card.offsetWidth / 2 - gallery.clientWidth / 2;
    gallery.scrollTo({
      left: Math.max(0, Math.min(gallery.scrollWidth - gallery.clientWidth, targetScroll)),
      behavior: 'smooth'
    });
  }

  function getCards() {
    return Array.from(gallery.querySelectorAll(':scope > div.jukebox-card'));
  }

  function getClosestCardIndex() {
    const cards = getCards();
    if (cards.length === 0) return -1;
    const viewportCenterX = gallery.scrollLeft + gallery.clientWidth / 2;
    let closestIdx = 0;
    let closestDist = Infinity;
    cards.forEach((card, i) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(cardCenter - viewportCenterX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    });
    return closestIdx;
  }

  /* 이전 버튼: 중앙에 가장 가까운 카드의 이전 카드로 스크롤 (맨 앞이면 첫 카드로) */
  prevBtn?.addEventListener('click', () => {
    const idx = getClosestCardIndex();
    const cards = getCards();
    if (idx > 0) scrollToCenterCard(cards[idx - 1]);
    else if (cards.length > 0) scrollToCenterCard(cards[0]);
  });
  /* 다음 버튼: 중앙에 가장 가까운 카드의 다음 카드로 스크롤 (맨 뒤면 마지막 카드로) */
  nextBtn?.addEventListener('click', () => {
    const idx = getClosestCardIndex();
    const cards = getCards();
    if (idx >= 0 && idx < cards.length - 1) scrollToCenterCard(cards[idx + 1]);
    else if (cards.length > 0) scrollToCenterCard(cards[cards.length - 1]);
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
      <div class="jukebox-gallery-wrap">
        <button type="button" class="jukebox-nav jukebox-nav--prev" id="jukebox-prev" aria-label="이전"><span class="jukebox-nav-icon">${JUKEBOX_NAV_ICON_SVG}</span></button>
        <button type="button" class="jukebox-nav jukebox-nav--next" id="jukebox-next" aria-label="다음"><span class="jukebox-nav-icon jukebox-nav-icon--next">${JUKEBOX_NAV_ICON_SVG}</span></button>
        <div class="jukebox-gallery centerized" id="jukebox-gallery">
          <div class="jukebox-loading" role="status" aria-live="polite">
          <dotlottie-wc class="jukebox-loading-lottie" src="${JUKEBOX_LOADING_LOTTIE}" style="width: 300px; height: 300px" autoplay loop></dotlottie-wc>
          <p class="jukebox-loading-text">노트를 불러오는 중...</p>
        </div>
        </div>
      </div>
    </div>
  `;

  const gallery = document.getElementById('jukebox-gallery');
  const prevBtn = document.getElementById('jukebox-prev');
  const nextBtn = document.getElementById('jukebox-next');

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
            coverFrontUrl: item.coverFrontUrl || null,
            coverBackUrl: item.coverBackUrl || null
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

      const itemsHtml = allNotes
        .map((note) => {
          const coverSrc = note.coverFrontUrl || TRANSPARENT_PIXEL;
          const backCoverSrc = note.coverBackUrl || TRANSPARENT_PIXEL;
          const title = escapeHtml(note.title);
          return `
            <div class="jukebox-card">
              <div class="jukebox-card-inner">
                <div class="jukebox-card-face jukebox-card-face--front">
                  <img src="${escapeHtml(coverSrc)}" alt="${title}" loading="lazy" referrerpolicy="no-referrer" />
                </div>
                <div class="jukebox-card-face jukebox-card-face--back">
                  <img src="${escapeHtml(backCoverSrc)}" alt="${title} (뒷표지)" loading="lazy" referrerpolicy="no-referrer" class="jukebox-card-back-cover" />
                </div>
              </div>
            </div>
          `;
        })
        .join('');

      gallery.innerHTML =
        '<div class="jukebox-spacer jukebox-spacer--left" aria-hidden="true"></div>' +
        itemsHtml +
        '<div class="jukebox-spacer jukebox-spacer--right" aria-hidden="true"></div>';

      gallery.querySelectorAll('.jukebox-card-face--front img, .jukebox-card-back-cover').forEach((img) => {
        img.addEventListener('error', () => {
          img.classList.add('jukebox-cover-image--error');
        }, { once: true });
      });

      enableCenterPerspective(gallery);
      enableGalleryScroll(gallery, prevBtn, nextBtn);
    })
    .catch((err) => {
      console.warn('Jukebox: 노트 로드 실패', err);
      gallery.innerHTML = '<div class="jukebox-empty">노트를 불러올 수 없습니다.</div>';
    });
}
