/**
 * Business 페이지 (협업/문의 안내용 정적 페이지)
 * 컨텐츠는 src/data/businessContent.js에서 관리됩니다.
 */

import './Business.css';
import { businessContent } from '../../data/businessContent.js';

export async function renderBusiness() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const { title, subtitle, sections, contactEmail } = businessContent;

  mainContent.innerHTML = `
    <div class="business-page">
      <div class="business-container">
        <header class="business-header">
          <h1 class="business-title">${title}</h1>
          ${subtitle ? `<p class="business-subtitle">${subtitle}</p>` : ''}
        </header>
        <div class="business-sections">
          ${sections
            .map(
              (section) => `
            <section class="business-section">
              <h2 class="business-section__heading">${section.heading}</h2>
              <p class="business-section__body">${section.body}</p>
            </section>
          `
            )
            .join('\n')}
          ${
            contactEmail
              ? `
            <section class="business-section">
              <a class="business-email" href="mailto:${contactEmail}">${contactEmail}</a>
            </section>
          `
              : ''
          }
        </div>
      </div>
    </div>
  `;
}
