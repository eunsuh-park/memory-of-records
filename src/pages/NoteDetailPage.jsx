/**
 * NoteDetailPage 페이지
 * 노트 상세 내용을 표시하는 페이지입니다.
 * NoteDetail 컴포넌트를 사용하여 노트를 표시하고,
 * 이전/다음 노트로 이동할 수 있습니다.
 */
import { useParams, useNavigate, Link } from 'react-router-dom';
import NoteDetail from '../components/NoteDetail';
import { getNoteById, getAdjacentNotes, notesData } from '../data/notesData';
import './NoteDetailPage.css';

function NoteDetailPage() {
  // URL 파라미터에서 노트 ID 가져오기
  const { id } = useParams();
  const navigate = useNavigate();
  
  // ID로 노트 찾기
  const note = getNoteById(id);
  
  // 이전/다음 노트 찾기
  const { prev, next } = getAdjacentNotes(id);

  /**
   * 이전 노트로 이동하는 함수
   */
  const handlePrevious = () => {
    if (prev) {
      navigate(`/note/${prev.id}`);
      // 페이지 상단으로 스크롤
      window.scrollTo(0, 0);
    }
  };

  /**
   * 다음 노트로 이동하는 함수
   */
  const handleNext = () => {
    if (next) {
      navigate(`/note/${next.id}`);
      // 페이지 상단으로 스크롤
      window.scrollTo(0, 0);
    }
  };

  /**
   * 목록으로 돌아가는 함수
   * 노트의 시기 정보를 이용하여 Timeline 페이지로 이동
   */
  const handleBack = () => {
    if (note) {
      navigate(`/timeline/${note.period}`);
    } else {
      navigate('/timeline');
    }
  };

  return (
    <div className="note-detail-page">
      <NoteDetail
        note={note}
        onPrevious={prev ? handlePrevious : null}
        onNext={next ? handleNext : null}
        onBack={handleBack}
      />
    </div>
  );
}

export default NoteDetailPage;

