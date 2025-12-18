/**
 * Notion API 유틸리티
 * 노션 데이터베이스와 통신하는 함수들
 */

// 환경 변수에서 노션 설정 가져오기
const NOTION_API_KEY = import.meta.env.VITE_NOTION_API_KEY;
const NOTION_DATABASE_ID = import.meta.env.VITE_NOTION_DATABASE_ID;

// 노션 데이터 캐시
let notionPostsCache = null;

/**
 * 노션 API 요청 헤더
 */
function getNotionHeaders() {
  return {
    'Authorization': `Bearer ${NOTION_API_KEY}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };
}

/**
 * 노션 연결 상태를 테스트하는 함수
 * @returns {Promise<boolean>} 연결 성공 여부
 */
export async function testNotionConnection() {
  const NOTION_API_KEY = import.meta.env.VITE_NOTION_API_KEY;
  const NOTION_DATABASE_ID = import.meta.env.VITE_NOTION_DATABASE_ID;
  
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    console.warn('⚠️ 노션 연결 실패: API 키 또는 데이터베이스 ID가 설정되지 않았습니다.');
    console.warn('   .env 파일에 VITE_NOTION_API_KEY와 VITE_NOTION_DATABASE_ID를 설정해주세요.');
    return false;
  }

  try {
    const apiUrl = import.meta.env.DEV 
      ? `/api/notion/v1/databases/${NOTION_DATABASE_ID}`
      : `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`;
    
    const headers = import.meta.env.DEV 
      ? {
          'Content-Type': 'application/json',
        }
      : getNotionHeaders();
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
    });

    if (response.ok) {
      console.log('✅ 노션 DB 연결 성공!');
      const data = await response.json();
      console.log('📊 데이터베이스 정보:', {
        title: data.title?.[0]?.plain_text || '제목 없음',
        id: data.id,
      });
      return true;
    } else {
      const errorText = await response.text();
      console.error('❌ 노션 연결 실패:', response.status, response.statusText);
      console.error('   오류 상세:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ 노션 연결 오류:', error.message);
    return false;
  }
}

/**
 * 노션 데이터베이스에서 모든 페이지를 가져오는 함수
 * @returns {Promise<Array>} 노션 페이지 배열
 */
export async function fetchNotionPages() {
  console.log('노션 API 호출 시작...');
  console.log('API Key 존재:', !!NOTION_API_KEY);
  console.log('Database ID:', NOTION_DATABASE_ID);
  
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    console.error('Notion API 키 또는 데이터베이스 ID가 설정되지 않았습니다.');
    console.error('API Key:', NOTION_API_KEY ? '설정됨' : '없음');
    console.error('Database ID:', NOTION_DATABASE_ID ? '설정됨' : '없음');
    return [];
  }

  try {
    // 개발 환경에서는 프록시를 통해 호출, 프로덕션에서는 직접 호출
    const apiUrl = import.meta.env.DEV 
      ? `/api/notion/v1/databases/${NOTION_DATABASE_ID}/query`
      : `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`;
    
    const headers = import.meta.env.DEV 
      ? {
          'Content-Type': 'application/json',
        }
      : getNotionHeaders();
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        sorts: [
          {
            property: 'Date', // 영어 속성명
            direction: 'descending'
          }
        ]
      })
    });

    console.log('노션 API 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('노션 API 오류 상세:', errorText);
      throw new Error(`Notion API 오류: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('노션 페이지 개수:', data.results?.length || 0);
    console.log('노션 페이지 샘플:', data.results?.[0]);
    return data.results || [];
  } catch (error) {
    console.error('Notion API 요청 실패:', error);
    console.error('에러 상세:', error.message);
    return [];
  }
}

/**
 * 노션 페이지 ID로 상세 내용을 가져오는 함수
 * @param {string} pageId - 노션 페이지 ID
 * @returns {Promise<Object>} 노션 페이지 블록 데이터
 */
