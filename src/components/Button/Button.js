/**
 * 공통 버튼 컴포넌트 — 형태(shape) 기준
 *
 * shape
 *  - 'circle': 원형 버튼. size('l'|'m'|'s') + role('fab'|'back'|'navPrev'|'navNext'|'toolbar'|'close'|'icon')
 *              + tone('filled'|'ghost')
 *  - 'solid' : 배경이 채워진 일반 버튼 (제출 버튼 등)
 *  - 'text'  : 배경 없는 회색 텍스트 버튼
 *
 * 아이콘 버튼의 content는 반드시 공용 MingCute 세트(src/assets/mingcuteIcons.js)에서 가져온다.
 * 컴포넌트 파일에 SVG를 직접 적지 말고, 없는 아이콘은 세트에 추가한 뒤 쓴다.
 * 규칙: .cursor/rules/ui-buttons.mdc · 실물 예시: /ui-lab
 */

import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import { attr, classNames, dataAttrs, escapeHtml } from '../../utils/html.js';
import './Button.css';

export const BACK_ARROW_SVG = MINGCUTE.leftLine;

/** circle role → CSS 클래스 */
const CIRCLE_ROLE_CLASS = {
  fab: 'btn--fab',
  back: 'btn--back',
  navPrev: 'btn--nav btn--nav-prev',
  navNext: 'btn--nav btn--nav-next',
  toolbar: 'btn--toolbar',
  close: 'btn--close',
  icon: 'btn--icon'
};

/** circle role → 기본 size (호출 시 size를 주면 그 값이 우선) */
const CIRCLE_ROLE_SIZE = {
  fab: 'l',
  back: 'm',
  navPrev: 'm',
  navNext: 'm',
  toolbar: 's',
  close: 's',
  icon: 's'
};

/**
 * @param {Object} options
 * @param {'circle'|'solid'|'text'} [options.shape='solid']
 * @param {'l'|'m'|'s'} [options.size] - circle 전용. 생략 시 role의 기본 사이즈
 * @param {'fab'|'back'|'navPrev'|'navNext'|'toolbar'|'close'|'icon'} [options.role] - circle 전용. icon은 32px 투명 Icon Button
 * @param {'filled'|'ghost'} [options.tone='filled'] - circle 전용. ghost는 배경 없음
 * @param {boolean} [options.inline=false] - role='back'의 인라인(고정 위치 없는) 버전
 * @param {string} [options.ariaLabel]
 * @param {string} [options.title] - 마우스 툴팁
 * @param {boolean} [options.ariaPressed] - 토글 버튼의 초기 상태
 * @param {string} [options.id]
 * @param {string} [options.content] - inner HTML (아이콘/텍스트). role='back'은 미지정 시 BACK_ARROW_SVG
 * @param {'button'|'submit'} [options.type='button']
 * @param {string} [options.className] - 추가 클래스 (예: pdf-modal-close)
 * @param {boolean} [options.dataLink] - data-link 속성 (뒤로가기 등)
 * @param {boolean} [options.block=false] - text 전용. 폼 푸터용 테두리·전체 너비
 * @param {boolean} [options.disabled]
 * @param {Record<string, string>} [options.dataset] - data-* 속성 (예: { action: 'upload' })
 * @returns {string} HTML 문자열
 */
export function render(options = {}) {
  const {
    shape = 'solid',
    size,
    role = '',
    tone = 'filled',
    inline = false,
    block = false,
    ariaLabel = '',
    title = '',
    ariaPressed = null,
    id = '',
    content = '',
    type = 'button',
    className = '',
    dataLink = false,
    disabled = false,
    dataset = null
  } = options;

  const classes = ['btn', `btn--${shape}`];

  if (shape === 'circle') {
    classes.push(`btn--${size || CIRCLE_ROLE_SIZE[role] || 'm'}`);
    if (role === 'back' && inline) classes.push('btn--back-inline');
    else if (CIRCLE_ROLE_CLASS[role]) classes.push(CIRCLE_ROLE_CLASS[role]);
    if (tone === 'ghost') classes.push('btn--ghost');
  }
  if (shape === 'text' && block) classes.push('btn--block');
  if (className) classes.push(className);

  let inner = content;
  if (role === 'back' && !inner) inner = BACK_ARROW_SVG;
  if (role === 'navPrev' || role === 'navNext') {
    const iconMod = role === 'navNext' ? ' btn__nav-icon--next' : '';
    inner = `<span class="btn__nav-icon${iconMod}">${inner}</span>`;
  }

  const attrs = [
    `type="${escapeHtml(type)}"`,
    attr('class', classNames(classes)),
    attr('id', id),
    attr('aria-label', ariaLabel),
    attr('title', title),
    ariaPressed === null ? '' : `aria-pressed="${ariaPressed ? 'true' : 'false'}"`,
    dataLink ? 'data-link' : '',
    disabled ? 'disabled' : '',
    dataAttrs(dataset)
  ].filter(Boolean);

  return `<button ${attrs.join(' ')}>${inner}</button>`;
}

/**
 * Icon Button — 노트 정보 패널 등에서 쓰는 32px 투명 원형 아이콘 버튼.
 * 내부는 공통 render()이며, shape/role은 circle · icon으로 고정한다.
 *
 * @param {Object} [options] - render()와 동일한 옵션. shape·role은 덮어쓴다.
 * @returns {string} HTML 문자열
 */
export function renderIconButton(options = {}) {
  return render({ ...options, shape: 'circle', role: 'icon', size: options.size || 's' });
}
