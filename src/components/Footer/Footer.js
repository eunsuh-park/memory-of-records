/**
 * Footer
 * 모든 페이지 하단에 표시되는 푸터입니다.
 */

import './Footer.css';

const BASE_URL = import.meta.env.BASE_URL || '/';

function hrefFor(path) {
  return BASE_URL === '/' ? path : `${BASE_URL.slice(0, -1)}${path}`;
}

export function renderFooter() {
  const container = document.getElementById('footer');
  if (!container) return;

  container.innerHTML = `
    <footer>
      <div class="footer-container">
        <p>
          © 2026 Memory of Records. PES All rights reserved.
          <a class="footer-lab-link" href="${hrefFor('/ui-lab')}" data-link>UI Lab</a>
        </p>
      </div>
    </footer>
  `;
}
