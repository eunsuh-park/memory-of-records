/**
 * Year 페이지
 * 연도별 노트를 표시하는 페이지입니다.
 * - SideMenu: Overview 및 연도별 메뉴
 * - 노트 리스트: 모든 연도의 노트들을 섹션별로 표시
 * - QuickScrollMenu: 반응형에서 빠른 스크롤 메뉴
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import YearSideMenu from '../components/YearSideMenu';
import QuickScrollMenu from '../components/QuickScrollMenu';
import { getNotesByYear, getAvailableYears } from '../data/notesData';
import './Year.css';

function Year() {
  // URL 파라미터에서 연도 정보 가져오기
  const { year } = useParams();
  const navigate = useNavigate();
  
  // 현재 선택된 연도 상태 (null이면 Overview)
  const [selectedYear, setSelectedYear] = useState(year ? parseInt(year) : null);

  /**
   * URL 파라미터가 변경되거나 초기 로드 시 선택된 연도를 업데이트합니다
   */
  useEffect(() => {
    if (year) {
      const yearNum = parseInt(year);
      setSelectedYear(yearNum);
    } else {
      setSelectedYear(null);
    }
  }, [year]);

  /**
   * 연도가 변경될 때 호출되는 함수
   * @param {number|null} newYear - 새로운 연도 (null이면 Overview)
   */
  const handleYearChange = (newYear) => {
    if (newYear === null) {
      // Overview로 이동
      navigate('/year');
      // Overview 섹션으로 스크롤
      setTimeout(() => {
        const targetElement = document.getElementById('overview');
        if (targetElement) {
          const navHeight = 64;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navHeight;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    } else {
      setSelectedYear(newYear);
      navigate(`/year/${newYear}`);
      
      // 스크롤하여 해당 섹션으로 이동
      setTimeout(() => {
        const targetElement = document.getElementById(`year-${newYear}`);
        if (targetElement) {
          const navHeight = 64;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navHeight;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  /**
   * 사용 가능한 연도 목록 가져오기
   */
  const availableYears = getAvailableYears();

  /**
   * QuickScrollMenu용 아이템 생성
   */
  const quickScrollItems = [
    { id: 'overview', label: 'Overview' },
    ...availableYears.map(y => ({
      id: `year-${y}`,
      label: `${y}`
    }))
  ];

  return (
    <div className="year-page">
      <div className="year-container">
        {/* 사이드 메뉴 */}
        <YearSideMenu 
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
        />

        {/* 메인 콘텐츠 영역 */}
        <main className="year-main">
          {/* Overview 섹션 */}
          <section id="overview" className="year-section">
            <div className="overview-content">
              <h1>Year Overview</h1>
              <p className="overview-description">
                연도별로 정리된 노트들을 탐색해보세요.
              </p>
              
              <div className="year-stats">
                {availableYears.map((y) => {
                  const yearNotes = getNotesByYear(y);
                  return (
                    <Link 
                      key={y}
                      to={`/year/${y}`}
                      className="year-stat-card"
                      onClick={() => handleYearChange(y)}
                    >
                      <h2>{y}년</h2>
                      <p className="stat-count">{yearNotes.length}개의 노트</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 연도별 섹션들 */}
          {availableYears.map((y) => {
            const yearNotes = getNotesByYear(y);
            return (
              <section 
                key={y} 
                id={`year-${y}`}
                className="year-section"
              >
                {/* 연도별 헤더 */}
                <header className="year-header">
                  <h1>{y}년</h1>
                  <p className="year-note-count">{yearNotes.length}개의 노트</p>
                </header>

                {/* 노트 리스트 */}
                {yearNotes.length > 0 ? (
                  <div className="notes-list">
                    {yearNotes.map((note) => (
                      <article key={note.id} className="note-card">
                        {/* 노트 카드 클릭 시 상세 페이지로 이동 */}
                        <Link to={`/note/${note.id}`} className="note-card-link">
                          <h2 className="note-card-title">{note.title}</h2>
                          <div className="note-card-meta">
                            <span className="note-card-period">{note.periodName}</span>
                          </div>
                          <p className="note-card-preview">
                            {note.content.length > 100 
                              ? note.content.substring(0, 100) + '...' 
                              : note.content}
                          </p>
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="no-notes">
                    <p>이 연도에 해당하는 노트가 없습니다.</p>
                  </div>
                )}
              </section>
            );
          })}
        </main>
      </div>

      {/* QuickScrollMenu - 반응형에서만 표시 */}
      <QuickScrollMenu items={quickScrollItems} />
    </div>
  );
}

export default Year;

