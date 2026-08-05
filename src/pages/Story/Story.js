/**
 * Story 페이지 (책형 레이아웃 단일 페이지)
 * 컨텐츠는 src/data/storyContent.js에서 관리됩니다.
 */

import { router } from '../../router.js';
import './Story.css';
import '../../components/Footer/Footer.css';
import { render as renderButton } from '../../components/Button/Button.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import { storyContent } from '../../data/storyContent.js';

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
                    <div class="gallery-placeholder-icon">${MINGCUTE.pic2Fill}</div>
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
