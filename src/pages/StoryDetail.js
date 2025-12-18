/**
 * StoryDetail 페이지
 */

import { router } from '../router.js';
import './StoryDetail.css';
import { fetchNotionPageContent, convertNotionBlocksToHTML, getStoryById, getAdjacentStories, loadNotionPosts } from '../utils/notion.js';
import image1 from '../assets/KakaoTalk_20251216_202813467_01.jpg';
import image2 from '../assets/KakaoTalk_20251216_202813467_02.jpg';
import image3 from '../assets/KakaoTalk_20251216_204415732_01.jpg';
import image4 from '../assets/KakaoTalk_20251216_204415732_02.jpg';
import image5 from '../assets/KakaoTalk_20251216_204415732_03.jpg';

export async function renderStoryDetail(id, skipAnimation = false) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  // 상세 페이지 클래스 추가 (네비게이션 숨김용)
  document.body.classList.add('story-detail-page-active');

  console.log('StoryDetail 렌더링 시작, ID:', id);

  // 노션 데이터 로드 (캐시에 없을 경우)
  await loadNotionPosts();

  const post = getStoryById(id);
  console.log('찾은 포스트:', post);
  
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

  // 노션에서 페이지 내용 가져오기 (노션 ID가 있는 경우)
  let contentHTML = post.content || '';
  let imageSrc = post.image || null;
  
  if (post.notionId) {
    try {
      console.log('노션 페이지 내용 가져오기 시작, ID:', post.notionId);
      const blocks = await fetchNotionPageContent(post.notionId);
      console.log('가져온 블록 개수:', blocks?.length || 0);
      
      if (blocks && blocks.length > 0) {
        // PC에서는 왼쪽에 이미지가 있으므로 오른쪽 콘텐츠에서는 이미지 제외
        contentHTML = convertNotionBlocksToHTML(blocks, true);
        console.log('변환된 HTML 길이:', contentHTML.length);
        
        // 노션 페이지에서 이미지 추출 (이미지가 속성에 없는 경우)
        if (!imageSrc) {
          const { extractFirstImageFromBlocks } = await import('../utils/notion.js');
          const extractedImage = extractFirstImageFromBlocks(blocks);
          if (extractedImage) {
            imageSrc = extractedImage;
            console.log('추출된 이미지:', extractedImage);
          }
        }
      }
    } catch (error) {
      console.error('노션 페이지 내용 가져오기 실패:', error);
      console.error('에러 상세:', error.message, error.stack);
      // 기존 content 사용
      contentHTML = post.content || '';
    }
  }

  // 이미지 할당: 노션 이미지 우선, 없으면 기존 로직 사용
  if (!imageSrc) {
    // 기존 이미지 매핑 (폴백)
    if (post.id === 1 || post.id === '1') {
      imageSrc = image1;
    } else if (post.id === 2 || post.id === '2') {
      imageSrc = image2;
    } else if (post.id === 3 || post.id === '3') {
      imageSrc = image3;
    } else if (post.id === 4 || post.id === '4') {
      imageSrc = image4;
    } else if (post.id === 5 || post.id === '5') {
      imageSrc = image5;
    }
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

  mainContent.innerHTML = `
    <main class="story-detail-main">
      <div class="story-book">
        <div class="story-book-side-L"></div>
        <div class="story-book-content">
          <div class="story-book-content-L">
            <div class="story-image-container">
              <div class="story-detail-image">
                ${imageSrc ? `
                  <div class="story-image-loading">
                    <div class="gallery-placeholder-icon">
                      ${placeholderIconSvg}
                    </div>
                  </div>
                  <img 
                    src="${imageSrc}" 
                    alt="${post.title}"
                    loading="eager"
                    class="story-detail-img"
                    style="opacity: 0; transition: opacity 0.3s ease;"
                  />
                ` : `
                  <div class="story-placeholder-image">
                    <div class="gallery-placeholder-icon">
                      ${placeholderIconSvg}
                    </div>
                  </div>
                `}
              </div>
            </div>
          </div>
          <div class="story-book-content-R">
            <button class="story-back-button" aria-label="Story 목록으로 돌아가기">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>

            <div class="story-detail-header">
              <h1 class="story-detail-title">${post.title}</h1>
              ${post.subtitle ? `
                <div class="story-detail-subtitle">${post.subtitle}</div>
              ` : ''}
              <div class="story-detail-date">${post.publishDate}</div>
            </div>

            <div class="story-detail-content">
              ${contentHTML || (post.content ? post.content.split('\n').map(paragraph => 
                paragraph ? `<p>${paragraph}</p>` : '<br>'
              ).join('') : '<p>내용이 없습니다.</p>')}
            </div>
          </div>
        </div>
        <div class="story-book-side-R"></div>
      </div>
    </main>
  `;

  // 이미지 로딩 이벤트 리스너 추가
  const storyDetailImg = mainContent.querySelector('.story-detail-img');
  if (storyDetailImg) {
    const imageLoading = mainContent.querySelector('.story-image-loading');
    
    storyDetailImg.addEventListener('load', () => {
      storyDetailImg.style.opacity = '1';
      if (imageLoading) {
        imageLoading.remove();
      }
    });
    
    storyDetailImg.addEventListener('error', () => {
      if (imageLoading) {
        imageLoading.remove();
      }
      const storyDetailImage = storyDetailImg.parentElement;
      storyDetailImage.innerHTML = `
        <div class="story-placeholder-image">
          <div class="gallery-placeholder-icon">
            ${placeholderIconSvg}
          </div>
        </div>
      `;
    });
  }

  // 슬라이드 인 애니메이션 시작 (skipAnimation이 false일 때만)
  const storyBook = mainContent.querySelector('.story-book');
  if (storyBook) {
    if (skipAnimation) {
      // 애니메이션 없이 바로 표시
      storyBook.classList.add('slide-in');
    } else {
      // 약간의 지연 후 애니메이션 시작 (리플로우 보장)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          storyBook.classList.add('slide-in');
        });
      });
    }
  }

  // 뒤로가기 함수 (애니메이션 포함)
  const goBack = () => {
    const storyBook = mainContent.querySelector('.story-book');
    if (storyBook) {
      // 리플로우 보장을 위해 requestAnimationFrame 사용
      requestAnimationFrame(() => {
        storyBook.classList.remove('slide-in');
        requestAnimationFrame(() => {
          storyBook.classList.add('slide-out');
          // 애니메이션 완료 후 네비게이션
          setTimeout(() => {
            router.navigate('/story');
          }, 350); // CSS transition 시간과 동일 (0.35s)
        });
      });
    } else {
      router.navigate('/story');
    }
  };

  // 이벤트 리스너
  const backButton = mainContent.querySelector('.story-back-button');
  if (backButton) {
    backButton.addEventListener('click', (e) => {
      e.stopPropagation(); // 오른쪽 페이지 클릭 이벤트 전파 방지
      goBack();
    });
  }

  // 책 바깥 클릭 시 뒤로가기
  const storyDetailMain = mainContent.querySelector('.story-detail-main');
  if (storyDetailMain) {
    storyDetailMain.addEventListener('click', (e) => {
      // story-book 내부 클릭은 무시
      if (e.target.closest('.story-book')) {
        return;
      }
      // 책 바깥 클릭 시 뒤로가기
      goBack();
    });
  }

  // 스낵바 표시 함수
  function showSnackbar(message) {
    // 기존 스낵바가 있으면 제거
    const existingSnackbar = document.querySelector('.story-snackbar');
    if (existingSnackbar) {
      existingSnackbar.remove();
    }

    // 스낵바 생성
    const snackbar = document.createElement('div');
    snackbar.className = 'story-snackbar';
    snackbar.textContent = message;
    document.body.appendChild(snackbar);

    // 애니메이션을 위해 약간의 지연 후 표시
    setTimeout(() => {
      snackbar.classList.add('show');
    }, 10);

    // 3초 후 자동 제거
    setTimeout(() => {
      snackbar.classList.remove('show');
      setTimeout(() => {
        snackbar.remove();
      }, 300);
    }, 3000);
  }

  // 왼쪽 페이지 클릭 시 이전 페이지로 이동 또는 안내
  const leftPage = mainContent.querySelector('.story-book-content-L');
  if (leftPage) {
    if (prev) {
      leftPage.style.cursor = 'pointer';
      leftPage.addEventListener('click', () => {
        // 애니메이션 없이 바로 전환
        const prevId = prev.notionId || prev.id;
        window.history.pushState({}, '', `/story/${prevId}`);
        renderStoryDetail(prevId, true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } else {
      // 첫 페이지일 때는 클릭 비활성화 및 스낵바 표시
      leftPage.style.cursor = 'not-allowed';
      leftPage.addEventListener('click', (e) => {
        e.stopPropagation();
        showSnackbar('첫 페이지입니다');
      });
    }
  }

  // 이전/다음 포스트 이미지 preloading
  if (prev && prev.image) {
    const prevImg = new Image();
    prevImg.src = prev.image;
  }
  if (next && next.image) {
    const nextImg = new Image();
    nextImg.src = next.image;
  }

  // 오른쪽 페이지 클릭 시 다음 페이지로 이동 또는 안내
  const rightPage = mainContent.querySelector('.story-book-content-R');
  if (rightPage) {
    // 그라데이션 높이를 실제 스크롤 높이에 맞춤
    const updateGradientHeight = () => {
      const scrollHeight = rightPage.scrollHeight;
      rightPage.style.setProperty('--content-scroll-height', `${scrollHeight}px`);
    };
    
    // 초기 설정
    updateGradientHeight();
    
    // 콘텐츠가 동적으로 로드될 수 있으므로 약간의 지연 후 다시 계산
    setTimeout(updateGradientHeight, 100);
    
    // 리사이즈 이벤트 리스너 추가
    const resizeObserver = new ResizeObserver(() => {
      updateGradientHeight();
    });
    resizeObserver.observe(rightPage);
    
    if (next) {
      rightPage.style.cursor = 'pointer';
      rightPage.addEventListener('click', () => {
        // 애니메이션 없이 바로 전환
        const nextId = next.notionId || next.id;
        window.history.pushState({}, '', `/story/${nextId}`);
        renderStoryDetail(nextId, true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    } else {
      // 마지막 페이지일 때는 클릭 비활성화 및 스낵바 표시
      rightPage.style.cursor = 'not-allowed';
      rightPage.addEventListener('click', (e) => {
        e.stopPropagation();
        showSnackbar('마지막 페이지입니다');
      });
    }
  }
}

