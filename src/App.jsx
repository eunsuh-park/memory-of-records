/**
 * App 컴포넌트
 * 메인 애플리케이션 컴포넌트입니다.
 * React Router를 사용하여 페이지 간 라우팅을 설정합니다.
 */
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TopNavigation from './components/TopNavigation';
import Footer from './components/Footer';
import Home from './pages/Home';
import Timeline from './pages/Timeline';
import Year from './pages/Year';
import Story from './pages/Story';
import StoryDetail from './pages/StoryDetail';
import NoteDetailPage from './pages/NoteDetailPage';
import './App.css';

function App() {
  return (
    <Router>
      {/* 전체 애플리케이션 구조 */}
      <div className="app">
        {/* 상단 네비게이션 - 모든 페이지에 표시 */}
        <TopNavigation />
        
        {/* 메인 콘텐츠 영역 */}
        <main className="app-main">
          <Routes>
            {/* 홈 페이지 (랜딩 페이지) */}
            <Route path="/" element={<Home />} />
            
            {/* Timeline 페이지 - 시기별 노트 */}
            {/* /timeline 또는 /timeline/:period 형태로 접근 가능 */}
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/timeline/:period" element={<Timeline />} />
            
            {/* Year 페이지 - 연도별 노트 */}
            {/* /year (Overview) 또는 /year/:year 형태로 접근 가능 */}
            <Route path="/year" element={<Year />} />
            <Route path="/year/:year" element={<Year />} />
            
            {/* Story 페이지 - 블로그 리스트 */}
            <Route path="/story" element={<Story />} />
            
            {/* StoryDetail 페이지 - 블로그 상세 */}
            <Route path="/story/:id" element={<StoryDetail />} />
            
            {/* NoteDetailPage - 노트 상세 */}
            <Route path="/note/:id" element={<NoteDetailPage />} />
            
            {/* 404 페이지 - 정의되지 않은 경로 */}
            <Route 
              path="*" 
              element={
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                  <h1>404 - 페이지를 찾을 수 없습니다</h1>
                  <p>요청하신 페이지가 존재하지 않습니다.</p>
                </div>
              } 
            />
          </Routes>
        </main>
        
        {/* 하단 푸터 - 모든 페이지에 표시 */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;
