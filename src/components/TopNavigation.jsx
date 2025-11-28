/**
 * TopNavigation 컴포넌트
 * 모든 페이지 상단에 표시되는 네비게이션 헤더입니다.
 * - 로고
 * - 네비게이션 메뉴 (메인/About/Year)
 */
import { Link, useLocation } from 'react-router-dom';
import './TopNavigation.css';

function TopNavigation() {
  // 현재 페이지 경로를 가져옵니다
  const location = useLocation();
  
  /**
   * 현재 경로가 활성화된 메뉴인지 확인하는 함수
   * @param {string} path - 확인할 경로
   * @returns {boolean} 활성화 여부
   */
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="top-navigation">
      <div className="nav-container">
        {/* 로고 영역 - 클릭 시 홈으로 이동 */}
        <Link to="/" className="logo">
          {/* 로고 이미지는 추후 추가 */}
          <span className="logo-text">Memory of Records</span>
        </Link>

        {/* 네비게이션 메뉴 */}
        <ul className="nav-menu">
          <li>
            {/* Timeline 페이지로 이동 */}
            <Link 
              to="/timeline" 
              className={location.pathname.startsWith('/timeline') ? 'active' : ''}
            >
              Timeline
            </Link>
          </li>
          <li>
            {/* Story (블로그) 페이지로 이동 */}
            <Link 
              to="/story" 
              className={location.pathname.startsWith('/story') ? 'active' : ''}
            >
              Story
            </Link>
          </li>
          <li>
            {/* Year 페이지로 이동 */}
            <Link 
              to="/year" 
              className={location.pathname.startsWith('/year') ? 'active' : ''}
            >
              Year
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default TopNavigation;

