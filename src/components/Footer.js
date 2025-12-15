/**
 * Footer 컴포넌트
 * 모든 페이지 하단에 표시되는 푸터입니다.
 */

import '../components/Footer.css';

export function renderFooter() {
  const container = document.getElementById('footer');
  if (!container) return;

  container.innerHTML = `
    <footer class="footer">
      <div class="footer-container">
        <p>© 2024 Memory of Records. All rights reserved.</p>
        <p class="footer-subtitle">과거의 기록을 현재로 가져오기</p>
      </div>
    </footer>
  `;
}

