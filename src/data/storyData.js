/**
 * Story (블로그) 데이터 구조
 * 노션 DB에서 데이터를 가져오며, 폴백으로 사용되는 정적 데이터입니다.
 */

// 노션 데이터 캐시
let notionPostsCache = null;

/**
 * 노션 데이터를 가져와서 캐시에 저장
 */
export async function loadNotionPosts() {
  try {
    const { fetchNotionPages, convertNotionPageToStoryPost } = await import('../utils/notion.js');
    const notionPages = await fetchNotionPages();
    if (notionPages && notionPages.length > 0) {
      notionPostsCache = notionPages.map(page => convertNotionPageToStoryPost(page));
      return notionPostsCache;
    }
  } catch (error) {
    console.error('노션 데이터 로딩 실패:', error);
  }
  return null;
}

/**
 * 현재 사용 가능한 포스트 목록 반환 (노션 우선, 없으면 정적 데이터)
 */
export function getStoryPosts() {
  return notionPostsCache || storyPosts;
}

// 정적 데이터 (폴백용)
export const storyPosts = [
  {
    id: 1,
    title: "Project Background & Purpose",
    subtitle: "프로젝트 배경 및 목적",
    content: "이 프로젝트를 시작하게 된 배경과 목적에 대한 내용입니다. 추후 상세 내용이 추가될 예정입니다.",
    publishDate: "2024-01-01",
    preview: "프로젝트를 시작하게 된 배경과 목적을 설명합니다...",
    image: "KakaoTalk_20251216_202813467_01.jpg", // 첫 번째 이미지
  },
  {
    id: 2,
    title: "My Organization Rules for Old Notebooks",
    subtitle: "과거 노트 정리 원칙",
    content: "과거 노트들을 어떻게 정리하고 관리하는지에 대한 나만의 원칙들을 공유합니다.",
    publishDate: "2024-01-15",
    preview: "노트 정리를 위한 나만의 원칙들을 소개합니다...",
    image: "KakaoTalk_20251216_202813467_02.jpg", // 두 번째 이미지
  },
  {
    id: 3,
    title: "4 Reasons why I prefer Analog",
    subtitle: "아날로그 노트 선호 이유 4가지",
    content: "디지털 시대에도 여전히 아날로그 노트를 선호하는 이유 4가지를 설명합니다.",
    publishDate: "2024-02-01",
    preview: "아날로그 노트를 선호하는 이유를 4가지로 정리했습니다...",
  },
  {
    id: 4,
    title: "Next Step of My Recording",
    subtitle: "다음 기록 단계",
    content: "앞으로의 기록 방향과 다음 단계에 대한 계획을 공유합니다.",
    publishDate: "2024-02-15",
    preview: "앞으로의 기록 계획을 설명합니다...",
  },
  {
    id: 5,
    title: "What's in My Desk/Book Shelf to Record - Product Recommendation",
    subtitle: "내 책상/책장 속 기록용품 추천",
    content: "실제로 사용하는 기록용품들을 소개하고 추천합니다.",
    publishDate: "2024-03-01",
    preview: "실제 사용 중인 기록용품들을 추천합니다...",
  },
];

/**
 * ID로 특정 스토리 포스트를 찾는 함수
 * @param {string|number} id - 포스트 ID (노션 ID 또는 숫자 ID)
 * @returns {Object|null} 포스트 객체 또는 null
 */
export const getStoryById = (id) => {
  const posts = getStoryPosts();
  console.log('getStoryById 호출, ID:', id, '타입:', typeof id);
  console.log('사용 가능한 포스트:', posts.map(p => ({ id: p.id, notionId: p.notionId })));
  
  // 노션 ID로 먼저 찾기 (하이픈 포함 UUID)
  let post = posts.find(post => post.notionId === id);
  
  // 없으면 숫자 ID로 찾기
  if (!post) {
    const numId = parseInt(id);
    if (!isNaN(numId)) {
      post = posts.find(post => post.id === numId || post.id === id);
    } else {
      // 문자열 ID로 찾기
      post = posts.find(post => String(post.id) === String(id));
    }
  }
  
  console.log('찾은 포스트:', post);
  return post || null;
};

/**
 * 이전/다음 스토리 포스트를 찾는 함수
 * @param {string|number} id - 현재 포스트 ID (노션 ID 또는 숫자 ID)
 * @returns {Object} { prev: 이전 포스트 또는 null, next: 다음 포스트 또는 null }
 */
export const getAdjacentStories = (id) => {
  const posts = getStoryPosts();
  
  // 노션 ID로 먼저 찾기
  let currentIndex = posts.findIndex(post => post.notionId === id);
  
  // 없으면 숫자 ID로 찾기
  if (currentIndex === -1) {
    const numId = parseInt(id);
    if (!isNaN(numId)) {
      currentIndex = posts.findIndex(post => post.id === numId || post.id === id);
    } else {
      currentIndex = posts.findIndex(post => String(post.id) === String(id));
    }
  }
  
  console.log('getAdjacentStories, ID:', id, '인덱스:', currentIndex);
  
  if (currentIndex === -1) {
    return { prev: null, next: null };
  }
  
  return {
    prev: currentIndex > 0 ? posts[currentIndex - 1] : null,
    next: currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null
  };
};

