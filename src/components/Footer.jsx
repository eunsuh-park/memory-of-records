/**
 * Footer 컴포넌트
 * 모든 페이지 하단에 표시되는 푸터입니다.
 * - 저작권 정보
 * - 기타 정보
 */
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* 푸터 내용 - 추후 수정 가능 */}
        <p>© 2024 Memory of Records. All rights reserved.</p>
        <p className="footer-subtitle">과거의 기록을 현재로 가져오기</p>
      </div>
    </footer>
  );
}

export default Footer;

