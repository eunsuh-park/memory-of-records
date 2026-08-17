/**
 * NoteImageViewer 크롬 마크업
 *
 * 뷰어 안의 모든 버튼은 공통 Button 컴포넌트(circle)로만 만들고,
 * 아이콘은 공용 MingCute 세트(src/assets/mingcuteIcons.js)에서만 가져온다.
 *  - 좌우 페이지 이동: circle M · role navPrev/navNext
 *  - 하단 시트 버튼  : circle S · role toolbar · tone ghost (유리 시트 위라 배경 없음)
 *  - 양면 토글       : circle S · role toolbar (배경 있는 FAB)
 *
 * 뷰어와 /ui-lab 예시가 같은 마크업을 쓰도록 여기로 분리했다.
 */

import { render as renderButton } from '../Button/Button.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import '../Button/Button.css';
import './NoteImageViewer.css';

/** 이미지 좌우에 겹치는 페이지 이동 버튼 */
export function renderNavButtons() {
  return `
    ${renderButton({
      shape: 'circle',
      size: 'm',
      role: 'navPrev',
      ariaLabel: '이전 페이지',
      content: MINGCUTE.leftLine,
      className: 'niv-nav-prev'
    })}
    ${renderButton({
      shape: 'circle',
      size: 'm',
      role: 'navNext',
      ariaLabel: '다음 페이지',
      content: MINGCUTE.leftLine,
      className: 'niv-nav-next'
    })}
  `;
}

/**
 * 페이지 북마크 토글
 * favorites와 동일: desktop은 항상 fill, mobile off만 line / on은 fill
 * @param {boolean} bookmarked
 * @param {'desktop'|'mobile'} variant
 */
export function renderBookmarkButton(bookmarked = false, variant = 'desktop') {
  const pressed = Boolean(bookmarked);
  const icon = variant === 'mobile' && !pressed ? MINGCUTE.bookmarkLine : MINGCUTE.bookmarkFill;
  const isMobile = variant === 'mobile';
  return renderButton({
    shape: 'circle',
    size: 's',
    role: 'toolbar',
    tone: isMobile ? undefined : 'ghost',
    ariaLabel: pressed ? '북마크 해제' : '북마크 추가',
    title: pressed ? '북마크 해제' : '북마크 추가',
    ariaPressed: pressed,
    content: icon,
    className: [
      'niv-bookmark',
      isMobile ? 'niv-bookmark--mobile niv-bookmark-fab' : 'niv-bookmark--desktop niv-sheet-btn',
      pressed ? 'is-bookmarked' : ''
    ]
      .filter(Boolean)
      .join(' ')
  });
}

/** 하단 시트: 정보 | 페이지 추가 | 북마크 | 처음·현재/전체·마지막 | 뷰 원상복구 */
export function renderBottomSheet() {
  return `
    <div class="niv-bottom-sheet" role="toolbar" aria-label="페이지 도구">
      ${renderButton({
        shape: 'circle',
        size: 's',
        role: 'toolbar',
        tone: 'ghost',
        ariaLabel: '페이지 정보(메타데이터) 보기',
        title: '페이지 정보',
        content: MINGCUTE.eye2Line,
        className: 'niv-sheet-btn niv-page-info'
      })}
      ${renderButton({
        shape: 'circle',
        size: 's',
        role: 'toolbar',
        tone: 'ghost',
        ariaLabel: '현재 페이지 다음에 페이지 추가',
        title: '페이지 추가',
        content: MINGCUTE.addFill,
        className: 'niv-sheet-btn niv-add-page auth-only'
      })}
      ${renderBookmarkButton(false, 'desktop')}
      ${renderButton({
        shape: 'circle',
        size: 's',
        role: 'toolbar',
        tone: 'ghost',
        ariaLabel: '현재 페이지 링크 복사',
        title: '현재 페이지 링크 복사',
        content: MINGCUTE.share2Line,
        className: 'niv-sheet-btn niv-share-note'
      })}
      <div class="niv-sheet-progress">
        ${renderButton({
          shape: 'circle',
          size: 's',
          role: 'toolbar',
          tone: 'ghost',
          ariaLabel: '처음 페이지',
          title: '처음 페이지',
          content: MINGCUTE.arrowsLeftLine,
          className: 'niv-sheet-nav niv-nav-first'
        })}
        <span class="niv-sheet-progress__label">
          <span class="niv-current-page">1</span>
          <span class="niv-sheet-progress__sep">/</span>
          <span class="niv-total-pages">-</span>
        </span>
        ${renderButton({
          shape: 'circle',
          size: 's',
          role: 'toolbar',
          tone: 'ghost',
          ariaLabel: '마지막 페이지',
          title: '마지막 페이지',
          content: MINGCUTE.arrowsRightLine,
          className: 'niv-sheet-nav niv-nav-last'
        })}
      </div>
      ${renderButton({
        shape: 'circle',
        size: 's',
        role: 'toolbar',
        tone: 'ghost',
        ariaLabel: '뷰 원상복구',
        title: '처음 크기와 위치로',
        content: MINGCUTE.refreshLine,
        className: 'niv-sheet-btn niv-reset-view'
      })}
    </div>
  `;
}

/** 하단 시트 위 우측에 뜨는 양면 보기 토글 */
export function renderSpreadToggle() {
  return renderButton({
    shape: 'circle',
    size: 's',
    role: 'toolbar',
    ariaLabel: '양면 보기 전환',
    title: '양면 보기',
    ariaPressed: false,
    content: MINGCUTE.bookOpenLine,
    className: 'niv-toggle-spread niv-spread-fab'
  });
}

/** 뷰어 컨트롤 전체 (.pdf-canvas-wrap 같은 position 있는 부모 안에 넣는다) */
export function renderViewerChrome() {
  return `
    ${renderNavButtons()}
    ${renderBottomSheet()}
    ${renderBookmarkButton(false, 'mobile')}
    ${renderSpreadToggle()}
  `;
}
