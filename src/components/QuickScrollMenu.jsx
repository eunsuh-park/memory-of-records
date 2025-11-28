/**
 * QuickScrollMenu 컴포넌트
 * 반응형 상황에서 클릭하면 해당 스크롤 위치로 이동하는 컴포넌트입니다.
 * publications.js와 quick-scroll-menu.css를 참고하여 구현했습니다.
 */
import { useEffect, useState, useRef } from 'react';
import './QuickScrollMenu.css';

function QuickScrollMenu({ items = [] }) {
  const [activeId, setActiveId] = useState(null);
  const menuRef = useRef(null);

  /**
   * 스크롤 위치에 따라 활성화된 섹션을 찾는 함수
   */
  const getActiveSection = () => {
    if (items.length === 0) return null;

    const navHeight = 64; // TopNavigation 높이
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const viewportTop = scrollTop + navHeight + 100; // Offset for better detection

    let activeSection = null;
    let minDistance = Infinity;

    items.forEach(({ id }) => {
      if (!id) return;
      const element = document.getElementById(id);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const sectionTop = rect.top + scrollTop;
      const sectionBottom = sectionTop + rect.height;

      // Check if section is visible and calculate distance from viewport top
      if (sectionTop <= viewportTop && sectionBottom >= viewportTop) {
        const distance = Math.abs(sectionTop - viewportTop);
        if (distance < minDistance) {
          minDistance = distance;
          activeSection = { id };
        }
      } else if (sectionTop > viewportTop && sectionTop - viewportTop < minDistance) {
        // If we haven't scrolled past any section yet, use the first one
        minDistance = sectionTop - viewportTop;
        activeSection = { id };
      }
    });

    // If no section is found, use the first section
    if (!activeSection && items.length > 0 && items[0].id) {
      activeSection = { id: items[0].id };
    }

    return activeSection;
  };

  /**
   * 스크롤 이벤트 핸들러
   */
  useEffect(() => {
    if (items.length === 0) return;

    // 초기 활성화 섹션 설정
    const initialActive = getActiveSection();
    if (initialActive) {
      setActiveId(initialActive.id);
    }

    // 스크롤 이벤트 핸들러
    let scrollTimeout;
    let isScrolling = false;

    const handleScroll = () => {
      if (!isScrolling) {
        const activeSection = getActiveSection();
        if (activeSection) {
          setActiveId(activeSection.id);
        }
        isScrolling = true;
      }
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
        const activeSection = getActiveSection();
        if (activeSection) {
          setActiveId(activeSection.id);
        }
      }, 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  /**
   * 메뉴 아이템 클릭 핸들러
   */
  const handleItemClick = (e, item) => {
    e.preventDefault();
    const targetElement = document.getElementById(item.id);
    
    if (targetElement) {
      const navHeight = 64; // TopNavigation 높이
      const elementPosition = targetElement.getBoundingClientRect().top;
      
      // Check if tablet or mobile
      const isTablet = window.innerWidth >= 768 && window.innerWidth <= 1023;
      const isMobile = window.innerWidth <= 767;
      // On tablet and mobile, add extra offset equal to nav height to show the section title
      const additionalOffset = (isTablet || isMobile) ? navHeight : 0;
      const offsetPosition = elementPosition + window.pageYOffset - navHeight - additionalOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Update active state immediately
      setActiveId(item.id);
    }
  };

  // 아이템이 없으면 렌더링하지 않음
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="quick-scroll-menu" ref={menuRef} aria-label="Quick scroll menu">
      {items.map((item) => (
        <li key={item.id} className="quick-scroll-item">
          <a
            href={`#${item.id}`}
            className={`quick-scroll-link ${activeId === item.id ? 'active' : ''}`}
            onClick={(e) => handleItemClick(e, item)}
            aria-label={`Scroll to ${item.label || item.id}`}
          >
            {item.label || item.id}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default QuickScrollMenu;

