/**
 * Story (블로그) 데이터 구조
 * 블로그 스타일의 글들을 저장합니다.
 */

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
 * @param {number} id - 포스트 ID
 * @returns {Object|null} 포스트 객체 또는 null
 */
export const getStoryById = (id) => {
  return storyPosts.find(post => post.id === parseInt(id)) || null;
};

/**
 * 이전/다음 스토리 포스트를 찾는 함수
 * @param {number} id - 현재 포스트 ID
 * @returns {Object} { prev: 이전 포스트 또는 null, next: 다음 포스트 또는 null }
 */
export const getAdjacentStories = (id) => {
  const currentIndex = storyPosts.findIndex(post => post.id === parseInt(id));
  
  if (currentIndex === -1) {
    return { prev: null, next: null };
  }
  
  return {
    prev: currentIndex > 0 ? storyPosts[currentIndex - 1] : null,
    next: currentIndex < storyPosts.length - 1 ? storyPosts[currentIndex + 1] : null
  };
};

