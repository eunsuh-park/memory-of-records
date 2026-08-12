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

import { getNotionNotebooks } from '../../services/notionNotebooks.js';
import { getNotionTypeItems } from '../../services/notionByType.js';
import {
  collapseFilterSubMenu,
  renderFilterSubMenu
} from '../../components/FilterSubMenu/FilterSubMenu.js';
import { renderPdfViewer } from '../../components/PdfModal/PdfModal.js';
import { renderNoteImageViewer } from '../../components/NoteImageViewer/NoteImageViewer.js';
import { showToast } from '../../components/Toast/Toast.js';
import { render as renderButton } from '../../components/Button/Button.js';
import { render as renderNoteInfoPanel } from '../../components/NoteInfoPanel/NoteInfoPanel.js';
import { clearNoteUnseen, isNoteUnseen } from '../../utils/unseenNotes.js';
import { openAddNoteModal } from '../../components/AddNoteFab/AddNoteFab.js';
import { openAddPageModal } from '../../components/AddPageModal/AddPageModal.js';
import { clearNotionNotebooksCache } from '../../services/notionNotebooks.js';
import { clearNotionTypeItemsCache } from '../../services/notionByType.js';
import { updateNoteFavorite } from '../../services/createNote.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import './Jukebox.css';

const JUKEBOX_LOADING_LOTTIE = 'https://lottie.host/1ff458b1-27f6-4957-92d6-f3d5d9b52d17/qbzEiamboY.lottie';

/** 이미지 URL이 없을 때 사용하는 1x1 투명 GIF (깜빡임 방지) */
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

/** 화면 왼쪽 이 비율(0~1) 안에 마우스가 있으면 왼쪽 스크롤 (가장자리만 반응하도록 작게) */
const EDGE_ZONE_LEFT = 0.12;
/** 화면 오른쪽 이 비율(0~1) 안에 마우스가 있으면 오른쪽 스크롤 */
const EDGE_ZONE_RIGHT = 0.12;
/** 가장자리 호버 시 스크롤 시작 전 대기(ms). 짧게 지나갈 때는 스크롤 안 함 */
const EDGE_HOVER_DELAY_MS = 280;
/** 가장자리 스크롤 최대 속도 (px/frame, requestAnimationFrame 기준 약 60fps) */
const EDGE_SCROLL_SPEED = 28;

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
 * - 양옆에 늘어선 카드는 옆으로 회전(rotateY ±45°), 중앙은 정면 + 확대 + 앞으로(translateZ)
 */
const COVER_FLOW_ANGLE_DEG = 45; /* 양끝 카드 rotateY (왼쪽 +45°, 오른쪽 -45°) */
const COVER_FLOW_SCALE_CENTER = 1.375; /* 중앙 카드 scale (포커스 강조: 기존 1.25 대비 10% 확대) */
const COVER_FLOW_SCALE_SIDE = 0.88; /* 양옆 카드 scale */
const COVER_FLOW_Z_CENTER_EM = 1.5; /* 중앙 카드 translateZ(em). 양옆으로 갈수록 0까지 연속 감소 */
const COVER_FLOW_Z_INDEX_CENTER = 100; /* 중앙에 가까울수록 위에 보이도록 */
const COVER_FLOW_Z_INDEX_SIDE = 1;
const COVER_FLOW_BRIGHTNESS_SIDE = 0.36; /* 양끝 카드 밝기 (중앙 1, 끝으로 갈수록 어둡게) */
/** 바닥 반사 적용 범위: 중앙 카드 기준 좌우 몇 장까지 반사할지 (그 밖은 반사 없음) */
const REFLECTION_MAX_DISTANCE = 2;

/**
 * 카드 레이아웃 좌표 캐시
 * - offsetLeft/offsetWidth는 transform의 영향을 받지 않는 레이아웃 값이므로,
 *   회전·확대 중에도 포커스 판정이 흔들리지 않는다.
 * - 스크롤마다 getBoundingClientRect를 읽으면 강제 리플로우가 발생하므로,
 *   fill/resize/이미지 로드 시에만 캐시를 갱신하고 스크롤 중에는 캐시만 읽는다.
 */
const galleryMetricsCache = new WeakMap();

function refreshCardMetrics(gallery) {
  const cards = Array.from(gallery.querySelectorAll(':scope > div.jukebox-card'));
  const metrics = cards.map((el) => ({
    el,
    center: el.offsetLeft + el.offsetWidth / 2,
    lastRatio: null,
    lastReflectLevel: null,
    lastCentered: null
  }));
  galleryMetricsCache.set(gallery, metrics);
  return metrics;
}

function getCardMetrics(gallery) {
  return galleryMetricsCache.get(gallery) || refreshCardMetrics(gallery);
}

/**
 * [애니메이션 1] Cover Flow 스타일 – 중앙 기준 3D 원근 + 양옆 회전
 * 각 카드의 화면 내 위치(ratio -1~1)에 따라:
 * - rotateY: 양옆 ±45°, 중앙 0° (데모와 동일)
 * - scale: 중앙 1.375, 양옆 0.88
 * - translateZ: 중앙에서 앞으로, 양옆으로 갈수록 연속적으로 0
 * - z-index: 중앙에 가까울수록 높게 (겹침 시 중앙 카드가 위로)
 * - 바닥 반사: 중앙 카드와 좌우 2장까지만, 멀수록 옅게
 */
