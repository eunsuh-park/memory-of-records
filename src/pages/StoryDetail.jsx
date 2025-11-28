/**
 * StoryDetail 페이지
 * 블로그 포스트의 상세 내용을 표시하는 페이지입니다.
 */
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getStoryById } from '../data/storyData';
import './StoryDetail.css';

function StoryDetail() {
  // URL 파라미터에서 포스트 ID 가져오기
  const { id } = useParams();
  const navigate = useNavigate();
  
  // ID로 포스트 찾기
  const post = getStoryById(id);

  // 포스트가 없으면 에러 메시지 표시
  if (!post) {
    return (
      <div className="story-detail-page">
        <div className="story-error">
          <p>포스트를 찾을 수 없습니다.</p>
          <Link to="/story" className="back-button">Story 목록으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  return (
    <article className="story-detail-page">
      <div className="story-detail-container">
        {/* 뒤로가기 버튼 */}
        <div className="story-back">
          <button onClick={() => navigate('/story')} className="back-button">
            ← Story 목록으로 돌아가기
          </button>
        </div>

        {/* 포스트 헤더 */}
        <header className="story-detail-header">
          <h1 className="story-detail-title">{post.title}</h1>
          <h2 className="story-detail-subtitle">{post.subtitle}</h2>
          <div className="story-detail-meta">
            <span className="story-detail-date">발행일: {post.publishDate}</span>
          </div>
        </header>

        {/* 포스트 본문 */}
        <div className="story-detail-content">
          {/* 내용을 줄바꿈 기준으로 분할하여 표시 */}
          {post.content.split('\n').map((paragraph, index) => (
            <p key={index}>{paragraph || <br />}</p>
          ))}
        </div>

        {/* 하단 네비게이션 */}
        <div className="story-detail-footer">
          <button onClick={() => navigate('/story')} className="back-button">
            Story 목록으로 돌아가기
          </button>
        </div>
      </div>
    </article>
  );
}

export default StoryDetail;

