/**
 * Timeline 페이지
 * 시기별 노트를 표시하는 페이지입니다.
 * - SideMenu: 시기 선택
 * - 노트 리스트: 모든 시기의 노트들을 섹션별로 표시
 * - QuickScrollMenu: 반응형에서 빠른 스크롤 메뉴
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import SideMenu from '../components/SideMenu';
import QuickScrollMenu from '../components/QuickScrollMenu';
import { getNotesByPeriod, periodOptions } from '../data/notesData';
import './Timeline.css';

function Timeline() {
  // URL 파라미터에서 시기 정보 가져오기
  const { period } = useParams();
  const navigate = useNavigate();
  
  // 현재 선택된 시기 상태
  const [selectedPeriod, setSelectedPeriod] = useState(period || 'elementary');

  /**
   * URL 파라미터가 변경되거나 초기 로드 시 선택된 시기를 업데이트합니다
   */
  useEffect(() => {
    // URL 파라미터가 있으면 그것을 사용, 없으면 기본값
    const periodToUse = period || 'elementary';
    setSelectedPeriod(periodToUse);
  }, [period]);

  /**
   * 시기가 변경될 때 호출되는 함수
   * @param {string} newPeriod - 새로운 시기
   */
  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
    // URL을 변경하여 새로운 시기의 노트를 표시
    navigate(`/timeline/${newPeriod}`);
    
    // 스크롤하여 해당 섹션으로 이동
    setTimeout(() => {
      const targetElement = document.getElementById(newPeriod);
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
  };

  /**
   * QuickScrollMenu용 아이템 생성
   * 라벨은 짧게 표시 (연도만 표시)
   */
  const quickScrollItems = periodOptions.map(option => {
    // 연도 범위에서 첫 번째 연도만 추출 (예: "2005-2010" -> "2005")
    const firstYear = option.years.split('-')[0];
    return {
      id: option.value,
      label: firstYear
    };
  });

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
          {/* 모든 시기별로 섹션 생성 */}
          {periodOptions.map((periodOption) => {
            const periodNotes = getNotesByPeriod(periodOption.value);
            const isSelected = selectedPeriod === periodOption.value;

            return (
              <section 
                key={periodOption.value} 
                id={periodOption.value}
                className="timeline-period-section"
              >
                {/* 시기별 헤더 */}
                <header className="timeline-header">
                  <h1>{periodOption.label}</h1>
                  <p className="timeline-years">{periodOption.years}</p>
                </header>

                {/* 노트 리스트 */}
                {periodNotes.length > 0 ? (
                  <div className="notes-list">
                    {periodNotes.map((note) => (
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

export default Timeline;