function updateCardAngles(gallery) {
  if (!gallery) return;
  const metrics = getCardMetrics(gallery);
  if (metrics.length === 0) return;
  const halfWidth = gallery.clientWidth / 2;
  if (halfWidth <= 0) return;
  const viewportCenterX = gallery.scrollLeft + halfWidth;

  let closestIdx = 0;
  let closestDist = Infinity;
  metrics.forEach((m, i) => {
    const dist = Math.abs(m.center - viewportCenterX);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  });

  metrics.forEach((m, i) => {
    const card = m.el;
    const ratio = Math.max(-1, Math.min(1, (m.center - viewportCenterX) / halfWidth));

    /* 화면 밖에서 ratio ±1로 고정된 카드는 스타일 재계산 생략 (스크롤 성능) */
    if (ratio !== m.lastRatio) {
      m.lastRatio = ratio;

      const angle = -ratio * COVER_FLOW_ANGLE_DEG;
      const absRatio = Math.abs(ratio);
      const scale = COVER_FLOW_SCALE_SIDE + (1 - absRatio) * (COVER_FLOW_SCALE_CENTER - COVER_FLOW_SCALE_SIDE);
      const translateZ = (1 - absRatio) * COVER_FLOW_Z_CENTER_EM;
      const zIndex = Math.round(COVER_FLOW_Z_INDEX_SIDE + (1 - absRatio) * (COVER_FLOW_Z_INDEX_CENTER - COVER_FLOW_Z_INDEX_SIDE));

      /* 양옆 카드 디밍. 다크=brightness, 라이트=opacity(배경으로 허옇게 페이드) */
      const dim = 1 - (1 - COVER_FLOW_BRIGHTNESS_SIDE) * absRatio;

      /* 이미지 실루엣 그림자(drop-shadow): 중앙에서 진하고 양옆으로 갈수록 옅게 */
      const gradientSlope = 0.42;
      const minShadowOpacity = 0.03;
      const baseShadowOpacity = 0.32;
      const shadowOpacity = (baseShadowOpacity - absRatio * gradientSlope) * 0.5;
      const shadowBlur = 22 - Math.round(absRatio * 10);

      card.style.setProperty('--jukebox-shadow-blur', `${shadowBlur}px`);
      card.style.setProperty(
        '--jukebox-shadow-opacity',
        Math.max(minShadowOpacity, shadowOpacity).toFixed(2)
      );
      card.style.setProperty('--jukebox-rotate-y', `${angle}deg`);
      card.style.setProperty('--jukebox-scale', String(scale));
      card.style.setProperty('--jukebox-translate-z', `${translateZ.toFixed(3)}em`);
      card.style.setProperty('--jukebox-brightness', String(dim));
      card.style.setProperty('--jukebox-opacity', String(dim));
      card.style.zIndex = String(zIndex);
    }

    /* 바닥 반사: 데스크톱만. 모바일에서는 클래스/반사 미적용 */
    if (!isMobileJukebox()) {
      const distFromCenter = Math.abs(i - closestIdx);
      const reflectLevel = distFromCenter <= REFLECTION_MAX_DISTANCE ? distFromCenter : -1;
      if (reflectLevel !== m.lastReflectLevel) {
        m.lastReflectLevel = reflectLevel;
        card.classList.toggle('jukebox-card--reflect-0', reflectLevel === 0);
        card.classList.toggle('jukebox-card--reflect-1', reflectLevel === 1);
        card.classList.toggle('jukebox-card--reflect-2', reflectLevel === 2);
      }
    } else if (m.lastReflectLevel !== -1) {
      m.lastReflectLevel = -1;
      card.classList.remove(
        'jukebox-card--reflect-0',
        'jukebox-card--reflect-1',
        'jukebox-card--reflect-2'
      );
    }

    /* 중앙에 가장 가까운 카드에만 포커스 클래스 (호버 플립은 이 카드에만 적용) */
    const centered = i === closestIdx;
    if (centered !== m.lastCentered) {
      m.lastCentered = centered;
      card.classList.toggle('jukebox-card--centered', centered);
      if (centered) {
        const noteId = card.getAttribute('data-note-id');
        gallery.dispatchEvent(
          new CustomEvent('jukebox:centered', { detail: { noteId, index: i } })
        );
        updateJukeboxNavButtons(gallery);
      }
    }
  });
}

function getClosestCardIndex(gallery) {
  const metrics = getCardMetrics(gallery);
  if (metrics.length === 0) return -1;
  const viewCenter = gallery.scrollLeft + gallery.clientWidth / 2;
  let closestIdx = 0;
  let closestDist = Infinity;
  metrics.forEach((m, i) => {
    const dist = Math.abs(m.center - viewCenter);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
  });
  return closestIdx;
}

/** 첫/끝 카드이거나 노트가 없으면 이전·다음 버튼 숨김 */
function updateJukeboxNavButtons(gallery) {
  const prevBtn = gallery?._jukeboxNavPrev;
  const nextBtn = gallery?._jukeboxNavNext;
  if (!prevBtn && !nextBtn) return;

  const count = getCardMetrics(gallery).length;
  if (count === 0) {
    prevBtn?.setAttribute('hidden', '');
    nextBtn?.setAttribute('hidden', '');
    return;
  }

  const idx = getClosestCardIndex(gallery);
  if (idx <= 0) prevBtn?.setAttribute('hidden', '');
  else prevBtn?.removeAttribute('hidden');

  if (idx >= count - 1) nextBtn?.setAttribute('hidden', '');
  else nextBtn?.removeAttribute('hidden');
}

/**
 * Cover Flow 스크롤 연동
 * scroll 이벤트를 requestAnimationFrame으로 스로틀해 프레임당 1회만 updateCardAngles 실행.
 * 리사이즈 시에는 레이아웃 캐시를 갱신한 뒤 다시 그린다.
 */
