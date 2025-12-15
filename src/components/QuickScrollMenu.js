/**
 * QuickScrollMenu 컴포넌트
 * 반응형 상황에서 클릭하면 해당 스크롤 위치로 이동하는 컴포넌트입니다.
 */

import '../components/QuickScrollMenu.css';

let activeId = null;
let scrollTimeout = null;

export function renderQuickScrollMenu(items = []) {
  const container = document.getElementById('quick-scroll-menu');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <ul class="quick-scroll-menu" aria-label="Quick scroll menu">
      ${items.map(item => `
        <li class="quick-scroll-item">
          <a
            href="#${item.id}"
            class="quick-scroll-link ${activeId === item.id ? 'active' : ''}"
            data-scroll-to="${item.id}"
          >
            ${item.label || item.id}
          </a>
        </li>
      `).join('')}
    </ul>
  `;

  // 클릭 이벤트 리스너
  container.querySelectorAll('[data-scroll-to]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-scroll-to');
      scrollToSection(targetId);
      activeId = targetId;
      updateActiveState();
    });
  });

  // 스크롤 이벤트 리스너
  setupScrollListener(items);
  updateActiveState();
}

function scrollToSection(id) {
  const targetElement = document.getElementById(id);
  if (!targetElement) return;

  const navHeight = 64;
  const elementPosition = targetElement.getBoundingClientRect().top;
  const isTablet = window.innerWidth >= 768 && window.innerWidth <= 1023;
  const isMobile = window.innerWidth <= 767;
  const additionalOffset = (isTablet || isMobile) ? navHeight : 0;
  const offsetPosition = elementPosition + window.pageYOffset - navHeight - additionalOffset;

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
}

function getActiveSection(items) {
  if (items.length === 0) return null;

  const navHeight = 64;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const viewportTop = scrollTop + navHeight + 100;

  let activeSection = null;
  let minDistance = Infinity;

  items.forEach(({ id }) => {
    if (!id) return;
    const element = document.getElementById(id);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const sectionTop = rect.top + scrollTop;
    const sectionBottom = sectionTop + rect.height;

    if (sectionTop <= viewportTop && sectionBottom >= viewportTop) {
      const distance = Math.abs(sectionTop - viewportTop);
      if (distance < minDistance) {
        minDistance = distance;
        activeSection = { id };
      }
    } else if (sectionTop > viewportTop && sectionTop - viewportTop < minDistance) {
      minDistance = sectionTop - viewportTop;
      activeSection = { id };
    }
  });

  if (!activeSection && items.length > 0 && items[0].id) {
    activeSection = { id: items[0].id };
  }

  return activeSection;
}

function setupScrollListener(items) {
  let isScrolling = false;

  const handleScroll = () => {
    if (!isScrolling) {
      const activeSection = getActiveSection(items);
      if (activeSection) {
        activeId = activeSection.id;
        updateActiveState();
      }
      isScrolling = true;
    }
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
      const activeSection = getActiveSection(items);
      if (activeSection) {
        activeId = activeSection.id;
        updateActiveState();
      }
    }, 50);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
}

function updateActiveState() {
  const container = document.getElementById('quick-scroll-menu');
  if (!container) return;

  container.querySelectorAll('.quick-scroll-link').forEach(link => {
    const id = link.getAttribute('data-scroll-to');
    if (id === activeId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

