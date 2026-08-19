/**
 * Story 페이지 (카드 레이아웃)
 * 컨텐츠는 src/data/storyContent.js에서 관리됩니다.
 */

import './Story.css';
import { storyContent } from '../../data/storyContent.js';

export async function renderStory() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const { imageSrc, title, subtitle, caption, content, footer } = storyContent;

  mainContent.innerHTML = `
    <div class="story-page">
      <article class="story-card">
        <div class="story-card__body">
          <header class="story-header">
            ${subtitle ? `<div class="story-subtitle">${subtitle}</div>` : ''}
          </header>
          ${
            caption
              ? `
            <div class="story-caption">
              <p><small>${caption}</small></p>
            </div>
          `
              : ''
          }
          ${
            Array.isArray(content) && content.length
              ? `
          <div class="story-content">
            ${content.map((paragraph) => `<p>${paragraph}</p>`).join('\n            ')}
          </div>`
              : ''
          }
        </div>
        ${
          imageSrc
            ? `
        <div class="story-card__media">
          <img
            src="${imageSrc}"
            alt="${title}"
            loading="eager"
            class="story-card__img"
          />
        </div>`
            : ''
        }
      </article>
      <footer class="story-footer">
        <p>${footer}</p>
      </footer>
    </div>
  `;
}