function enableCenterPerspective(gallery) {
  if (!gallery || gallery._jukeboxPerspectiveEnabled) {
    if (gallery) updateCardAngles(gallery);
    return;
  }
  gallery._jukeboxPerspectiveEnabled = true;
  let rafId = null;

  const onScroll = () => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (!gallery.isConnected) {
        window.removeEventListener('resize', onResize);
        return;
      }
      updateCardAngles(gallery);
      /* 모바일: 사용자가 캐러셀을 좌우로 스크롤하면 필터 네비 자동 접기 */
      if (gallery._jukeboxScrollState?.userScrolled) {
        collapseFilterSubMenu();
      }
    });
  };

  const onResize = () => {
    if (!gallery.isConnected) {
      window.removeEventListener('resize', onResize);
      return;
    }
    refreshCardMetrics(gallery);
    onScroll();
  };

  gallery.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  updateCardAngles(gallery);
}

/**
 * PC 사용성: 가장자리 호버 스크롤 + 이전/다음 버튼
 * - 가장자리만 반응: 화면 왼쪽 12% / 오른쪽 12% 안에 마우스가 있을 때만 스크롤. 중앙 76%는 정지.
 * - EDGE_HOVER_DELAY_MS 동안 가장자리에 머물렀을 때만 스크롤 시작 (지나가기만 하면 동작 안 함).
 * - 이전/다음 버튼: 클릭 시 카드 한 장씩 이동.
 * 반응형: 터치 기기에서는 mousemove가 없어 호버 스크롤은 동작하지 않음. 스와이프·버튼·휠만 사용.
 */
function enableGalleryScroll(gallery, prevBtn, nextBtn, state = { userScrolled: false }) {
  if (!gallery || gallery._jukeboxScrollEnabled) return;
  gallery._jukeboxScrollEnabled = true;
  let edgeRafId = null;
  let edgeDelayTimer = null;
  let edgeDirection = 0;
  let wheelSettleTimer = null;
  /* 수동 스크롤(휠/가장자리 호버) 진행 중 여부. true인 동안은 snap 복원을 미룬다 */
  let interacting = false;

  function maxScrollLeft() {
    return gallery.scrollWidth - gallery.clientWidth;
  }

  function restoreSnap() {
    gallery.style.removeProperty('scroll-snap-type');
  }

  /* 중앙에 가장 가까운 카드가 정확히 중앙에 오는 scrollLeft */
  function nearestCardScrollLeft() {
    const metrics = getCardMetrics(gallery);
    if (metrics.length === 0) return null;
    const half = gallery.clientWidth / 2;
    const viewCenter = gallery.scrollLeft + half;
    let best = null;
    let bestDist = Infinity;
    metrics.forEach((m) => {
      const dist = Math.abs(m.center - viewCenter);
      if (dist < bestDist) {
        bestDist = dist;
        best = m;
      }
    });
    if (!best) return null;
    return Math.max(0, Math.min(maxScrollLeft(), best.center - half));
  }

  /*
   * CSS scroll-snap(mandatory)과 JS의 scrollLeft 직접 조작이 동시에 일어나면
   * 서로 위치를 뺏으려 해서 스크롤이 걸리거나 튀는 원인이 된다.
   * 수동 스크롤 동안 snap을 잠시 끄고, 부드러운 스크롤로 목표(=snap 지점)에
   * 도달한 뒤 snap을 복원한다. (복원 시점 위치가 snap 지점과 일치하므로 튀지 않음)
   */
  function smoothScrollTo(target) {
    gallery.style.scrollSnapType = 'none';
    let finished = false;
    const finish = () => {
      if (finished) return;
      /* 직전 스크롤의 scrollend가 뒤늦게 도착하는 레이스 방어: 목표 도달 전이면 무시 */
      if (Math.abs(gallery.scrollLeft - target) > 2) return;
      finished = true;
      gallery.removeEventListener('scrollend', finish);
      if (!interacting) restoreSnap();
    };
    const fallback = () => {
      if (finished) return;
      finished = true;
      gallery.removeEventListener('scrollend', finish);
      if (interacting) return;
      /* 어떤 이유로든 목표에 못 갔으면 즉시 정렬 후 snap 복원 (복원 시 튐 방지) */
      if (Math.abs(gallery.scrollLeft - target) > 2) gallery.scrollLeft = target;
      restoreSnap();
    };
    gallery.addEventListener('scrollend', finish);
    setTimeout(fallback, 1000); /* scrollend 미지원/미발화 폴백 */
    gallery.scrollTo({ left: target, behavior: 'smooth' });
  }

  /* 수동 스크롤 종료 후: 가장 가까운 카드로 정렬하고 snap 복원 */
  function settleToNearestCard() {
    interacting = false;
    const target = nearestCardScrollLeft();
    if (target === null || Math.abs(target - gallery.scrollLeft) < 1) {
      restoreSnap();
      return;
    }
    smoothScrollTo(target);
  }

  function tick(direction) {
    const maxScroll = maxScrollLeft();
    if (maxScroll <= 0) return;
    gallery.scrollLeft = Math.max(0, Math.min(maxScroll, gallery.scrollLeft + direction));
  }

  function stopEdgeScroll() {
    if (edgeDelayTimer) {
      clearTimeout(edgeDelayTimer);
      edgeDelayTimer = null;
    }
    if (edgeRafId !== null) {
      cancelAnimationFrame(edgeRafId);
      edgeRafId = null;
      settleToNearestCard();
    }
  }

  /* 가장자리 자동 스크롤: setInterval(10ms) 대신 프레임에 맞춘 rAF 루프 사용 */
  function startEdgeLoop() {
    if (edgeRafId !== null) return;
    state.userScrolled = true;
    interacting = true;
    gallery.style.scrollSnapType = 'none';
    const step = () => {
      if (!gallery.isConnected) {
        edgeRafId = null;
        return;
      }
      tick(edgeDirection);
      edgeRafId = requestAnimationFrame(step);
    };
    edgeRafId = requestAnimationFrame(step);
  }

  gallery.addEventListener('mousemove', (e) => {
    const pageX = e.clientX ?? e.screenX ?? 0;
    const ratio = pageX / window.innerWidth;
    let direction = 0;
    if (ratio < EDGE_ZONE_LEFT) {
      direction = -EDGE_SCROLL_SPEED * (1 - ratio / EDGE_ZONE_LEFT);
    } else if (ratio > 1 - EDGE_ZONE_RIGHT) {
      direction = EDGE_SCROLL_SPEED * ((ratio - (1 - EDGE_ZONE_RIGHT)) / EDGE_ZONE_RIGHT);
    }
    if (direction === 0) {
      stopEdgeScroll();
      return;
    }
    /* 이미 스크롤/대기 중이면 재시작하지 않고 속도만 갱신 (mousemove마다 재시작하면 끊김) */
    edgeDirection = direction;
    if (edgeRafId !== null || edgeDelayTimer) return;
    edgeDelayTimer = setTimeout(() => {
      edgeDelayTimer = null;
      startEdgeLoop();
    }, EDGE_HOVER_DELAY_MS);
  }, { passive: true });

  gallery.addEventListener('mouseleave', stopEdgeScroll);

  /* 마우스 휠: 세로 휠을 가로 스크롤로 변환 (휠 아래 = 오른쪽, 휠 위 = 왼쪽)
     휠이 도는 동안 snap을 끄고, 멈추면 가장 가까운 카드로 부드럽게 정렬 */
  const WHEEL_SCROLL_SPEED = 1.2;
  const WHEEL_SETTLE_DELAY_MS = 140;
  gallery.addEventListener(
    'wheel',
    (e) => {
      const maxScroll = maxScrollLeft();
      if (maxScroll <= 0) return;
      const delta = e.deltaY * WHEEL_SCROLL_SPEED;
      const canScroll = (delta > 0 && gallery.scrollLeft < maxScroll) || (delta < 0 && gallery.scrollLeft > 0);
      if (!canScroll) return;
      e.preventDefault();
      state.userScrolled = true;
      interacting = true;
      gallery.style.scrollSnapType = 'none';
      gallery.scrollLeft = Math.max(0, Math.min(maxScroll, gallery.scrollLeft + delta));
      clearTimeout(wheelSettleTimer);
      wheelSettleTimer = setTimeout(settleToNearestCard, WHEEL_SETTLE_DELAY_MS);
    },
    { passive: false }
  );

  /* 카드 한 장을 정확히 중앙으로 (이전/다음 버튼·카드 클릭 공용) */
  function scrollCardToCenter(card) {
    if (!card) return;
    state.userScrolled = true;
    clearTimeout(wheelSettleTimer);
    interacting = false;
    const metrics = getCardMetrics(gallery);
    const m = metrics.find((item) => item.el === card);
    const center = m ? m.center : card.offsetLeft + card.offsetWidth / 2;
    smoothScrollTo(Math.max(0, Math.min(maxScrollLeft(), center - gallery.clientWidth / 2)));
  }
  /* 카드 클릭 핸들러(renderJukeboxWithFilter)에서 재사용할 수 있도록 노출 */
  gallery.jukeboxScrollCardToCenter = scrollCardToCenter;

  /* 이전 버튼: 중앙에 가장 가까운 카드의 이전 카드로 스크롤 */
  prevBtn?.addEventListener('click', () => {
    const metrics = getCardMetrics(gallery);
    const idx = getClosestCardIndex(gallery);
    if (idx > 0) scrollCardToCenter(metrics[idx - 1].el);
  });
  /* 다음 버튼: 중앙에 가장 가까운 카드의 다음 카드로 스크롤 */
  nextBtn?.addEventListener('click', () => {
    const metrics = getCardMetrics(gallery);
    const idx = getClosestCardIndex(gallery);
    if (idx >= 0 && idx < metrics.length - 1) scrollCardToCenter(metrics[idx + 1].el);
  });

  updateJukeboxNavButtons(gallery);
}

