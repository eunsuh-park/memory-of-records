/**
 * 노트 데이터 구조
 * 모든 시기별/연도별 노트는 이 데이터를 공유합니다.
 * 각 페이지에서는 이 데이터를 필터링하여 원하는 뷰로 표시합니다.
 */

// 노트 데이터 예시
export const notesData = [
  // 초등학교 시기 (2005-2010)
  {
    id: 1,
    title: "첫 번째 노트",
    period: "elementary",
    periodName: "Elementary School",
    year: 2005,
    content: "이것은 초등학교 시기의 노트입니다. 내용은 추후 추가될 예정입니다.",
    images: [], // 이미지 배열 (추후 추가)
  },
  {
    id: 2,
    title: "두 번째 노트",
    period: "elementary",
    periodName: "Elementary School",
    year: 2006,
    content: "초등학교 시기의 두 번째 노트입니다.",
    images: [],
  },
  
  // 중고등학교 시기 (2012-2016)
  {
    id: 3,
    title: "중학교 노트",
    period: "middle-high",
    periodName: "Middle & High School",
    year: 2012,
    content: "중학교 시기의 노트입니다.",
    images: [],
  },
  {
    id: 4,
    title: "고등학교 노트",
    period: "middle-high",
    periodName: "Middle & High School",
    year: 2015,
    content: "고등학교 시기의 노트입니다.",
    images: [],
  },
  
  // 대학교 시기 (2017-2022)
  {
    id: 5,
    title: "대학교 1학년 노트",
    period: "university",
    periodName: "University",
    year: 2017,
    content: "대학교 시기의 노트입니다.",
    images: [],
  },
  {
    id: 6,
    title: "대학교 졸업 프로젝트",
    period: "university",
    periodName: "University",
    year: 2022,
    content: "대학교 졸업 프로젝트 노트입니다.",
    images: [],
  },
  
  // 졸업 후 (2022-2024)
  {
    id: 7,
    title: "졸업 후 첫 노트",
    period: "after-graduation",
    periodName: "After Graduation",
    year: 2022,
    content: "졸업 후의 노트입니다.",
    images: [],
  },
  {
    id: 8,
    title: "최근 노트",
    period: "after-graduation",
    periodName: "After Graduation",
    year: 2024,
    content: "최근 노트입니다.",
    images: [],
  },
];

/**
 * 시기별로 노트를 필터링하는 함수
 * @param {string} period - 시기 (elementary, middle-high, university, after-graduation)
 * @returns {Array} 필터링된 노트 배열
 */
export const getNotesByPeriod = (period) => {
  return notesData.filter(note => note.period === period);
};

/**
 * 연도별로 노트를 필터링하는 함수
 * @param {number} year - 연도
 * @returns {Array} 필터링된 노트 배열
 */
export const getNotesByYear = (year) => {
  return notesData.filter(note => note.year === year);
};

/**
 * ID로 특정 노트를 찾는 함수
 * @param {number} id - 노트 ID
 * @returns {Object|null} 노트 객체 또는 null
 */
export const getNoteById = (id) => {
  return notesData.find(note => note.id === parseInt(id)) || null;
};

/**
 * 현재 노트의 이전/다음 노트를 찾는 함수
 * @param {number} currentId - 현재 노트 ID
 * @returns {Object} {prev, next} 이전/다음 노트 객체 (없으면 null)
 */
export const getAdjacentNotes = (currentId) => {
  const currentIndex = notesData.findIndex(note => note.id === parseInt(currentId));
  if (currentIndex === -1) {
    return { prev: null, next: null };
  }
  
  return {
    prev: currentIndex > 0 ? notesData[currentIndex - 1] : null,
    next: currentIndex < notesData.length - 1 ? notesData[currentIndex + 1] : null,
  };
};

/**
 * 시기별 옵션 정의
 */
export const periodOptions = [
  { value: "elementary", label: "Elementary School", years: "2005-2010" },
  { value: "middle-high", label: "Middle & High School", years: "2012-2016" },
  { value: "university", label: "University", years: "2017-2022" },
  { value: "after-graduation", label: "After Graduation", years: "2022-2024" },
];

/**
 * 사용 가능한 연도 목록을 가져오는 함수
 * @returns {Array} 연도 배열 (내림차순 정렬)
 */
export const getAvailableYears = () => {
  const years = [...new Set(notesData.map(note => note.year))];
  return years.sort((a, b) => b - a); // 최신 연도부터
};

