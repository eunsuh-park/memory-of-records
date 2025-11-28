/**
 * Home 페이지 (랜딩 페이지)
 * 메인 페이지입니다.
 * - 제목
 * - 소개
 */
import './Home.css';

function Home() {
  return (
    <div className="home-page">
      <main className="home-main">
        {/* 메인 제목 영역 */}
        <section className="hero-section">
          <h1 className="main-title">Memory of Records</h1>
          <p className="subtitle">과거의 기록을 현재로 가져오기</p>
          <p className="description">
            저의 과거 노트들을 디지털로 기록하여 보존하고 공유합니다.
            <br />
            시기별, 연도별로 정리된 노트를 탐색해보세요.
          </p>
        </section>

        {/* 추가 소개 섹션 - 추후 수정 가능 */}
        <section className="intro-section">
          <h2>이 프로젝트에 대해</h2>
          <p>
            이 웹사이트는 오래된 노트들을 디지털화하여 보존하고,
            시간 순서대로 정리하여 쉽게 탐색할 수 있도록 만든 프로젝트입니다.
          </p>
        </section>
      </main>
    </div>
  );
}

export default Home;