/**
 * 갤러리 DOM에 노트 카드를 채우고 Cover Flow·스크롤을 활성화.
 * Timeline/By Type의 renderJukeboxWithFilter에서 호출.
 * @param {HTMLElement} gallery - .jukebox-gallery 요소
 * @param {HTMLElement|null} prevBtn - 이전 버튼
 * @param {HTMLElement|null} nextBtn - 다음 버튼
 * @param {Array<{id, title, coverFrontUrl?, coverBackUrl?}>} allNotes - 노트 목록
 */
export function fillJukeboxGallery(gallery, prevBtn, nextBtn, allNotes) {
  if (!gallery) return;
  gallery._jukeboxNavPrev = prevBtn;
  gallery._jukeboxNavNext = nextBtn;

  if (!Array.isArray(allNotes) || allNotes.length === 0) {
    gallery.innerHTML = '<div class="jukebox-empty">표시할 노트가 없습니다.</div>';
    updateJukeboxNavButtons(gallery);
    return;
  }
  const itemsHtml = allNotes
    .map((note) => {
      const coverSrc = note.coverFrontUrl || TRANSPARENT_PIXEL;
      const backCoverSrc = note.coverBackUrl || TRANSPARENT_PIXEL;
      const title = escapeHtml(note.title);
      const noteId = escapeHtml(note.id || '');
      const showBadge = Boolean(note.id && isNoteUnseen(note.id));
      /*
       * .jukebox-card: 스크롤 스냅 대상. transform을 주지 않아 스냅 좌표가 항상 정확함.
       * .jukebox-card-3d: Cover Flow 3D 변환 + 바닥 반사 (스냅 박스와 분리)
       * .jukebox-card-inner: 호버 플립 + 그림자
       */
      return `
        <div class="jukebox-card" data-note-id="${noteId}">
          ${
            showBadge
              ? `<button type="button" class="jukebox-new-badge" aria-label="새 노트 표시 지우기" title="새 노트"></button>`
              : ''
          }
          <div class="jukebox-card-3d">
            <div class="jukebox-card-inner">
              <div class="jukebox-card-face jukebox-card-face--front">
                <img src="${escapeHtml(coverSrc)}" alt="${title}" loading="lazy" referrerpolicy="no-referrer" />
              </div>
              <div class="jukebox-card-face jukebox-card-face--back">
                <img src="${escapeHtml(backCoverSrc)}" alt="${title} (뒷표지)" loading="lazy" referrerpolicy="no-referrer" class="jukebox-card-back-cover" />
              </div>
            </div>
            ${renderCardActionOverlay(noteId)}
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
    img.addEventListener('error', () => img.classList.add('jukebox-cover-image--error'), { once: true });
  });

  /*
   * 신규 배지 제거:
   * Cover Flow 3D 때문에 배지 버튼이 클릭을 못 받는 경우가 있어,
   * 카드(또는 배지) 클릭 시 캡처 단계에서 무조건 제거한다.
   */
  if (!gallery._jukeboxBadgeBound) {
    gallery._jukeboxBadgeBound = true;
    gallery.addEventListener(
      'click',
      (e) => {
        const card = e.target?.closest?.('.jukebox-card');
        if (!card || !gallery.contains(card)) return;
        const id = card.getAttribute('data-note-id');
        const badge = card.querySelector('.jukebox-new-badge');
        const hitBadge = Boolean(e.target?.closest?.('.jukebox-new-badge'));
        if (!id || (!badge && !isNoteUnseen(id))) return;

        if (id && isNoteUnseen(id)) clearNoteUnseen(id);
        badge?.remove();

        if (hitBadge) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
  }

  /* 사용자가 스크롤을 시작하기 전까지만 첫 카드 자동 재정렬을 허용하는 플래그 */
  const state = gallery._jukeboxScrollState || { userScrolled: false };
  gallery._jukeboxScrollState = state;
  if (!gallery._jukeboxUserScrollBound) {
    gallery._jukeboxUserScrollBound = true;
    const markUserScrolled = () => {
      state.userScrolled = true;
    };
    gallery.addEventListener('touchstart', markUserScrolled, { passive: true });
    gallery.addEventListener('pointerdown', markUserScrolled, { passive: true });
  }
  state.userScrolled = false;

  enableCenterPerspective(gallery);
  enableGalleryScroll(gallery, prevBtn, nextBtn, state);

  /* 첫 카드를 정확히 중앙에 (양쪽 스페이서 50vw 덕분에 첫/끝 카드 모두 중앙 도달 가능) */
  const centerFirstCard = () => {
    const metrics = refreshCardMetrics(gallery);
    if (metrics.length === 0) return;
    gallery.scrollLeft = Math.max(0, metrics[0].center - gallery.clientWidth / 2);
    updateCardAngles(gallery);
  };

  /* 이미지가 로드되면 카드 폭이 확정되므로 좌표 캐시를 갱신 */
  gallery.querySelectorAll('.jukebox-card-face--front img').forEach((img) => {
    img.addEventListener(
      'load',
      () => {
        if (!gallery.isConnected) return;
        refreshCardMetrics(gallery);
        if (!state.userScrolled) centerFirstCard();
        else updateCardAngles(gallery);
      },
      { once: true }
    );
  });

  /*
   * 초기 배치: scroll-snap을 잠시 끄고 첫 카드를 정확히 중앙에 둔 뒤 snap 복원.
   * (복원 시점의 scrollLeft가 정확한 snap 지점이므로 튀지 않음)
   */
  gallery.style.scrollSnapType = 'none';
  centerFirstCard();
  requestAnimationFrame(() => {
    if (!gallery.isConnected) return;
    if (!state.userScrolled) centerFirstCard();
    gallery.style.removeProperty('scroll-snap-type');
    updateJukeboxNavButtons(gallery);
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
        ${renderButton({ shape: 'circle', size: 'm', role: 'navPrev', ariaLabel: '이전', content: MINGCUTE.leftLine, className: 'jukebox-nav-prev' })}
        ${renderButton({ shape: 'circle', size: 'm', role: 'navNext', ariaLabel: '다음', content: MINGCUTE.leftLine, className: 'jukebox-nav-next' })}
        <div class="jukebox-gallery centerized">
          <div class="jukebox-loading" role="status" aria-live="polite">
<dotlottie-wc class="loading-lottie" src="${JUKEBOX_LOADING_LOTTIE}" style="width: 300px; height: 300px" autoplay loop></dotlottie-wc>
            <p class="loading-text">노트를 불러오는 중...</p>
        </div>
        </div>
      </div>
    </div>
  `;

  const galleryWrap = mainContent.querySelector('.jukebox-gallery-wrap');
  const gallery = mainContent.querySelector('.jukebox-gallery');
  const prevBtn = galleryWrap?.querySelector('.jukebox-nav-prev');
  const nextBtn = galleryWrap?.querySelector('.jukebox-nav-next');
  gallery._jukeboxNavPrev = prevBtn;
  gallery._jukeboxNavNext = nextBtn;
  updateJukeboxNavButtons(gallery);

  /* Timeline(노트북) + ByType 데이터를 둘 다 불러와 id 기준 중복 제거 후 전부 표시 */
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
      fillJukeboxGallery(gallery, prevBtn, nextBtn, allNotes);
    })
    .catch((err) => {
      console.warn('Jukebox: 노트 로드 실패', err);
      gallery.innerHTML = '<div class="jukebox-empty">노트를 불러올 수 없습니다.</div>';
      gallery._jukeboxNavPrev = prevBtn;
      gallery._jukeboxNavNext = nextBtn;
      updateJukeboxNavButtons(gallery);
    });
}

