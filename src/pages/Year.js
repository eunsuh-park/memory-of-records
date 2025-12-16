/**
 * Year 페이지
 * 연도별 노트를 표시하는 페이지입니다.
 */

import { getNotesByYear, getAvailableYears } from '../data/notesData.js';
import { renderYearSideMenu } from '../components/YearSideMenu.js';
import { renderQuickScrollMenu } from '../components/QuickScrollMenu.js';
import { router } from '../router.js';
import './Year.css';
import image1 from '../assets/KakaoTalk_20251216_204415732_01.jpg';
import image2 from '../assets/KakaoTalk_20251216_204415732_02.jpg';
import image3 from '../assets/KakaoTalk_20251216_204415732_03.jpg';
import image4 from '../assets/KakaoTalk_20251216_204415732_04.jpg';
import image5 from '../assets/KakaoTalk_20251216_204415732.jpg';

export function renderYear(year = null) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const selectedYear = year;

  // 사이드 메뉴 렌더링
  mainContent.innerHTML = `
    <div class="year-page">
      <div class="year-container">
        <aside id="year-side-menu"></aside>
        <main class="year-main" id="year-main"></main>
      </div>
      <div id="quick-scroll-menu"></div>
    </div>
  `;

  renderYearSideMenu(selectedYear);

  const yearMain = document.getElementById('year-main');
  if (!yearMain) return;

  const availableYears = getAvailableYears();

  // 이미지 배열
  const images = [image1, image2, image3, image4, image5];
  let imageIndex = 0;
  const placeholderIconSvg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>
      <title>pic_2_fill</title>
      <g id="pic_2_fill" fill='none'>
        <path d='M24 0v24H0V0zM12.593 23.258l-.011.002-.071.035-.02.004-.014-.004-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01-.017.428.005.02.01.013.104.074.015.004.012-.004.104-.074.012-.016.004-.017-.017-.427c-.002-.01-.009-.017-.017-.018m.265-.113-.013.002-.185.093-.01.01-.003.011.018.43.005.012.008.007.201.093c.012.004.023 0 .029-.008l.004-.014-.034-.614c-.003-.012-.01-.02-.02-.022m-.715.002a.023.023 0 0 0-.027.006l-.006.014-.034.614c0 .012.007.02.017.024l.015-.002.201-.093.01-.008.004-.011.017-.43-.003-.012-.01-.01z'/>
        <path fill='#D8D8D8FF' d='M20 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2H4v14h.929l9.308-9.308a1.25 1.25 0 0 1 1.768 0L20 13.686zM7.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3'/>
      </g>
    </svg>
  `;

  // Overview 섹션
  yearMain.innerHTML = `
    <section id="overview" class="year-section">
      <div class="overview-content">
        <h1>Year Overview</h1>
        <p class="overview-description">
          연도별로 정리된 노트들을 탐색해보세요.
        </p>
        <div class="year-stats">
          ${availableYears.map(y => {
            const yearNotes = getNotesByYear(y);
            return `
              <a href="/year/${y}" class="year-stat-card" data-link>
                <h2>${y}년</h2>
                <p class="stat-count">${yearNotes.length}개의 노트</p>
              </a>
            `;
          }).join('')}
        </div>
      </div>
    </section>

    ${availableYears.map(y => {
      const yearNotes = getNotesByYear(y);
      return `
        <section id="year-${y}" class="year-section">
          <header class="year-header">
            <h1>${y}년</h1>
            <p class="year-note-count">${yearNotes.length}개의 노트</p>
          </header>

          ${yearNotes.length > 0 ? `
            <div class="gallery-grid">
              ${yearNotes.map(note => {
                const noteImage = images[imageIndex % images.length];
                imageIndex++;
                
                return `
                  <div class="gallery-item" data-note-id="${note.id}">
                    <div class="gallery-item-image-container">
                      <div class="gallery-item-front">
                        <div class="gallery-item-image">
                          ${noteImage ? `
                            <img src="${noteImage}" alt="${note.title}" />
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
                          <div class="gallery-item-date">${note.year}년</div>
                        </div>
                        <div class="gallery-item-source">${note.periodName}</div>
                      </div>
                    </div>
                    <div class="gallery-item-title">${note.title}</div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="no-notes">
              <p>이 연도에 해당하는 노트가 없습니다.</p>
            </div>
          `}
        </section>
      `;
    }).join('')}
  `;

  // 클릭 이벤트 리스너
  yearMain.querySelectorAll('.gallery-item[data-note-id]').forEach(item => {
    item.addEventListener('click', () => {
      const noteId = item.getAttribute('data-note-id');
      router.navigate(`/note/${noteId}`);
    });
  });

  // QuickScrollMenu 아이템 생성
  const quickScrollItems = [
    { id: 'overview', label: 'Overview' },
    ...availableYears.map(y => ({
      id: `year-${y}`,
      label: `${y}`
    }))
  ];

  renderQuickScrollMenu(quickScrollItems);

  // 선택된 연도로 스크롤
  setTimeout(() => {
    const targetId = selectedYear ? `year-${selectedYear}` : 'overview';
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const navHeight = 64;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navHeight;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, 100);
}

