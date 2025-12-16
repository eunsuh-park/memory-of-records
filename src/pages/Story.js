/**
 * Story 페이지 (Gallery 형식)
 */

import { storyPosts } from '../data/storyData.js';
import { router } from '../router.js';
import './Story.css';
import image1 from '../assets/KakaoTalk_20251216_202813467_01.jpg';
import image2 from '../assets/KakaoTalk_20251216_202813467_02.jpg';
import image3 from '../assets/KakaoTalk_20251216_204415732_01.jpg';
import image4 from '../assets/KakaoTalk_20251216_204415732_02.jpg';
import image5 from '../assets/KakaoTalk_20251216_204415732_03.jpg';

export function renderStory() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

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
    <div class="story-page">
      <main class="story-main">
        <div class="gallery-grid">
          ${storyPosts.map((post, index) => {
            // 각 포스트에 순서대로 이미지 할당
            let imageSrc = null;
            if (post.id === 1) {
              imageSrc = image1;
            } else if (post.id === 2) {
              imageSrc = image2;
            } else if (post.id === 3) {
              imageSrc = image3;
            } else if (post.id === 4) {
              imageSrc = image4;
            } else if (post.id === 5) {
              imageSrc = image5;
            }
            
            return `
            <div
              class="gallery-item"
              data-story-id="${post.id}"
            >
              <div class="gallery-item-image-container">
                <div class="gallery-item-front">
                  <div class="gallery-item-image">
                    ${imageSrc ? `
                      <img src="${imageSrc}" alt="${post.title}" />
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
                  <div class="gallery-item-source">${post.subtitle}</div>
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

