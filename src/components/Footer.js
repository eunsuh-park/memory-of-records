/**
 * Footer 컴포넌트
 * 모든 페이지 하단에 표시되는 푸터입니다.
 */

import '../components/Footer.css';

export function renderFooter() {
  const container = document.getElementById('footer');
  if (!container) return;

  container.innerHTML = `
    <footer>
      <div class="footer-container">
        <p>© 2026 Memory of Records. PES All rights reserved.</p>
      </div>
    </footer>
  `;
}

