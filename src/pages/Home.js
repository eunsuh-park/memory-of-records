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
          <p class="home-intro">Hello, I have narcolepsy. Analog Records throughout my life help me keep awake.</p>
          <p class="home-intro">I want to share my overcoming-stories struggling in my sleepness.</p>
        </section>
      </main>
    </div>
  `;
}

