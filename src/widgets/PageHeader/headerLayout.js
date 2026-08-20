/**
 * 데스크톱 헤더(로고 | 필터 | 우측)가 고정 높이에서 겹치면
 * 뷰포트와 무관하게 모바일 헤더로 전환한다.
 *
 * body.page-header-mobile — PageHeader · FilterSubMenu · FilterChip · App 셸이 같이 본다.
 */

export const HEADER_MOBILE_MQ = '(max-width: 768px)';
const CLUSTER_GAP = 8;
const RELEASE_SLACK = 32;
const BODY_CLASS = 'page-header-mobile';

let syncing = false;
let windowBound = false;
let rafId = 0;
let observers = [];

function headerMobileMqMatches() {
  return typeof window !== 'undefined' && window.matchMedia(HEADER_MOBILE_MQ).matches;
}

function clusterHasContent(el) {
  if (!el) return false;
  return Boolean(el.querySelector('.sub-menu, .filter-list, .chip, .view-mode-toggle'));
}

function rectsOverlap(a, b, slack = 0) {
  return a.right + slack > b.left && b.right + slack > a.left;
}

/**
 * 데스크톱 그리드에서 좌·중·우 intrinsic 폭 합 또는 박스 겹침이면 true.
 * 호출 전에 body.page-header-mobile을 잠시 끄고 재배치한 뒤 잰다.
 */
function desktopClustersCollide(header, slack = 0) {
  const left = header.querySelector('.page-header__left');
  const center = header.querySelector('.page-header__center');
  const right = header.querySelector('.page-header__right--desktop');
  if (!left || !right) return false;

  const style = getComputedStyle(header);
  const inner =
    header.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const leftW = Math.ceil(left.scrollWidth);
  const rightW = Math.ceil(right.scrollWidth);
  const centerOn = clusterHasContent(center);
  const centerW = centerOn ? Math.ceil(center.scrollWidth) : 0;
  const gaps = (centerOn ? 2 : 1) * CLUSTER_GAP;

  if (leftW + centerW + rightW + gaps + slack > inner) return true;

  const leftR = left.getBoundingClientRect();
  const rightR = right.getBoundingClientRect();
  if (centerOn) {
    const centerR = center.getBoundingClientRect();
    if (rectsOverlap(leftR, centerR, CLUSTER_GAP + slack)) return true;
    if (rectsOverlap(centerR, rightR, CLUSTER_GAP + slack)) return true;
  } else if (leftR.right + CLUSTER_GAP + slack > rightR.left) {
    return true;
  }

  if (left.scrollWidth > left.clientWidth + 1) return true;
  if (right.scrollWidth > right.clientWidth + 1) return true;
  if (centerOn && center.scrollWidth > center.clientWidth + 1) return true;

  return false;
}

function closeDrawerChrome() {
  document.body.classList.remove('nav-drawer-open');
  const drawer = document.querySelector('#page-nav-drawer');
  const backdrop = document.querySelector('.nav-drawer-backdrop');
  const btn = document.querySelector('[data-drawer-open]');
  drawer?.setAttribute('aria-hidden', 'true');
  backdrop?.classList.remove('is-visible');
  btn?.setAttribute('aria-expanded', 'false');
}

export function syncPageHeaderLayout() {
  if (syncing) return;
  const header = document.querySelector('.page-header');
  if (!header) return;

  if (headerMobileMqMatches()) {
    document.body.classList.add(BODY_CLASS);
    return;
  }

  const wasOn = document.body.classList.contains(BODY_CLASS);
  syncing = true;
  document.body.classList.remove(BODY_CLASS);
  void header.offsetWidth;

  const next = wasOn
    ? desktopClustersCollide(header, RELEASE_SLACK)
    : desktopClustersCollide(header, 0);

  document.body.classList.toggle(BODY_CLASS, next);
  if (wasOn && !next) closeDrawerChrome();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      syncing = false;
    });
  });
}

export function schedulePageHeaderLayoutSync() {
  if (rafId) cancelAnimationFrame(rafId);
  const run = () => {
    rafId = 0;
    if (syncing) {
      rafId = requestAnimationFrame(run);
      return;
    }
    syncPageHeaderLayout();
  };
  rafId = requestAnimationFrame(run);
}

function disconnectObservers() {
  observers.forEach((obs) => obs.disconnect());
  observers = [];
}

function ensureWindowBind() {
  if (windowBound) return;
  windowBound = true;
  window.addEventListener('resize', schedulePageHeaderLayoutSync);
  window.matchMedia(HEADER_MOBILE_MQ).addEventListener('change', syncPageHeaderLayout);
}

/**
 * 헤더 DOM이 다시 그려질 때마다 호출한다.
 * @param {ParentNode} container - #page-header
 */
export function bindPageHeaderLayout(container) {
  disconnectObservers();
  ensureWindowBind();

  const header = container.querySelector('.page-header');
  const center = container.querySelector('.page-header__center');
  const right = container.querySelector('.page-header__right--desktop');

  const ro = new ResizeObserver(() => {
    if (syncing) return;
    schedulePageHeaderLayoutSync();
  });
  if (header) ro.observe(header);
  if (center) ro.observe(center);
  if (right) ro.observe(right);
  observers.push(ro);

  const mo = new MutationObserver(() => schedulePageHeaderLayoutSync());
  if (center) mo.observe(center, { childList: true, subtree: true, characterData: true });
  if (right) mo.observe(right, { childList: true, subtree: true });
  observers.push(mo);

  syncPageHeaderLayout();
}
