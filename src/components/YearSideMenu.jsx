/**
 * YearSideMenu 컴포넌트
 * Year 페이지에서 사용하는 사이드 메뉴입니다.
 * - Overview (오버뷰)
 * - 연도별 메뉴 (2012-2024)
 */
import { Link, useLocation } from 'react-router-dom';
import { getAvailableYears } from '../data/notesData';
import './YearSideMenu.css';

function YearSideMenu({ selectedYear, onYearChange }) {
  const location = useLocation();
  
  // 사용 가능한 연도 목록 가져오기
  const availableYears = getAvailableYears();

  /**
   * Overview가 선택되었는지 확인하는 함수
   * @returns {boolean} 선택 여부
   */
  const isOverviewSelected = () => {
    return location.pathname === '/year';
  };

  /**
   * 특정 연도가 선택되었는지 확인하는 함수
   * @param {number} year - 확인할 연도
   * @returns {boolean} 선택 여부
   */
  const isYearSelected = (year) => {
    return selectedYear === year;
  };

  return (
    <aside className="year-side-menu">
      <nav className="year-side-nav">
        <h2 className="year-side-menu-title">연도별 노트</h2>
        
        <ul className="year-menu-list">
          {/* Overview 메뉴 항목 */}
          <li className="year-menu-item">
            <Link
              to="/year"
              className={`year-menu-link ${isOverviewSelected() ? 'active' : ''}`}
              onClick={() => onYearChange && onYearChange(null)}
            >
              Overview
            </Link>
          </li>

          {/* 연도별 메뉴 항목들 */}
          {availableYears.map((year) => (
            <li key={year} className="year-menu-item">
              <Link
                to={`/year/${year}`}
                className={`year-menu-link ${isYearSelected(year) ? 'active' : ''}`}
                onClick={() => onYearChange && onYearChange(year)}
              >
                {year}년
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default YearSideMenu;

