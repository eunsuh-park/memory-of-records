/**
 * FilterNotesGallery - Timeline / By Type 공통 갤러리 스크롤 로직
 * CSS scroll-driven animations 사용 (filterNotesGallery.js의 updateNoteAngles 대체)
 * enableCenterPerspective: note-card--centered만 갱신 (호버 플립용)
 */

const EDGE_ZONE_LEFT = 0.12;
const EDGE_ZONE_RIGHT = 0.12;
const EDGE_HOVER_DELAY_MS = 280;
const EDGE_SCROLL_SPEED = 18;
const WHEEL_SCROLL_SPEED = 1.2;

/**
 * 중앙에 가장 가까운 카드에 note-card--centered 적용 (호버 시 뒷표지 플립용)
 */
function updateCenteredCard(timelinePage) {
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
    const absOffset = Math.abs(offset);
    if (absOffset < closestAbsOffset) {
      closestAbsOffset = absOffset;
      closestCard = card;
    }
  });

  cards.forEach((card) => {
    card.classList.toggle('note-card--centered', card === closestCard);
  });
}

/**
 * note-card--centered 클래스 갱신 (호버 플립용, scroll-driven 애니메이션은 CSS 담당)
 */
export function enableCenterPerspective(timelinePage) {
  if (!timelinePage) return;
  const onUpdate = () => {
    if (!timelinePage.isConnected) {
      window.removeEventListener('resize', onUpdate);
      return;
    }
    updateCenteredCard(timelinePage);
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
