/**
 * MingCute 아이콘 세트 생성기 — Iconify API에서 받아 src/assets/mingcuteIcons.js를 만든다.
 *
 *   npm run icons
 *
 * 아이콘을 추가·교체하려면 아래 ICONS 목록만 고치고 다시 실행한다.
 * name은 https://icon-sets.iconify.design/mingcute/ 에서 찾은 아이콘 이름(kebab-case).
 * 생성 결과는 커밋되므로 앱 런타임은 네트워크를 쓰지 않는다.
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const API = 'https://api.iconify.design/mingcute.json';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'mingcuteIcons.js');

/**
 * key  - MINGCUTE에서 쓰는 이름 (사용처 코드가 참조하므로 함부로 바꾸지 않는다)
 * name - Iconify의 mingcute 아이콘 이름
 * desc - 생성 파일에 남길 용도 설명
 * size - svg width/height 속성 (생략 시 24). CSS가 크기를 정하지만 CSS 없는 곳의 기본값이 된다.
 */
const ICONS = [
  { key: 'addFill', name: 'add-fill', desc: '노트 추가 (+)' },
  { key: 'edit2Fill', name: 'edit-2-fill', desc: '노트 정보 편집' },
  { key: 'fileNewFill', name: 'file-new-fill', desc: '노트 페이지 추가' },
  { key: 'downLine', name: 'down-line', desc: '아래 화살표 (접힌 필터 네비 열기)', size: 16 },
  { key: 'eye2Line', name: 'eye-2-line', desc: '보기 (눈, line)' },
  { key: 'eye2Fill', name: 'eye-2-fill', desc: '보기 (눈, fill)' },
  { key: 'leftLine', name: 'left-line', desc: '왼쪽 화살표 (이전 페이지 · 오른쪽은 CSS scaleX(-1)로 반전)' },
  { key: 'arrowsLeftLine', name: 'arrows-left-line', desc: '맨 앞으로 (겹친 왼쪽 화살표)' },
  { key: 'arrowsRightLine', name: 'arrows-right-line', desc: '맨 끝으로 (겹친 오른쪽 화살표)' },
  { key: 'bookOpenLine', name: 'book-6-line', desc: '양면 보기 (펼친 책)' },
  { key: 'refreshLine', name: 'refresh-anticlockwise-1-line', desc: '되돌리기 (뷰 원상복구)' },
  { key: 'closeLine', name: 'close-medium-line', desc: '닫기 (X)' },
  { key: 'zoomInLine', name: 'zoom-in-line', desc: '확대' },
  { key: 'zoomOutLine', name: 'zoom-out-line', desc: '축소' },
  { key: 'menuLine', name: 'menu-line', desc: '모바일 메뉴 열기 (햄버거)' },
  { key: 'arrowToRightLine', name: 'arrow-to-right-line', desc: '우측 드로어 닫기' },
  { key: 'sunFill', name: 'sun-fill', desc: '테마 스위치 · 라이트' },
  { key: 'moonFill', name: 'moon-fill', desc: '테마 스위치 · 다크' },
  { key: 'pic2Fill', name: 'pic-2-fill', desc: '이미지 플레이스홀더' },
  { key: 'starFill', name: 'star-fill', desc: '즐겨찾기 on (채운 별)' },
  { key: 'starLine', name: 'star-line', desc: '즐겨찾기 off · 모바일 (라인 별)' },
  { key: 'bookmarkFill', name: 'bookmark-fill', desc: '페이지 북마크 on (채운 북마크)' },
  { key: 'bookmarkLine', name: 'bookmark-line', desc: '페이지 북마크 off · 모바일 (라인 북마크)' }
];

const res = await fetch(`${API}?icons=${ICONS.map((icon) => icon.name).join(',')}`);
if (!res.ok) throw new Error(`Iconify 응답 오류: ${res.status} ${res.statusText}`);

const set = await res.json();
if (set.not_found?.length) {
  throw new Error(`mingcute 세트에 없는 아이콘: ${set.not_found.join(', ')}`);
}

/** Iconify body는 큰따옴표를 쓰므로, JS 문자열에 그대로 담기 위해 작은따옴표로 바꾼다. */
function toSvg({ name, size }) {
  const icon = set.icons[name];
  const w = icon.width ?? set.width ?? 24;
  const h = icon.height ?? set.height ?? 24;
  const attrs = [
    "xmlns='http://www.w3.org/2000/svg'",
    `width='${size ?? w}'`,
    `height='${size ?? h}'`,
    `viewBox='0 0 ${w} ${h}'`,
    "aria-hidden='true'"
  ].join(' ');
  return `<svg ${attrs}>${icon.body.replace(/"/g, "'")}</svg>`;
}

const stamp = new Date((set.lastModified ?? 0) * 1000).toISOString().slice(0, 10);
const entries = ICONS.map((icon) => `  /** ${icon.desc} · mingcute:${icon.name} */\n  ${icon.key}:\n    "${toSvg(icon)}"`);

const file = `/**
 * Mingcute 아이콘 (서비스 UI용) — 자동 생성 파일이므로 직접 고치지 않는다.
 *
 * 생성: npm run icons (scripts/generate-mingcute-icons.mjs)
 * 출처: Iconify mingcute 세트 (세트 갱신일 ${stamp})
 * fill·stroke는 currentColor — 버튼 color로 검정/호버 흰색 지정
 *
 * 버튼 아이콘은 반드시 이 세트에서 가져온다. 컴포넌트 파일에 SVG를 직접 적지 말고,
 * 없는 아이콘은 생성 스크립트의 ICONS 목록에 추가한 뒤 쓴다. (규칙: .cursor/rules/ui-buttons.mdc)
 */

export const MINGCUTE = {
${entries.join(',\n\n')}
};
`;

await writeFile(OUT, file, 'utf8');
console.log(`생성 완료: src/assets/mingcuteIcons.js (아이콘 ${ICONS.length}개, 세트 갱신일 ${stamp})`);
