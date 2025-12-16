/**
 * Home 페이지 (랜딩 페이지)
 */

import './Home.css';
import logo from '../logo.png';

export function renderHome() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="home-page">
      <main class="home-main">
        <section class="hero-section">
          <img src="${logo}" alt="Memory of Records" class="home-logo" />
        </section>
      </main>
    </div>
  `;
}

