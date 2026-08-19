/**
 * Dim — 화면(또는 부모)을 덮는 배경 레이어
 *
 * tone
 *  - 'solid': 모달 딤(기존 add-note-overlay · pdf-overlay 톤)
 *  - 'blur' : 드로어 백드롭(기존 nav-drawer-backdrop 톤, blur 포함)
 *
 * z-index는 컨텍스트마다 달라서 하드코딩하지 않고 --dim-z 변수로 받는다.
 */

import './Dim.css';
import { classNames, dataAttrs } from '../../utils/html.js';

/**
 * @param {Object} [config]
 * @param {'solid'|'blur'} [config.tone='solid']
 * @param {number|string} [config.zIndex] - 지정 시 --dim-z로 주입
 * @param {string} [config.className]
 * @param {boolean} [config.visible=true] - false면 투명(페이드 인 대기 상태)
 * @param {Record<string, string>} [config.dataset] - 클릭 위임용 data 속성
 * @returns {string} HTML 문자열
 */
export function render(config = {}) {
  const { tone = 'solid', zIndex, className = '', visible = true, dataset = null } = config;
  const classes = classNames('dim', `dim--${tone}`, visible && 'is-visible', className);
  const style = zIndex == null ? '' : ` style="--dim-z:${zIndex}"`;
  const data = dataAttrs(dataset);
  return `<div class="${classes}"${style} aria-hidden="true"${data ? ` ${data}` : ''}></div>`;
}

/**
 * DOM 요소로 만들어 부모에 붙인다.
 * @param {Object} [config] - render()와 같은 값 + parent/onClick
 * @param {HTMLElement} [config.parent=document.body]
 * @param {() => void} [config.onClick] - 딤 클릭 시 호출 (닫기 등)
 * @returns {HTMLElement}
 */
export function mount(config = {}) {
  const { parent = document.body, onClick, ...rest } = config;
  const holder = document.createElement('div');
  holder.innerHTML = render(rest);
  const el = /** @type {HTMLElement} */ (holder.firstElementChild);
  if (onClick) {
    el.addEventListener('click', onClick);
    el.removeAttribute('aria-hidden');
  }
  parent.appendChild(el);
  return el;
}
