/**
 * SideMenu 컴포넌트
 * Timeline 페이지에서 사용하는 사이드 메뉴입니다.
 * - 초등학교 (2005-2010)
 * - 중고등학교 (2012-2016)
 * - 대학교 (2017-2022)
 * - 졸업 후 (2022-2024)
 */
import { Link, useLocation } from 'react-router-dom';
import { periodOptions } from '../data/notesData';
import './SideMenu.css';

function SideMenu({ selectedPeriod, onPeriodChange }) {
  const location = useLocation();

  /**
   * 특정 시기가 선택되었는지 확인하는 함수
   * @param {string} period - 확인할 시기
   * @returns {boolean} 선택 여부
   */
  const isSelected = (period) => {
    return selectedPeriod === period;
  };

  return (
    <aside className="side-menu">
      <nav className="side-nav">
        <h2 className="side-menu-title">시기별 노트</h2>
        
        <ul className="period-list">
          {periodOptions.map((period) => (
            <li key={period.value} className="period-item">
              {/* 각 시기로 이동하는 링크 */}
              <Link
                to={`/timeline/${period.value}`}
                className={`period-link ${isSelected(period.value) ? 'active' : ''}`}
                onClick={() => onPeriodChange && onPeriodChange(period.value)}
              >
                <span className="period-label">{period.label}</span>
                <span className="period-years">{period.years}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default SideMenu;

