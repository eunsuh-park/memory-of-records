/**
 * Story 페이지 (책형 레이아웃 단일 페이지)
 * - HTML 구조는 아래 주석 참고하여 하드코딩
 */

import { router } from '../../router.js';
import './Story.css';
import { render as renderButton } from '../../components/Button/Button.js';

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

  document.body.classList.add('story-page-active');

  /* ============================================================
   * HTML 구조 - 여기를 하드코딩으로 수정
   * - 이미지: .story-image 안에 <img> 또는 .story-placeholder-image
   * - 제목/부제목/날짜: .story-header 안
   * - 본문: .story-content 안
   * - 이미지 경로는 src/assets 에 넣고 경로 수정
   ============================================================ */

  const imageSrc = null; // TODO: 예) import myImage from '../../assets/your-image.jpg';
  const title = 'Introduction'; // TODO: 하드코딩
  const subtitle = `Memory of Records은<br>제 창작의 씨앗인 아날로그 기록들을<br>아카이브하는 공간입니다.`;   // TODO: 하드코딩 (없으면 빈 문자열)
  const publishDate = '2026.3.9'; // TODO: 예) '2025.01.01'
  const contentHTML = '<p>본문 내용을 여기에 작성하세요.</p>'; // TODO: HTML 하드코딩

  mainContent.innerHTML = `
    ${renderButton({ variant: 'back', ariaLabel: '이전 페이지로 돌아가기' })}
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
              <div class="story-date">${publishDate}</div>
            </div>
            <div class="story-content">
            <div class="story-caption">
              <p>
                <small>
                  현재까지 웹사이트에 공개된 68권의 노트는<br>
                  2005년부터 지금까지 실제로 사용하고 보관 중인 노트들입니다.<br>
                  이 웹사이트는 100% 창작물이며, 바이브코딩으로 직접 제작하였습니다.<br>
                  모든 사진과 글의 저작권은 저에게 있으며, 허가 없는 개인 및 상업적 이용은 불가합니다.
                </small>
              </p>
            </div>
              <p>
                이 웹사이트는 제가 애착을 가지고 정성껏 사용해온 노트들을 추억하기 위해 만든 공간입니다.<br>
                또한 아날로그 레코드의 미학(Aesthetics)적인 감성을 웹 디자인에 녹여내고자 했습니다.
              </p>
              <h3>그밖에 주제</h3>
              <ul>
                <li>기록하는 행위</li>
                <li>생산성 도구</li>  
                <li>개인적인 역사</li>
              </ul>
              <p>
                저처럼 창작자로 태어났지만 그 열정과 즐거움을 잊어가는 사람,<br>
                비범한 자신의 인생을 전시하는 개성있는 방식을 찾아보고 있는 사람,<br>
                모종의 이유로 지난 인생을 가만히 돌아보는 중인 사람,<br>
                그저 과거에 대한 향수를 가지고, 그 시절의 추억을 타인과 나누고 싶은 사람—
              </p>
              <p>어떤 목적으로 이곳에 방문하셨든지 환영합니다.</p>
              <p>
                이곳에서 부디 일상의 작은 즐거움, 기록에 대한 인사이트를 발견한다면 좋겠습니다.<br>
                <small>(*그냥 잠깐 둘러보고 나가셔도 좋습니다!)</small>
              </p>
              <p>읽어주셔서 감사합니다.</p>
            </div>
          </div>
        </div>
        <!-- [오른쪽 책등] -->
        <div class="story-book-side-R"></div>
      </div>
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