function openNoteModal(note) {
  const noteId = note?.id || '';
  const pdfFolderUrl = note?.pdfFolderUrl ? String(note.pdfFolderUrl).trim() : '';
  const pdfUrl = note?.pdfUrl ? String(note.pdfUrl).trim() : '';
  if (!pdfFolderUrl && !pdfUrl) {
    showToast('노트 상세 이미지가 없습니다.');
    return;
  }

  const existing = document.querySelector('.pdf-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'pdf-modal-overlay';
  overlay.innerHTML = `
    ${renderButton({ shape: 'circle', size: 's', role: 'close', tone: 'ghost', ariaLabel: '닫기', content: MINGCUTE.closeLine, className: 'pdf-modal-close' })}
    <div class="pdf-modal" role="dialog" aria-modal="true">
      <div class="pdf-modal-content"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.classList.add('pdf-modal-open');

  const content = overlay.querySelector('.pdf-modal-content');
  /* pdf_folder_url이 있으면 새 이미지 뷰어, 없으면 기존 PDF 뷰어로 폴백 */
  const cleanupViewer = pdfFolderUrl
    ? renderNoteImageViewer(content, noteId, {
        mode: 'modal',
        pdfFolderUrl,
        pageCount: note?.pageCount,
        size: note?.size,
        title: note?.title || note?.name || ''
      })
    : renderPdfViewer(content, noteId, { mode: 'modal', pdfUrl, size: note?.size });

  const closeModal = () => {
    cleanupViewer?.();
    overlay.remove();
    document.body.classList.remove('pdf-modal-open');
    document.removeEventListener('keydown', handleEscape);
  };

  const handleEscape = (e) => {
    if (e.key === 'Escape') closeModal();
  };

  /* 딤(오버레이)·캔버스 여백 클릭 시 닫기. 이미지/캔버스/버튼은 제외 */
  overlay.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('.pdf-modal-close')) return;
    if (t.closest('canvas, .niv-page-image, .btn, .pdf-page-indicator, .pdf-zoom-controls')) {
      return;
    }
    if (
      t === overlay ||
      t.classList.contains('pdf-modal') ||
      t.classList.contains('pdf-modal-content') ||
      t.classList.contains('pdf-viewer') ||
      t.classList.contains('pdf-canvas-wrap') ||
      t.classList.contains('niv-image-container') ||
      t.classList.contains('pdf-canvas-container')
    ) {
      closeModal();
    }
  });
  overlay.querySelector('.pdf-modal-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });
  document.addEventListener('keydown', handleEscape);
}

function sortNotes(notes, sortKey) {
  const list = [...(notes || [])];
  if (sortKey === 'title') {
    list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ko'));
  } else if (sortKey === 'pages') {
    list.sort((a, b) => (Number(b.pageCount) || 0) - (Number(a.pageCount) || 0));
  } else if (sortKey === 'size') {
    list.sort((a, b) =>
      String(a.size || '').localeCompare(String(b.size || ''), 'ko', { numeric: true })
    );
  }
  return list;
}

function isMobileJukebox() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
}

/** 카드 위 보기/채우기 오버레이 HTML */
function renderCardActionOverlay(noteId) {
  const id = escapeHtml(noteId || '');
  return `
    <div class="jukebox-card-actions" data-note-id="${id}" inert>
      <button type="button" class="jukebox-card-action jukebox-card-action--view" data-note-id="${id}" aria-label="보기">
        <span class="jukebox-card-action__icon">${MINGCUTE.eye2Fill}</span>
        <span class="jukebox-card-action__label">보기</span>
      </button>
      <button type="button" class="jukebox-card-action jukebox-card-action--fill" data-note-id="${id}" aria-label="채우기">
        <span class="jukebox-card-action__icon">${MINGCUTE.addFill}</span>
        <span class="jukebox-card-action__label">채우기</span>
      </button>
    </div>
  `;
}

/**
 * Jukebox 페이지 + 필터 (Timeline: 기간별, By Type: 타입별)
 *
 * Timeline: filterOptions = periodOptions (period_name 1:1)
 * By Type:  filterOptions = typeOptions  (notebook_type 5개 태그 1:1)
 *
 * @param {Object} options
 * @param {'period'|'type'|'favorites'} options.filterMode
 * @param {string} options.basePath - '/timeline' | '/by-type' | '/favorites'
 * @param {string} options.selectedValue - 현재 선택된 필터 값
 * @param {Array<{value: string, label: string}>} options.filterOptions
 * @param {() => Promise<Array>} options.loadNotes
 * @param {(notes: Array) => Record<string, number>} options.getNotesCount
 * @param {(note: Object) => string|null} options.resolveFilterKey
 */
export function renderJukeboxWithFilter(options) {
  const {
    filterMode,
    basePath,
    selectedValue,
    filterOptions,
    loadNotes,
    getNotesCount,
    resolveFilterKey,
    viewModeToggle = null
  } = options;

  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const subMenuContainer = document.getElementById('sub-menu');
  if (!subMenuContainer) return;

  let sortKey = 'default';
  /** @type {Array|null} */
  let allNotesCache = null;

  mainContent.className = 'app-main jukebox-active' + (filterMode === 'type' ? ' by-type-jukebox' : '');
  const mainWrapper = mainContent.closest('.main-wrapper');
  if (mainWrapper) mainWrapper.classList.add('jukebox-active');
  document.body.classList.add('jukebox-active');

  mainContent.innerHTML = `
    <div class="jukebox-fullscreen" id="jukebox-fullscreen">
      <div class="jukebox-gallery-wrap">
        ${renderButton({ shape: 'circle', size: 'm', role: 'navPrev', ariaLabel: '이전', content: MINGCUTE.leftLine, className: 'jukebox-nav-prev' })}
        ${renderButton({ shape: 'circle', size: 'm', role: 'navNext', ariaLabel: '다음', content: MINGCUTE.leftLine, className: 'jukebox-nav-next' })}
        <div class="jukebox-gallery centerized">
          <div class="jukebox-loading" role="status" aria-live="polite">
            <dotlottie-wc class="loading-lottie" src="${JUKEBOX_LOADING_LOTTIE}" style="width:300px;height:300px" autoplay loop></dotlottie-wc>
            <p class="loading-text">노트를 불러오는 중...</p>
          </div>
        </div>
      </div>
      <div class="jukebox-focus-slot">${renderNoteInfoPanel(null, filterMode)}</div>
    </div>
  `;

  const galleryWrap = mainContent.querySelector('.jukebox-gallery-wrap');
  const gallery = mainContent.querySelector('.jukebox-gallery');
  const focusSlot = mainContent.querySelector('.jukebox-focus-slot');
  const prevBtn = galleryWrap?.querySelector('.jukebox-nav-prev');
  const nextBtn = galleryWrap?.querySelector('.jukebox-nav-next');
  gallery._jukeboxNavPrev = prevBtn;
  gallery._jukeboxNavNext = nextBtn;
  updateJukeboxNavButtons(gallery);

  /** 모바일: 중앙 카드 탭 시 보기/채우기·수정 노출 */
  let cardActionsOpen = false;
  /** @type {Array} */
  let boundNotes = [];

  function getFilteredSortedNotes() {
    if (!allNotesCache) return [];
    const byPeriodOrType = (allNotesCache || []).filter(
      (note) => resolveFilterKey(note) === selectedValue
    );
    return sortNotes(byPeriodOrType, sortKey);
  }

  function findNoteById(noteId) {
    return (boundNotes.length ? boundNotes : getFilteredSortedNotes()).find(
      (n) => n.id === noteId
    ) || null;
  }

  function setCardActionsOpen(open) {
    cardActionsOpen = !!open;
    document.body.classList.toggle('jukebox-card-actions-open', cardActionsOpen);
    gallery.querySelectorAll('.jukebox-card-actions').forEach((el) => {
      const card = el.closest('.jukebox-card');
      const show = cardActionsOpen && card?.classList.contains('jukebox-card--centered');
      el.classList.toggle('is-open', show);
      el.toggleAttribute('inert', !show);
    });
    updateFocusInfo(boundNotes);
  }

  function updateFocusInfo(notes) {
    const list = notes || boundNotes || [];
    const centered = gallery.querySelector('.jukebox-card--centered');
    const noteId = centered?.getAttribute('data-note-id');
    let index = list.findIndex((n) => n.id === noteId);
    if (index < 0) index = 0;
    const note = list[index] || list[0] || null;
    if (focusSlot) {
      focusSlot.innerHTML = renderNoteInfoPanel(note, filterMode, {
        index,
        total: list.length,
        actionsOpen: cardActionsOpen
      });
    }
    gallery.querySelectorAll('.jukebox-card-actions').forEach((el) => {
      const card = el.closest('.jukebox-card');
      const show = cardActionsOpen && card?.classList.contains('jukebox-card--centered');
      el.classList.toggle('is-open', show);
      el.toggleAttribute('inert', !show);
    });
  }

  function refreshAfterNoteEdit() {
    clearNotionNotebooksCache();
    clearNotionTypeItemsCache();
    allNotesCache = null;
    loadNotes()
      .then((allNotes) => {
        allNotesCache = allNotes || [];
        applyFiltersAndRender();
      })
      .catch((err) => {
        console.warn('Jukebox: 수정 후 새로고침 실패', err);
      });
  }

  if (focusSlot && !focusSlot._jukeboxEditBound) {
    focusSlot._jukeboxEditBound = true;
    focusSlot.addEventListener('click', (e) => {
      const favoriteBtn = e.target?.closest?.('.jukebox-focus-info__favorite');
      if (favoriteBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (favoriteBtn.disabled) return;
        const noteId = favoriteBtn.getAttribute('data-note-id');
        const note = findNoteById(noteId);
        if (!note) return;

        const next = !note.favorites;
        const syncFavoriteButtons = (value, { disabled = false } = {}) => {
          const label = value ? '즐겨찾기 해제' : '즐겨찾기 추가';
          focusSlot
            .querySelectorAll(`.jukebox-focus-info__favorite[data-note-id="${CSS.escape(noteId)}"]`)
            .forEach((btn) => {
              const isMobile = btn.classList.contains('jukebox-focus-info__favorite--mobile');
              /* 모바일 off만 line, 데스크톱·on은 fill */
              btn.innerHTML = isMobile && !value ? MINGCUTE.starLine : MINGCUTE.starFill;
              btn.disabled = disabled;
              btn.classList.toggle('is-favorite', value);
              btn.setAttribute('aria-pressed', value ? 'true' : 'false');
              btn.setAttribute('aria-label', label);
              btn.setAttribute('title', label);
            });
        };

        note.favorites = next;
        if (Array.isArray(allNotesCache)) {
          const cached = allNotesCache.find((n) => n.id === noteId);
          if (cached) cached.favorites = next;
        }
        syncFavoriteButtons(next, { disabled: true });

        updateNoteFavorite({ id: noteId, favorites: next })
          .then(() => {
            showToast(next ? '즐겨찾기에 추가했습니다' : '즐겨찾기를 해제했습니다');
            if (filterMode === 'favorites' && !next) {
              if (Array.isArray(allNotesCache)) {
                allNotesCache = allNotesCache.filter((n) => n.id !== noteId);
              }
              applyFiltersAndRender();
            }
          })
          .catch((err) => {
            console.warn('Jukebox: 즐겨찾기 변경 실패', err);
            note.favorites = !next;
            if (Array.isArray(allNotesCache)) {
              const cached = allNotesCache.find((n) => n.id === noteId);
              if (cached) cached.favorites = !next;
            }
            syncFavoriteButtons(!next, { disabled: false });
            showToast(err?.message || '즐겨찾기 변경에 실패했습니다.');
          })
          .finally(() => {
            syncFavoriteButtons(Boolean(note.favorites), { disabled: false });
          });
        return;
      }

      const createBtn = e.target?.closest?.('.jukebox-focus-info__create');
      if (createBtn) {
        e.preventDefault();
        e.stopPropagation();
        openAddNoteModal({ onCreated: refreshAfterNoteEdit });
        return;
      }

      const editPill = e.target?.closest?.(
        '.jukebox-focus-info__edit-pill, .jukebox-focus-info__pager--edit'
      );
      const editBtn = e.target?.closest?.('.jukebox-focus-info__edit');
      const addBtn = e.target?.closest?.('.jukebox-focus-info__add');
      if (!editPill && !editBtn && !addBtn) return;
      e.preventDefault();
      e.stopPropagation();
      const noteId = (editPill || editBtn || addBtn).getAttribute('data-note-id');
      const note = findNoteById(noteId);
      if (!note) return;
      if (addBtn) {
        openAddPageModal({
          note,
          onDone: refreshAfterNoteEdit
        });
        return;
      }
      openAddNoteModal({
        mode: 'edit',
        note,
        onUpdated: refreshAfterNoteEdit
      });
    });
  }

  function bindGallery(notes) {
    boundNotes = notes || [];
    cardActionsOpen = false;
    document.body.classList.remove('jukebox-card-actions-open');
    fillJukeboxGallery(gallery, prevBtn, nextBtn, notes);

    const cards = gallery.querySelectorAll(':scope > div.jukebox-card');
    cards.forEach((card, i) => {
      const note = notes[i];
      if (!note) return;
      card.setAttribute('data-note-id', note.id);
      card.setAttribute('data-pdf-url', note.pdfUrl || '');
      card.addEventListener('click', (e) => {
        /* 빨간 점 클릭은 캡처 핸들러가 처리 — 여기서는 카드 동작만 */
        if (e.target?.closest?.('.jukebox-new-badge')) return;

        /* 카드 클릭 시에도 신규 배지는 제거 */
        if (note.id && isNoteUnseen(note.id)) {
          clearNoteUnseen(note.id);
          card.querySelector('.jukebox-new-badge')?.remove();
        }

        const viewBtn = e.target?.closest?.('.jukebox-card-action--view');
        const fillBtn = e.target?.closest?.('.jukebox-card-action--fill');
        if (viewBtn || fillBtn) {
          e.preventDefault();
          e.stopPropagation();
          if (viewBtn) openNoteModal(note);
          else {
            openAddPageModal({
              note,
              onDone: refreshAfterNoteEdit
            });
          }
          return;
        }

        if (card.classList.contains('jukebox-card--centered')) {
          if (isMobileJukebox()) {
            setCardActionsOpen(!cardActionsOpen);
          } else {
            openNoteModal(note);
          }
        } else if (typeof gallery.jukeboxScrollCardToCenter === 'function') {
          setCardActionsOpen(false);
          gallery.jukeboxScrollCardToCenter(card);
        } else {
          setCardActionsOpen(false);
          const targetScroll = card.offsetLeft + card.offsetWidth / 2 - gallery.clientWidth / 2;
          gallery.scrollTo({
            left: Math.max(0, Math.min(gallery.scrollWidth - gallery.clientWidth, targetScroll)),
            behavior: 'smooth'
          });
        }
      });
    });

    if (gallery._jukeboxFocusHandler) {
      gallery.removeEventListener('jukebox:centered', gallery._jukeboxFocusHandler);
    }
    gallery._jukeboxFocusHandler = () => {
      if (gallery._jukeboxScrollState?.userScrolled) {
        setCardActionsOpen(false);
      }
      updateFocusInfo(notes);
    };
    gallery.addEventListener('jukebox:centered', gallery._jukeboxFocusHandler);
    updateFocusInfo(notes);
  }

  function applyFiltersAndRender() {
    if (!allNotesCache) return;
    const byPeriodOrType = (allNotesCache || []).filter(
      (note) => resolveFilterKey(note) === selectedValue
    );
    const sorted = sortNotes(byPeriodOrType, sortKey);
    bindGallery(sorted);

    const counts = getNotesCount(allNotesCache);
    renderFilterSubMenu(selectedValue, basePath, filterOptions, counts, viewModeToggle, {
      sortKey,
      onSortChange: (value) => {
        sortKey = value;
        applyFiltersAndRender();
      }
    });
  }

  // 진입 직후 현재 페이지 옵션으로 서브메뉴를 먼저 그림
  renderFilterSubMenu(selectedValue, basePath, filterOptions, {}, viewModeToggle, {
    sortKey,
    onSortChange: (value) => {
      sortKey = value;
      applyFiltersAndRender();
    }
  });

  loadNotes()
    .then((allNotes) => {
      allNotesCache = allNotes || [];
      applyFiltersAndRender();
    })
    .catch((err) => {
      console.warn('Jukebox filter: 노트 로드 실패', err);
      renderFilterSubMenu(selectedValue, basePath, filterOptions, {}, viewModeToggle, {
        sortKey
      });
      gallery.innerHTML = '<div class="jukebox-empty">노트를 불러올 수 없습니다.</div>';
      if (focusSlot) focusSlot.innerHTML = renderNoteInfoPanel(null, filterMode);
    });
}
