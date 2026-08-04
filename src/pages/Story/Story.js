/**
 * Story 페이지 (책형 레이아웃 단일 페이지)
 * 컨텐츠는 src/data/storyContent.js에서 관리됩니다.
 */

import { router } from '../../router.js';
import './Story.css';
import '../../components/Footer/Footer.css';
import { render as renderButton } from '../../components/Button/Button.js';
import { storyContent } from '../../data/storyContent.js';

/* ========== 이미지 플레이스홀더 SVG (이미지 없을 때 표시) ========== */
const placeholderIconSvg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>
    <title>pic_2_fill</title>
    <g id="pic_2_fill" fill='none'>
      <path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/>
      <path fill='#D8D8D8FF' d='M20 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2H4v14h.929l9.308-9.308a1.25 1.25 0 0 1 1.768 0L20 13.686zM7.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3'/>
    </g>
  </svg>
`;

export async function renderStory() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  document.documentElement.classList.add('story-page-active');
  document.body.classList.add('story-page-active');

  // 컨텐츠 데이터 가져오기
  const { imageSrc, title, subtitle, caption, content, footer } = storyContent;

  mainContent.innerHTML = `
    ${renderButton({ shape: 'circle', size: 'm', role: 'back', ariaLabel: '이전 페이지로 돌아가기' })}
    <main class="story-main">
      <div class="story-book">
        <div class="story-book-side-L"></div>
        <div class="story-book-content">
          <div class="story-book-content-L">
            <div class="story-image-container">
              <div class="story-image">
                ${imageSrc ? `
                  <img 
                    src="${imageSrc}" 
                    alt="${title}"
                    loading="eager"
                    class="story-img"
                  />
                ` : `
                  <div class="story-placeholder-image">
                    <div class="gallery-placeholder-icon">${placeholderIconSvg}</div>
                  </div>
                `}
              </div>
            </div>
          </div>
          <div class="story-book-content-R">
            <div class="story-header">
              <h1 class="story-title">${title}</h1>
              ${subtitle ? `<div class="story-subtitle">${subtitle}</div>` : ''}
            </div>
            <div class="story-content">
              ${caption ? `
              <div class="story-caption">
                <p>
                  <small>${caption}</small>
                </p>
              </div>
              ` : ''}
              ${content.map(paragraph => `<p>${paragraph}</p>`).join('\n              ')}
            </div>
          </div>
        </div>
        <!-- [오른쪽 책등] -->
        <div class="story-book-side-R"></div>
      </div>
      <footer class="story-footer">
        <div class="footer-container">
          <p>${footer}</p>
        </div>
      </footer>
    </main>
  `;

  // 슬라이드 인 애니메이션
  const storyBook = mainContent.querySelector('.story-book');
  if (storyBook) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => storyBook.classList.add('slide-in'));
    });
  }

  const goBack = () => {
    const book = mainContent.querySelector('.story-book');
    if (book) {
      requestAnimationFrame(() => {
        book.classList.remove('slide-in');
        requestAnimationFrame(() => {
          book.classList.add('slide-out');
          setTimeout(() => router.navigate('/'), 350);
        });
      });
    } else {
      router.navigate('/');
    }
  };

  mainContent.querySelector('.btn--back')?.addEventListener('click', (e) => {
    e.stopPropagation();
    goBack();
  });
  mainContent.querySelector('.btn--back-inline')?.addEventListener('click', (e) => {
    e.stopPropagation();
    goBack();
  });

  // 책 바깥 클릭 시 홈으로
  const storyMain = mainContent.querySelector('.story-main');
  if (storyMain) {
    storyMain.addEventListener('click', (e) => {
      if (e.target.closest('.story-book')) return;
      goBack();
    });
  }
}
