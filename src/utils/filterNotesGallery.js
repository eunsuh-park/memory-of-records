/**
 * FilterNotesGallery - Timeline / By Type 공통 갤러리 스크롤·3D 로직
 * updateNoteAngles, enableCenterPerspective, enableGalleryScroll
 */

const EDGE_ZONE_LEFT = 0.12;
const EDGE_ZONE_RIGHT = 0.12;
const EDGE_HOVER_DELAY_MS = 280;
const EDGE_SCROLL_SPEED = 18;
const COVER_FLOW_ANGLE_DEG = 45;
const COVER_FLOW_SCALE_CENTER = 1.25;
const COVER_FLOW_SCALE_SIDE = 0.88;
const COVER_FLOW_Z_CENTER = '1.5em';
const COVER_FLOW_Z_SIDE = '0em';
const COVER_FLOW_Z_INDEX_CENTER = 100;
const COVER_FLOW_Z_INDEX_SIDE = 1;
const WHEEL_SCROLL_SPEED = 1.2;

/**
 * Cover Flow - 노트 카드 위치에 따라 3D 변환
 */
export function updateNoteAngles(timelinePage) {
  if (!timelinePage) return;
  const viewportCenterX = timelinePage.scrollLeft + timelinePage.clientWidth / 2;
  const halfWidth = timelinePage.clientWidth / 2;
  const timelineRect = timelinePage.getBoundingClientRect();
  const cards = timelinePage.querySelectorAll('.note-card[data-note-id]');

  let closestCard = null;
  let closestAbsOffset = Infinity;

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const cardCenterX =
      rect.left - timelineRect.left + timelinePage.scrollLeft + rect.width / 2;
    const offset = cardCenterX - viewportCenterX;
    const ratio = Math.max(-1, Math.min(1, offset / halfWidth));
    const absOffset = Math.abs(offset);
    if (absOffset < closestAbsOffset) {
      closestAbsOffset = absOffset;
      closestCard = card;
    }

    const angle = -ratio * COVER_FLOW_ANGLE_DEG;
    const absRatio = Math.abs(ratio);
    const scale =
      COVER_FLOW_SCALE_SIDE +
      (1 - absRatio) * (COVER_FLOW_SCALE_CENTER - COVER_FLOW_SCALE_SIDE);
    const translateZ = absRatio > 0.5 ? COVER_FLOW_Z_SIDE : COVER_FLOW_Z_CENTER;
    const zIndex = Math.round(
      COVER_FLOW_Z_INDEX_SIDE +
        (1 - absRatio) * (COVER_FLOW_Z_INDEX_CENTER - COVER_FLOW_Z_INDEX_SIDE)
    );
    const hoverX = ratio < -0.05 ? '3vw' : ratio > 0.05 ? '-3vw' : '0';
    const brightness = 1 - (1 - 0.48) * absRatio;
    const shadowOpacity = (0.32 - absRatio * 0.42) * 0.5;
    const shadowBlur = 22 - Math.round(absRatio * 10);

    card.style.setProperty(
      '--timeline-shadow',
      `0 6px ${shadowBlur}px rgba(0,0,0,${Math.max(0.03, shadowOpacity).toFixed(2)})`
    );
    card.style.setProperty('--timeline-rotate-y', `${angle}deg`);
    card.style.setProperty('--timeline-scale', String(scale));
    card.style.setProperty('--timeline-translate-z', translateZ);
    card.style.setProperty('--timeline-hover-x', hoverX);
    card.style.setProperty('--timeline-brightness', String(brightness));
    card.style.zIndex = String(zIndex);
  });

  cards.forEach((card) => {
    card.classList.toggle('note-card--centered', card === closestCard);
  });
}

/**
 * Cover Flow 스크롤·리사이즈 연동
 */
export function enableCenterPerspective(timelinePage) {
  if (!timelinePage) return;
  const onUpdate = () => {
    if (!timelinePage.isConnected) {
      window.removeEventListener('resize', onUpdate);
      return;
    }
    updateNoteAngles(timelinePage);
  };
  timelinePage.addEventListener('scroll', onUpdate, { passive: true });
  window.addEventListener('resize', onUpdate);
  onUpdate();
}

/**
 * 가장자리 호버 스크롤 + 이전/다음 버튼 + 휠→가로 스크롤
 */
