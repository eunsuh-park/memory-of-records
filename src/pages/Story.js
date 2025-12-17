/**
 * Story 페이지 (Gallery 형식)
 */

import { router } from '../router.js';
import './Story.css';
import { fetchNotionPages, convertNotionPageToStoryPost } from '../utils/notion.js';

export async function renderStory() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  // 로딩 상태 표시
  mainContent.innerHTML = `
    <div class="story-page">
      <main class="story-main">
        <div class="gallery-grid">
          <div style="text-align: center; padding: 2rem;">로딩 중...</div>
        </div>
      </main>
    </div>
  `;

  // 노션 데이터 가져오기
  let notionPosts = [];
  try {
    console.log('노션 데이터 가져오기 시작...');
    const notionPages = await fetchNotionPages();
    console.log('가져온 노션 페이지:', notionPages);
    
    if (notionPages && notionPages.length > 0) {
      console.log('노션 페이지 변환 시작...');
      notionPosts = notionPages.map(page => {
        const post = convertNotionPageToStoryPost(page);
        console.log('변환된 포스트:', post);
        return post;
      });
      
      console.log('변환된 노션 포스트 개수:', notionPosts.length);
      
      // 노션 페이지에서 이미지 추출 (페이지 내용 가져오기)
      const { fetchNotionPageContent, extractFirstImageFromBlocks } = await import('../utils/notion.js');
      for (let i = 0; i < notionPosts.length; i++) {
        if (!notionPosts[i].image && notionPosts[i].notionId) {
          try {
            const blocks = await fetchNotionPageContent(notionPosts[i].notionId);
            const imageUrl = extractFirstImageFromBlocks(blocks);
            if (imageUrl) {
              notionPosts[i].image = imageUrl;
              console.log(`이미지 추출 성공 (${notionPosts[i].title}):`, imageUrl);
            }
          } catch (error) {
            console.warn(`이미지 추출 실패 (${notionPosts[i].notionId}):`, error);
          }
        }
      }
    } else {
      console.warn('노션 페이지가 없습니다.');
    }
  } catch (error) {
    console.error('노션 데이터 로딩 실패:', error);
    console.error('에러 스택:', error.stack);
  }

  console.log('최종 노션 포스트:', notionPosts);
  
  // 노션 데이터만 사용
  const posts = notionPosts;
  console.log('최종 포스트 목록:', posts);

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

  // 클릭 이벤트 리스너
  mainContent.querySelectorAll('.gallery-item[data-story-id]').forEach(item => {
    item.addEventListener('click', () => {
      const storyId = item.getAttribute('data-story-id');
      router.navigate(`/story/${storyId}`);
    });
  });
}

