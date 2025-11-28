/**
 * StoryDetail 페이지
 * activity 페이지의 상세 형식을 참고하여 재구성했습니다.
 */
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getStoryById, getAdjacentStories } from '../data/storyData';
import './StoryDetail.css';

function StoryDetail() {
  // URL 파라미터에서 포스트 ID 가져오기
  const { id } = useParams();
  const navigate = useNavigate();
  
  // ID로 포스트 찾기
  const post = getStoryById(id);
  
  // 이전/다음 포스트 찾기
  const { prev, next } = getAdjacentStories(id);

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

  const handlePrevious = () => {
    if (prev) {
      navigate(`/story/${prev.id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (next) {
      navigate(`/story/${next.id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    navigate('/story');
  };

  // Placeholder 아이콘 SVG
  const placeholderIconSvg = (
    <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>
      <title>pic_2_fill</title>
      <g id="pic_2_fill" fill='none'>
        <path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/>
        <path fill='#D8D8D8FF' d='M20 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2H4v14h.929l9.308-9.308a1.25 1.25 0 0 1 1.768 0L20 13.686zM7.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3'/>
      </g>
    </svg>
  );

  return (
    <article className="story-detail-page">
      <div className="story-detail-container">
        {/* 헤더 - 뒤로가기 버튼과 제목, 날짜 */}
        <div className="story-detail-header-section">
          <button onClick={handleBack} className="story-back-button" aria-label="Story 목록으로 돌아가기">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="story-detail-header">
            <h1 className="story-detail-title">{post.title}</h1>
            <div className="story-detail-title-date">{post.publishDate}</div>
          </div>
        </div>

        {/* 이미지 컨테이너 - 이전/다음 버튼 포함 */}
        <div className="story-image-container">
          {prev ? (
            <button 
              className="story-nav-btn story-prev-btn" 
              onClick={handlePrevious}
              aria-label="Previous story"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <div className="story-nav-btn-placeholder"></div>
          )}
          
          <div className="story-detail-image">
            {post.image ? (
              <img src={post.image} alt={post.title} />
            ) : (
              <div className="story-placeholder-image">
                <div className="gallery-placeholder-icon">
                  {placeholderIconSvg}
                </div>
              </div>
            )}
          </div>
          
          {next ? (
            <button 
              className="story-nav-btn story-next-btn" 
              onClick={handleNext}
              aria-label="Next story"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <div className="story-nav-btn-placeholder"></div>
          )}
        </div>

        {/* 메타 정보 */}
        {post.subtitle && (
          <div className="story-detail-meta">
            <div className="story-detail-source">{post.subtitle}</div>
          </div>
        )}

        {/* 포스트 본문 */}
        <div className="story-detail-content">
          {post.content.split('\n').map((paragraph, index) => (
            <p key={index}>{paragraph || <br />}</p>
          ))}
        </div>
      </div>
    </article>
  );
}

export default StoryDetail;