export function enableGalleryScroll(timelinePage, wrapEl, prevBtn, nextBtn) {
  if (!timelinePage) return;
  let scrolling = null;
  let edgeDelayTimer = null;

  function tick(direction) {
    const maxScroll = timelinePage.scrollWidth - timelinePage.clientWidth;
    if (maxScroll <= 0) return;
    if (direction < 0) {
      timelinePage.scrollLeft = Math.max(
        0,
        timelinePage.scrollLeft - Math.abs(direction)
      );
    } else if (direction > 0) {
      timelinePage.scrollLeft = Math.min(
        maxScroll,
        timelinePage.scrollLeft + Math.abs(direction)
      );
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
    const ratio = pageX / window.innerWidth;
    let direction = 0;
    if (ratio < EDGE_ZONE_LEFT) {
      direction = -EDGE_SCROLL_SPEED * (1 - ratio / EDGE_ZONE_LEFT);
    } else if (ratio > 1 - EDGE_ZONE_RIGHT) {
      direction =
        EDGE_SCROLL_SPEED *
        ((ratio - (1 - EDGE_ZONE_RIGHT)) / EDGE_ZONE_RIGHT);
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

  const hoverTarget = wrapEl || timelinePage;
  hoverTarget.addEventListener(
    'mousemove',
    (e) => {
      const pageX = e.clientX ?? e.screenX ?? 0;
      const ratio = pageX / window.innerWidth;
      if (ratio >= EDGE_ZONE_LEFT && ratio <= 1 - EDGE_ZONE_RIGHT) {
        stopScroll();
        return;
      }
      startScrollIfEdge(pageX);
    },
    { passive: true }
  );
  hoverTarget.addEventListener('mouseleave', stopScroll);

  timelinePage.addEventListener(
    'wheel',
    (e) => {
      const maxScroll = timelinePage.scrollWidth - timelinePage.clientWidth;
      if (maxScroll <= 0) return;
      const delta = e.deltaY * WHEEL_SCROLL_SPEED;
      const newScroll = timelinePage.scrollLeft + delta;
      if (delta > 0 && newScroll < maxScroll) {
        e.preventDefault();
        timelinePage.scrollLeft = Math.min(maxScroll, newScroll);
      } else if (delta < 0 && newScroll > 0) {
        e.preventDefault();
        timelinePage.scrollLeft = Math.max(0, newScroll);
      }
    },
    { passive: false }
  );

  function scrollToCenterCard(card) {
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const timelineRect = timelinePage.getBoundingClientRect();
    const targetScroll =
      rect.left -
      timelineRect.left +
      timelinePage.scrollLeft +
      rect.width / 2 -
      timelinePage.clientWidth / 2;
    timelinePage.scrollTo({
      left: Math.max(
        0,
        Math.min(timelinePage.scrollWidth - timelinePage.clientWidth, targetScroll)
      ),
      behavior: 'smooth'
    });
  }

  function getCards() {
    return Array.from(timelinePage.querySelectorAll('.note-card[data-note-id]'));
  }

  function getClosestCardIndex() {
    const cards = getCards();
    if (cards.length === 0) return -1;
    const viewportCenterX = timelinePage.scrollLeft + timelinePage.clientWidth / 2;
    const timelineRect = timelinePage.getBoundingClientRect();
    let closestIdx = 0;
    let closestDist = Infinity;
    cards.forEach((card, i) => {
      const rect = card.getBoundingClientRect();
      const cardCenter =
        rect.left - timelineRect.left + timelinePage.scrollLeft + rect.width / 2;
      const dist = Math.abs(cardCenter - viewportCenterX);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    });
    return closestIdx;
  }

  prevBtn?.addEventListener('click', () => {
    const idx = getClosestCardIndex();
    const cards = getCards();
    if (idx > 0) scrollToCenterCard(cards[idx - 1]);
    else if (cards.length > 0) scrollToCenterCard(cards[0]);
  });
  nextBtn?.addEventListener('click', () => {
    const idx = getClosestCardIndex();
    const cards = getCards();
    if (idx >= 0 && idx < cards.length - 1)
      scrollToCenterCard(cards[idx + 1]);
    else if (cards.length > 0) scrollToCenterCard(cards[cards.length - 1]);
  });
}
