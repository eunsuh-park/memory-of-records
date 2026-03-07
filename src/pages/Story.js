/**
 * Story 페이지 (Gallery 형식)
 * Top Nav 숨김 + 좌측 상단 뒤로가기 버튼
 * - DB에 Title이 "Introduction"인 페이지가 있으면 첫 화면을 해당 페이지의 StoryDetail로 표시
 */

import { router } from '../router.js';
import './Story.css';
import { render as renderButton } from '../components/Button/Button.js';
import { loadNotionPosts, getStoryPosts } from '../services/notion.js';
import { renderStoryDetail } from './StoryDetail.js';

export async function renderStory() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  /* Story 페이지: Top Nav 숨김 (슬라이드 업), 전체 화면 활용 */
  document.body.classList.add('story-detail-page-active');

  // 로딩 상태 표시 - 스켈레톤 UI
  const skeletonItems = Array(6).fill(0).map(() => `
    <div class="gallery-item skeleton-item">
      <div class="gallery-item-image-container">
        <div class="gallery-item-front">
          <div class="gallery-item-image">
            <div class="skeleton-image"></div>
          </div>
        </div>
      </div>
      <div class="gallery-item-title">
        <div class="skeleton-text skeleton-text-title"></div>
      </div>
    </div>
  `).join('');
  
  mainContent.innerHTML = `
    ${renderButton({ variant: 'back', ariaLabel: '이전 페이지로 돌아가기', dataLink: true })}
    <div class="story-page">
      <main class="story-main">
        <div class="gallery-grid">
          ${skeletonItems}
        </div>
      </main>
    </div>
  `;

  /* 뒤로가기: 홈(Timeline)으로 이동 */
  mainContent.querySelector('.btn--back')?.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('/');
  });

  // 노션 데이터 가져오기 (캐시 채움 → StoryDetail에서 getStoryById 사용 가능)
  let posts = [];
  try {
    await loadNotionPosts();
    posts = getStoryPosts() || [];
    if (posts.length > 0) {
      const { fetchNotionPageContent, extractFirstImageFromBlocks } = await import('../services/notion.js');
      for (let i = 0; i < posts.length; i++) {
        if (!posts[i].image && posts[i].notionId) {
          try {
            const blocks = await fetchNotionPageContent(posts[i].notionId);
            const imageUrl = extractFirstImageFromBlocks(blocks);
            if (imageUrl) posts[i].image = imageUrl;
          } catch (err) {
            console.warn(`이미지 추출 실패 (${posts[i].notionId}):`, err);
          }
        }
      }
    }
  } catch (error) {
    console.error('스토리 데이터 로딩 실패:', error);
  }

  // DB의 Introduction 페이지가 있으면 첫 화면을 StoryDetail로 표시
  const introTitleNorm = (t) => String(t || '').trim().toLowerCase();
  const introductionPost = posts.find(
    (p) => introTitleNorm(p.title) === 'introduction' || introTitleNorm(p.title) === '소개'
  );
  if (introductionPost && introductionPost.notionId) {
    await renderStoryDetail(introductionPost.notionId, true);
    return;
  }

  console.log('최종 포스트 목록 (갤러리):', posts);
  
  // 포스트가 없을 때 안내 메시지 표시
  if (posts.length === 0) {
    const emptyMessage = `
      <div class="story-empty-message">
        <h2>아직 Story가 없습니다</h2>
        <p>Notion 데이터베이스에 Story를 추가하면 여기에 표시됩니다.</p>
      </div>
    `;
    
    mainContent.innerHTML = `
      ${renderButton({ variant: 'back', ariaLabel: '이전 페이지로 돌아가기', dataLink: true })}
      <div class="story-page">
        <main class="story-main">
          ${emptyMessage}
        </main>
      </div>
    `;
    mainContent.querySelector('.btn--back')?.addEventListener('click', (e) => {
      e.preventDefault();
      router.navigate('/');
    });
    return;
  }

  const placeholderIconSvg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>
      <title>pic_2_fill</title>
      <g id="pic_2_fill" fill='none'>
        <path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/>
        <path fill='#D8D8D8FF' d='M20 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2H4v14h.929l9.308-9.308a1.25 1.25 0 0 1 1.768 0L20 13.686zM7.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3'/>
      </g>
    </svg>
  `;

  // 노션 ID를 사용하거나 기존 ID 사용
  mainContent.innerHTML = `
    ${renderButton({ variant: 'back', ariaLabel: '이전 페이지로 돌아가기', dataLink: true })}
    <div class="story-page">
      <main class="story-main">
        <div class="gallery-grid">
          ${posts.map((post, index) => {
            // 노션에서 가져온 이미지 URL 사용, 없으면 플레이스홀더
            const imageSrc = post.image || null;
            
            return `
            <div
              class="gallery-item"
              data-story-id="${post.notionId || post.id}"
              data-story-index="${index}"
            >
              <div class="gallery-item-image-container">
                <div class="gallery-item-front">
                  <div class="gallery-item-image">
                    ${imageSrc ? `
                      <img 
                        src="${imageSrc}" 
                        alt="${post.title}"
                        loading="lazy"
                        decoding="async"
                      />
                      <div class="gallery-item-overlay"></div>
                    ` : `
                      <div class="gallery-item-placeholder">
                        <div class="gallery-placeholder-icon">
                          ${placeholderIconSvg}
                        </div>
                      </div>
                      <div class="gallery-item-overlay"></div>
                    `}
                  </div>
                </div>
                <div class="gallery-item-back">
                  <div class="gallery-item-title-date">
                    <div class="gallery-item-date">${post.publishDate}</div>
                  </div>
                  <div class="gallery-item-source">${post.subtitle || ''}</div>
                </div>
              </div>
              <div class="gallery-item-title">${post.title}</div>
            </div>
          `;
          }).join('')}
        </div>
      </main>
    </div>
  `;

  /* 뒤로가기: 홈(Timeline)으로 이동 */
  mainContent.querySelector('.btn--back')?.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('/');
  });

  // 클릭 이벤트 리스너
  mainContent.querySelectorAll('.gallery-item[data-story-id]').forEach(item => {
    item.addEventListener('click', () => {
      const storyId = item.getAttribute('data-story-id');
      router.navigate(`/story/${storyId}`);
    });
  });
}

