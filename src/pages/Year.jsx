/**
 * Year 페이지
 * 연도별 노트를 표시하는 페이지입니다.
 * - SideMenu: Overview 및 연도별 메뉴
 * - 노트 리스트: 선택된 연도의 노트들을 표시
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import YearSideMenu from '../components/YearSideMenu';
import { getNotesByYear, getAvailableYears, notesData } from '../data/notesData';
import './Year.css';

function Year() {
  // URL 파라미터에서 연도 정보 가져오기
  const { year } = useParams();
  const navigate = useNavigate();
  
  // 현재 선택된 연도 상태 (null이면 Overview)
  const [selectedYear, setSelectedYear] = useState(year ? parseInt(year) : null);
  // 선택된 연도의 노트들
  const [notes, setNotes] = useState([]);
  // Overview 모드 여부
  const [isOverview, setIsOverview] = useState(!year);

  /**
   * URL 파라미터가 변경되거나 초기 로드 시 노트를 가져옵니다
   */
  useEffect(() => {
    if (year) {
      const yearNum = parseInt(year);
      setSelectedYear(yearNum);
      setIsOverview(false);
      
      // 해당 연도의 노트들을 가져옵니다
      const filteredNotes = getNotesByYear(yearNum);
      setNotes(filteredNotes);
    } else {
      // Overview 모드
      setIsOverview(true);
      setSelectedYear(null);
      setNotes([]);
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
    } else {
      setSelectedYear(newYear);
      navigate(`/year/${newYear}`);
    }
  };

  /**
   * Overview 페이지 내용
   */
  const renderOverview = () => {
    const availableYears = getAvailableYears();
    const yearStats = availableYears.map(y => ({
      year: y,
      count: getNotesByYear(y).length
    }));

    return (
      <div className="overview-content">
        <h1>Year Overview</h1>
        <p className="overview-description">
          연도별로 정리된 노트들을 탐색해보세요.
        </p>
        
        <div className="year-stats">
          {yearStats.map(({ year, count }) => (
            <Link 
              key={year}
              to={`/year/${year}`}
              className="year-stat-card"
            >
              <h2>{year}년</h2>
              <p className="stat-count">{count}개의 노트</p>
            </Link>
          ))}
        </div>
      </div>
    );
  };

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
          {isOverview ? (
            renderOverview()
          ) : (
            <>
              {/* 연도별 헤더 */}
              <header className="year-header">
                <h1>{selectedYear}년</h1>
                <p className="year-note-count">{notes.length}개의 노트</p>
              </header>

              {/* 노트 리스트 */}
              {notes.length > 0 ? (
                <div className="notes-list">
                  {notes.map((note) => (
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
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Year;

