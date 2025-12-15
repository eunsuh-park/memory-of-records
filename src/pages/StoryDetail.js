/**
 * StoryDetail 페이지
 */

import { getStoryById, getAdjacentStories } from '../data/storyData.js';
import { router } from '../router.js';
import './StoryDetail.css';

export function renderStoryDetail(id) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const post = getStoryById(id);
  
  if (!post) {
    mainContent.innerHTML = `
      <div class="story-detail-page">
        <div class="story-error">
          <p>포스트를 찾을 수 없습니다.</p>
          <a href="/story" data-link>Story 목록으로 돌아가기</a>
        </div>
      </div>
    `;
    return;
  }

  const { prev, next } = getAdjacentStories(id);

  const placeholderIconSvg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>
      <title>pic_2_fill</title>
      <g id="pic_2_fill" fill='none'>
        <path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/>
        <path fill='#D8D8D8FF' d='M20 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2H4v14h.929l9.308-9.308a1.25 1.25 0 0 1 1.768 0L20 13.686zM7.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3'/>
      </g>
    </svg>
  `;

  mainContent.innerHTML = `
    <article class="story-detail-page">
      <div class="story-detail-container">
        <div class="story-detail-header-section">
          <button class="story-back-button" aria-label="Story 목록으로 돌아가기">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div class="story-detail-header">
            <h1 class="story-detail-title">${post.title}</h1>
            <div class="story-detail-title-date">${post.publishDate}</div>
          </div>
        </div>

        <div class="story-image-container">
          ${prev ? `
            <button class="story-nav-btn story-prev-btn" aria-label="Previous story">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          ` : '<div class="story-nav-btn-placeholder"></div>'}
          
          <div class="story-detail-image">
            ${post.image ? `
              <img src="${post.image}" alt="${post.title}" />
            ` : `
              <div class="story-placeholder-image">
                <div class="gallery-placeholder-icon">
                  ${placeholderIconSvg}
                </div>
              </div>
            `}
          </div>
          
          ${next ? `
            <button class="story-nav-btn story-next-btn" aria-label="Next story">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          ` : '<div class="story-nav-btn-placeholder"></div>'}
        </div>

        ${post.subtitle ? `
          <div class="story-detail-meta">
            <div class="story-detail-source">${post.subtitle}</div>
          </div>
        ` : ''}

        <div class="story-detail-content">
          ${post.content.split('\n').map(paragraph => 
            paragraph ? `<p>${paragraph}</p>` : '<br>'
          ).join('')}
        </div>
      </div>
    </article>
  `;

  // 이벤트 리스너
  const backButton = mainContent.querySelector('.story-back-button');
  if (backButton) {
    backButton.addEventListener('click', () => {
      router.navigate('/story');
    });
  }

  const prevButton = mainContent.querySelector('.story-prev-btn');
  if (prevButton && prev) {
    prevButton.addEventListener('click', () => {
      router.navigate(`/story/${prev.id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const nextButton = mainContent.querySelector('.story-next-btn');
  if (nextButton && next) {
    nextButton.addEventListener('click', () => {
      router.navigate(`/story/${next.id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