export async function fetchNotionPageContent(pageId) {
  if (!NOTION_API_KEY) {
    console.error('Notion API 키가 설정되지 않았습니다.');
    return null;
  }

  try {
    // 개발 환경에서는 프록시를 통해 호출, 프로덕션에서는 직접 호출
    const apiUrl = import.meta.env.DEV
      ? `/api/notion/v1/blocks/${pageId}/children`
      : `https://api.notion.com/v1/blocks/${pageId}/children`;
    
    const headers = import.meta.env.DEV
      ? {}
      : getNotionHeaders();
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`Notion API 오류: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Notion 페이지 내용 가져오기 실패:', error);
    return null;
  }
}

/**
 * 노션 속성 값을 파싱하는 함수
 * @param {Object} property - 노션 속성 객체
 * @returns {string|number|null} 파싱된 값
 */
export function parseNotionProperty(property) {
  if (!property) return null;

  const type = property.type;
  
  switch (type) {
    case 'title':
      return property.title?.[0]?.plain_text || '';
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || '';
    case 'date':
      return property.date?.start || null;
    case 'number':
      return property.number || null;
    case 'select':
      return property.select?.name || null;
    case 'multi_select':
      return property.multi_select?.map(item => item.name) || [];
    case 'checkbox':
      return property.checkbox || false;
    case 'url':
      return property.url || null;
    case 'files':
      return property.files?.[0]?.file?.url || property.files?.[0]?.external?.url || null;
    default:
      return null;
  }
}

/**
 * 노션 페이지를 Story 포스트 형식으로 변환하는 함수
 * @param {Object} page - 노션 페이지 객체
 * @returns {Object} Story 포스트 객체
 */
export function convertNotionPageToStoryPost(page) {
  const properties = page.properties || {};
  
  console.log('노션 페이지 속성:', properties);
  console.log('사용 가능한 속성명:', Object.keys(properties));
  
  // 영어 속성명 사용
  const post = {
    id: page.id?.replace(/-/g, '').substring(0, 8) || Math.random().toString(36).substr(2, 9),
    notionId: page.id,
    title: parseNotionProperty(properties.Title) || '제목 없음',
    subtitle: parseNotionProperty(properties.Subtitle) || '',
    content: '', // 페이지 내용은 별도로 가져와야 함
    publishDate: parseNotionProperty(properties.Date) || new Date().toISOString().split('T')[0],
    preview: parseNotionProperty(properties.Preview) || '',
    image: parseNotionProperty(properties.Image) || null,
  };
  
  console.log('변환된 포스트:', post);
  return post;
}

/**
 * 노션 블록에서 첫 번째 이미지 URL을 추출하는 함수
 * @param {Array} blocks - 노션 블록 배열
 * @returns {string|null} 이미지 URL 또는 null
 */
export function extractFirstImageFromBlocks(blocks) {
  if (!blocks || blocks.length === 0) return null;

  for (const block of blocks) {
    const type = block.type;
    const content = block[type];

    if (type === 'image') {
      const imageUrl = content.file?.url || content.external?.url || '';
      if (imageUrl) return imageUrl;
    }
    
    // 자식 블록이 있으면 재귀적으로 검색
    if (block.children && block.children.length > 0) {
      const childImage = extractFirstImageFromBlocks(block.children);
      if (childImage) return childImage;
    }
  }

  return null;
}

/**
 * 노션 블록을 HTML로 변환하는 함수
 * @param {Array} blocks - 노션 블록 배열
 * @param {boolean} excludeImages - 이미지 제외 여부 (기본값: false)
 * @returns {string} HTML 문자열
 */
export function convertNotionBlocksToHTML(blocks, excludeImages = false) {
  if (!blocks || blocks.length === 0) return '';

  return blocks.map(block => {
    const type = block.type;
    const content = block[type];

    // 이미지 제외 옵션이 활성화되어 있으면 이미지 블록 건너뛰기
    if (excludeImages && type === 'image') {
      return '';
    }

    switch (type) {
      case 'paragraph':
        const text = content.rich_text?.map(rt => rt.plain_text).join('') || '';
        return text ? `<p>${text}</p>` : '<br>';
      
      case 'heading_1':
        return `<h1>${content.rich_text?.map(rt => rt.plain_text).join('') || ''}</h1>`;
      
      case 'heading_2':
        return `<h2>${content.rich_text?.map(rt => rt.plain_text).join('') || ''}</h2>`;
      
      case 'heading_3':
        return `<h3>${content.rich_text?.map(rt => rt.plain_text).join('') || ''}</h3>`;
      
      case 'bulleted_list_item':
        return `<li>${content.rich_text?.map(rt => rt.plain_text).join('') || ''}</li>`;
      
      case 'numbered_list_item':
        return `<li>${content.rich_text?.map(rt => rt.plain_text).join('') || ''}</li>`;
      
      case 'image':
        const imageUrl = content.file?.url || content.external?.url || '';
        return imageUrl ? `<img src="${imageUrl}" alt="" />` : '';
      
      default:
        return '';
    }
  }).join('\n');
}

/**
 * 노션 데이터를 가져와서 캐시에 저장
 * @returns {Promise<Array|null>} 캐시된 포스트 배열 또는 null
 */
export async function loadNotionPosts() {
  try {
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
 * 현재 사용 가능한 포스트 목록 반환 (노션 데이터만)
 * @returns {Array} 포스트 배열
 */
export function getStoryPosts() {
  return notionPostsCache || [];
}

/**
 * ID로 특정 스토리 포스트를 찾는 함수
 * @param {string|number} id - 포스트 ID (노션 ID 또는 숫자 ID)
 * @returns {Object|null} 포스트 객체 또는 null
 */
export function getStoryById(id) {
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
}

/**
 * 이전/다음 스토리 포스트를 찾는 함수
 * @param {string|number} id - 현재 포스트 ID (노션 ID 또는 숫자 ID)
 * @returns {Object} { prev: 이전 포스트 또는 null, next: 다음 포스트 또는 null }
 */
export function getAdjacentStories(id) {
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
}

