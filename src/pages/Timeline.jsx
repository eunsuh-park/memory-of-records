/**
 * Timeline 페이지
 * 시기별 노트를 표시하는 페이지입니다.
 * - SideMenu: 시기 선택
 * - 노트 리스트: 선택된 시기의 노트들을 표시
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SideMenu from '../components/SideMenu';
import { getNotesByPeriod, periodOptions } from '../data/notesData';
import './Timeline.css';

function Timeline() {
  // URL 파라미터에서 시기 정보 가져오기
  const { period } = useParams();
  const navigate = useNavigate();
  
  // 현재 선택된 시기 상태
  const [selectedPeriod, setSelectedPeriod] = useState(period || 'elementary');
  // 현재 시기의 노트들
  const [notes, setNotes] = useState([]);

  /**
   * URL 파라미터가 변경되거나 초기 로드 시 노트를 가져옵니다
   */
  useEffect(() => {
    // URL 파라미터가 있으면 그것을 사용, 없으면 기본값
    const periodToUse = period || 'elementary';
    setSelectedPeriod(periodToUse);
    
    // 해당 시기의 노트들을 가져옵니다
    const filteredNotes = getNotesByPeriod(periodToUse);
    setNotes(filteredNotes);
  }, [period]);

  /**
   * 시기가 변경될 때 호출되는 함수
   * @param {string} newPeriod - 새로운 시기
   */
  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
    // URL을 변경하여 새로운 시기의 노트를 표시
    navigate(`/timeline/${newPeriod}`);
  };

  /**
   * 현재 선택된 시기의 정보를 가져옵니다
   */
  const currentPeriodInfo = periodOptions.find(p => p.value === selectedPeriod);

  return (
    <div className="timeline-page">
      <div className="timeline-container">
        {/* 사이드 메뉴 */}
        <SideMenu 
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
        />

        {/* 메인 콘텐츠 영역 */}
        <main className="timeline-main">
          {/* 시기별 헤더 */}
          <header className="timeline-header">
            <h1>{currentPeriodInfo?.label || 'Timeline'}</h1>
            <p className="timeline-years">{currentPeriodInfo?.years || ''}</p>
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
                      <span className="note-card-year">{note.year}년</span>
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
              <p>이 시기에 해당하는 노트가 없습니다.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Timeline;

