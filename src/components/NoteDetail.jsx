/**
 * NoteDetail 컴포넌트
 * 노트 상세 내용을 표시하는 컴포넌트입니다.
 * 
 * @param {Object} note - 노트 데이터 (제목, 시기, 연도, 내용, 이미지 등)
 * @param {Function} onPrevious - 이전 노트로 이동하는 함수
 * @param {Function} onNext - 다음 노트로 이동하는 함수
 * @param {Function} onBack - 목록으로 돌아가는 함수
 */
import { Link } from 'react-router-dom';
import './NoteDetail.css';

function NoteDetail({ note, onPrevious, onNext, onBack }) {
  // 노트 데이터가 없으면 에러 메시지 표시
  if (!note) {
    return (
      <div className="note-detail">
        <div className="note-error">
          <p>노트를 찾을 수 없습니다.</p>
          <Link to="/timeline" className="back-button">목록으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  return (
    <article className="note-detail">
      {/* 노트 헤더 영역 */}
      <header className="note-header">
        <h1 className="note-title">{note.title}</h1>
        <div className="note-meta">
          <span className="note-period">{note.periodName}</span>
          <span className="note-separator">•</span>
          <span className="note-year">{note.year}년</span>
        </div>
      </header>

      {/* 노트 본문 영역 */}
      <div className="note-content">
        {/* 텍스트 내용 */}
        <div className="note-text">
          {note.content.split('\n').map((paragraph, index) => (
            <p key={index}>{paragraph || <br />}</p>
          ))}
        </div>

        {/* 이미지 영역 - 추후 이미지 추가 시 사용 */}
        {note.images && note.images.length > 0 && (
          <div className="note-images">
            {note.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${note.title} 이미지 ${index + 1}`}
                className="note-image"
              />
            ))}
          </div>
        )}
      </div>

      {/* 노트 네비게이션 영역 */}
      <nav className="note-navigation">
        {/* 이전/다음 노트 버튼 */}
        <div className="note-nav-buttons">
          {onPrevious && (
            <button onClick={onPrevious} className="nav-button prev-button">
              ← 이전 노트
            </button>
          )}
          {onNext && (
            <button onClick={onNext} className="nav-button next-button">
              다음 노트 →
            </button>
          )}
        </div>

        {/* 목록으로 돌아가기 버튼 */}
        <div className="note-back-button">
          {onBack ? (
            <button onClick={onBack} className="back-button">
              목록으로 돌아가기
            </button>
          ) : (
            <Link to="/timeline" className="back-button">
              목록으로 돌아가기
            </Link>
          )}
        </div>
      </nav>
    </article>
  );
}

export default NoteDetail;

