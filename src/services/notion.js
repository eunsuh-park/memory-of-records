/**
 * Notion API 유틸리티
 * 노션 데이터 변환 및 파싱 함수들
 */

// 노션 데이터 캐시
let notionPostsCache = null;

/**
 * /api/story 엔드포인트에서 모든 스토리를 가져오는 함수
 * @returns {Promise<Array>} 노션 페이지 배열
 */
export async function fetchNotionPages() {
  try {
    const response = await fetch('/api/story');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Story API 오류:', response.status, response.statusText);
      console.error('오류 상세:', errorText);
      return [];
    }

    const data = await response.json();
    console.log('스토리 페이지 개수:', data.results?.length || 0);
    return data.results || [];
  } catch (error) {
    console.error('Story API 요청 실패:', error);
    return [];
  }
}

/**
 * 노션 페이지 ID로 상세 내용을 가져오는 함수
 * @param {string} pageId - 노션 페이지 ID
 * @returns {Promise<Array>} 노션 페이지 블록 데이터
 */
export async function fetchNotionPageContent(pageId) {
  try {
    const response = await fetch(`/api/story?id=${encodeURIComponent(pageId)}`);
    
    if (!response.ok) {
      throw new Error(`Story API 오류: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.blocks || [];
  } catch (error) {
    console.error('Story 페이지 내용 가져오기 실패:', error);
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
 * HTML 이스케이프 (XSS 방지)
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 노션 rich_text 배열을 서식(굵게, 기울임, 코드, 링크 등)을 반영한 HTML 문자열로 변환
 * @param {Array} richText - 노션 rich_text 배열
 * @returns {string} HTML 문자열
 */
function richTextToHTML(richText) {
  if (!richText || richText.length === 0) return '';
  return richText.map((rt) => {
    const text = escapeHtml(rt.plain_text || '');
    if (!text) return '';
    const ann = rt.annotations || {};
    const href = rt.href || rt.link?.url;
    let out = text;
    if (ann.code) out = `<code>${out}</code>`;
    if (ann.bold) out = `<strong>${out}</strong>`;
    if (ann.italic) out = `<em>${out}</em>`;
    if (ann.strikethrough) out = `<s>${out}</s>`;
    if (ann.underline) out = `<u>${out}</u>`;
    if (href) out = `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${out}</a>`;
    return out;
  }).join('');
}

/**
 * 노션 블록을 HTML로 변환하는 함수 (rich_text 서식 반영: 굵게, 기울임, 코드, 링크 등)
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

    const textHtml = content.rich_text ? richTextToHTML(content.rich_text) : '';

    switch (type) {
      case 'paragraph':
        return textHtml ? `<p>${textHtml}</p>` : '<br>';
      case 'heading_1':
        return textHtml ? `<h1>${textHtml}</h1>` : '';
      case 'heading_2':
        return textHtml ? `<h2>${textHtml}</h2>` : '';
      case 'heading_3':
        return textHtml ? `<h3>${textHtml}</h3>` : '';
      case 'bulleted_list_item':
        return textHtml ? `<li>${textHtml}</li>` : '';
      case 'numbered_list_item':
        return textHtml ? `<li>${textHtml}</li>` : '';
      case 'image':
        const imageUrl = content.file?.url || content.external?.url || '';
        return imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" />` : '';
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

