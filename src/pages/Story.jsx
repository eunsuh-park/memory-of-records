/**
 * Story 페이지 (블로그 스타일)
 * 블로그 리스트를 표시하는 페이지입니다.
 * 최대 3-6개 포스트 미리보기를 표시합니다.
 */
import { Link } from 'react-router-dom';
import { storyPosts } from '../data/storyData';
import './Story.css';

function Story() {
  return (
    <div className="story-page">
      <main className="story-main">
        {/* 헤더 */}
        <header className="story-header">
          <h1>Story</h1>
          <p className="story-subtitle">프로젝트에 대한 이야기들</p>
        </header>

        {/* 블로그 포스트 리스트 */}
        <div className="story-posts">
          {storyPosts.map((post) => (
            <article key={post.id} className="story-post-card">
              {/* 포스트 카드 클릭 시 상세 페이지로 이동 */}
              <Link to={`/story/${post.id}`} className="story-post-link">
                <h2 className="story-post-title">{post.title}</h2>
                <h3 className="story-post-subtitle">{post.subtitle}</h3>
                <p className="story-post-preview">{post.preview}</p>
                <div className="story-post-meta">
                  <span className="story-post-date">{post.publishDate}</span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}

export default Story;

