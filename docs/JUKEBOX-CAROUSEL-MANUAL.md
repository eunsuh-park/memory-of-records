# Jukebox 스타일 CSS 캐러셀 사용 매뉴얼

주크박스 페이지에서 사용하는 **Cover Flow 형식의 가로 캐러셀**을 다른 화면/컴포넌트에서도 재사용할 수 있도록 정리한 문서입니다.

---

## 1. 개요

- **참고**: [Cover Flow (scroll-driven-animations)](https://scroll-driven-animations.style/demos/cover-flow/css/), [CodePen palampinen/OXGYdX](https://codepen.io/palampinen/pen/OXGYdX)
- **구성**: 가로 스크롤 갤러리 + 스크롤 위치에 따른 3D 변환(rotateY, scale, translateZ) + 선택적 기능(휠 스크롤, 이전/다음 버튼, 커스텀 스크롤바, 카드 플립)

### 제공 기능

| 기능 | 설명 |
|------|------|
| **Cover Flow 3D** | 카드가 뷰포트 중앙에 가까울수록 정면(rotateY 0°), 양옆일수록 옆으로 회전(±45°), 중앙 카드만 확대·앞으로 |
| **스크롤 스냅** | `scroll-snap-type: x mandatory` + 카드 `scroll-snap-align: center` 로 카드 단위 정렬 |
| **휠 → 가로 스크롤** | 세로 휠을 가로 스크롤로 변환 (휠 아래 = 오른쪽) |
| **이전/다음 버튼** | 클릭 시 **한 장씩** 이동(현재 중앙에 가장 가까운 카드 기준 이전/다음으로 스크롤) |
| **가장자리 호버 스크롤** | 화면 왼쪽/오른쪽 일정 비율에 마우스가 있으면 해당 방향으로 자동 스크롤 (선택) |
| **커스텀 가로 스크롤바** | 갤러리 `scrollLeft`와 동기화된 스타일 스크롤바, 트랙 클릭·썸 드래그 지원 |
| **중앙 카드 플립** | 중앙(active) 카드에만 호버 시 뒷면(back cover) 표시 (앞/뒷면 이미지 구조 필요) |

---

## 2. HTML 구조

다른 곳에서 쓸 때는 **갤러리 컨테이너와 카드 구조**만 맞추면 됩니다. 클래스 이름을 바꿀 경우 JS/CSS 선택자만 동일하게 맞추면 됩니다.

### 최소 구조 (플립 없이 단순 카드만)

```html
<div class="jukebox-gallery-wrap">
  <button type="button" class="jukebox-nav jukebox-nav--prev" aria-label="이전"></button>
  <button type="button" class="jukebox-nav jukebox-nav--next" aria-label="다음"></button>
  <div class="jukebox-gallery" id="my-gallery">
    <div class="jukebox-spacer jukebox-spacer--left" aria-hidden="true"></div>
    <!-- 카드: 직계 자식이 .jukebox-card 여야 함 -->
    <div class="jukebox-card">
      <img src="..." alt="..." />
    </div>
    <div class="jukebox-card">...</div>
    <div class="jukebox-spacer jukebox-spacer--right" aria-hidden="true"></div>
  </div>
</div>
<!-- 선택: 커스텀 스크롤바 -->
<div class="jukebox-scrollbar-wrap jukebox-scrollbar-wrap--hidden" id="my-scrollbar-wrap">
  <div class="jukebox-scrollbar-track" id="my-scrollbar-track">
    <div class="jukebox-scrollbar-thumb" id="my-scrollbar-thumb"></div>
  </div>
</div>
```

### 카드 플립(앞/뒷면) 사용 시

중앙 카드 호버 시 뒷면을 보여주려면 카드 안에 **앞면/뒷면** 구조가 필요합니다.

```html
<div class="jukebox-card">
  <div class="jukebox-card-inner">
    <div class="jukebox-card-face jukebox-card-face--front">
      <img src="앞표지-url" alt="..." />
    </div>
    <div class="jukebox-card-face jukebox-card-face--back">
      <img src="뒷표지-url" alt="... (뒷표지)" class="jukebox-card-back-cover" />
    </div>
  </div>
</div>
```

- **중요**: 갤러리의 **직계 자식**은 `div.jukebox-spacer` 또는 `div.jukebox-card` 뿐이어야 합니다. JS가 `gallery.querySelectorAll(':scope > div.jukebox-card')` 로 카드만 선택합니다.

---

## 3. CSS 요약

### 갤러리 컨테이너 필수 스타일

- **가로 스크롤**: `overflow-x: auto`, `white-space: nowrap`
- **3D 원근**: `perspective: 60em`, `perspective-origin: 50% 50%`
- **스냅**: `scroll-snap-type: x mandatory`
- **터치 스크롤**: `-webkit-overflow-scrolling: touch`

### 카드 필수 스타일

- **레이아웃**: `display: inline-block`, `scroll-snap-align: center`
- **변환**: `transform` 에 다음 CSS 변수를 사용 (JS가 매 스크롤마다 설정)
  - `--jukebox-rotate-y`: 예) `-45deg` ~ `0deg` ~ `45deg`
  - `--jukebox-scale`: 예) `0.88` ~ `1.25`
  - `--jukebox-translate-z`: 예) `0em` / `1.5em`
  - `--jukebox-hover-x`: 호버 시 살짝 이동 (중앙 카드만)
  - `--jukebox-brightness`: 양옆 카드 어둡게 (예: `0.48` ~ `1`)
  - `--jukebox-shadow`: 카드별 그림자

### 카드 플립(뒷면) 스타일

- `.jukebox-card-inner`: `transform-style: preserve-3d`, `transition: transform 0.55s ease`
- `.jukebox-card--centered:hover .jukebox-card-inner`: `transform: rotateY(180deg)`
- `.jukebox-card-face`: `backface-visibility: hidden`
- `.jukebox-card-face--back`: `position: absolute; inset: 0; transform: rotateY(180deg);`

전체 스타일은 `src/pages/Jukebox.css` 를 참고하고, 다른 페이지에서 쓸 때는 해당 블록만 복사하거나 클래스 prefix 를 바꿔서 스코프를 나누면 됩니다.

---

## 4. JavaScript 연동

캐러셀 동작은 **세 가지(또는 네 가지) 함수**로 나뉩니다. 갤러리 DOM이 준비된 뒤 호출하면 됩니다.

### 4.1 Cover Flow 각도/스케일 갱신 (필수)

- **함수**: `updateCardAngles(gallery)`
- **역할**: 각 카드의 뷰포트 내 위치(중앙으로부터의 비율)를 계산해 `--jukebox-rotate-y`, `--jukebox-scale`, `--jukebox-translate-z`, `--jukebox-brightness`, `--jukebox-shadow`, `--jukebox-hover-x` 와 `z-index` 를 설정. 중앙에 가장 가까운 카드에만 `jukebox-card--centered` 클래스를 붙임.
- **호출**: 스크롤·리사이즈 시마다 실행되어야 하므로 `enableCenterPerspective(gallery)` 로 등록하는 것이 좋음.

### 4.2 스크롤 연동 (필수)

- **함수**: `enableCenterPerspective(gallery)`
- **역할**: `gallery` 의 `scroll` 이벤트와 `window` 의 `resize` 이벤트에 `updateCardAngles(gallery)` 를 연결하고, 초기 1회 실행.

```js
function enableCenterPerspective(gallery) {
  if (!gallery) return;
  const onUpdate = () => {
    if (!gallery.isConnected) {
      window.removeEventListener('resize', onUpdate);
      return;
    }
    updateCardAngles(gallery);
  };
  gallery.addEventListener('scroll', onUpdate, { passive: true });
  window.addEventListener('resize', onUpdate);
  onUpdate();
}
```

### 4.3 휠 + 이전/다음 버튼 (권장)

- **함수**: `enableGalleryScroll(gallery, prevBtn, nextBtn)`
- **역할**
  - **휠**: `wheel` 이벤트에서 `deltaY` 를 가로 스크롤(`scrollLeft`)로 변환. 스크롤 가능할 때만 `preventDefault()`.
  - **이전/다음**: 클릭 시 “현재 중앙에 가장 가까운 카드”의 이전/다음 카드가 중앙에 오도록 `scrollTo({ left: ..., behavior: 'smooth' })` 호출.
- **선택**: 가장자리 호버 스크롤도 이 함수 안에 있음. 사용하지 않으면 해당 `mousemove` / `mouseleave` 리스너만 제거하면 됨.

### 4.4 커스텀 스크롤바 (선택)

- **함수**: `enableCustomScrollbar(gallery, wrapEl, trackEl, thumbEl)`
- **역할**: `gallery.scrollLeft` 와 썸 위치 동기화, 트랙 클릭 시 해당 위치로 스크롤, 썸 드래그로 스크롤. 스크롤할 내용이 없으면 wrap 에 `jukebox-scrollbar-wrap--hidden` 으로 숨김.

### 사용 예시 (다른 페이지에서)

```js
import { updateCardAngles, enableCenterPerspective, enableGalleryScroll, enableCustomScrollbar } from './pages/Jukebox.js';

const gallery = document.getElementById('my-gallery');
const prevBtn = document.querySelector('.jukebox-nav--prev');
const nextBtn = document.querySelector('.jukebox-nav--next');

enableCenterPerspective(gallery);
enableGalleryScroll(gallery, prevBtn, nextBtn);

// 커스텀 스크롤바 쓸 때
const wrap = document.getElementById('my-scrollbar-wrap');
const track = document.getElementById('my-scrollbar-track');
const thumb = document.getElementById('my-scrollbar-thumb');
if (wrap && track && thumb) enableCustomScrollbar(gallery, wrap, track, thumb);
```

현재 Jukebox 페이지는 위 함수들을 export 하지 않고 `renderJukebox()` 안에서만 사용합니다. **다른 곳에서 재사용하려면** `updateCardAngles`, `enableCenterPerspective`, `enableGalleryScroll`, `enableCustomScrollbar` 를 export 하거나, 이 네 함수만 별도 모듈(예: `carouselCoverFlow.js`)로 분리해 두고 Jukebox와 다른 페이지에서 둘 다 import 하면 됩니다.

---

## 5. 다른 맥락에서 쓸 때 체크리스트

- [ ] **갤러리 루트**: `#my-gallery` 등 원하는 id/class. JS는 “갤러리 한 개”만 받음.
- [ ] **카드 선택자**: `gallery.querySelectorAll(':scope > div.jukebox-card')` 와 동일한 구조 유지. 클래스 이름을 바꾸면 JS 내부의 `jukebox-card` 를 해당 이름으로 변경.
- [ ] **스페이서**: 첫/끝 카드가 뷰포트 중앙에 올 수 있도록 갤러리 양끝에 빈 `div.jukebox-spacer` 를 두는 것을 권장. 너비는 `36vw` 등으로 조정 가능.
- [ ] **플립 미사용**: 카드를 `<div class="jukebox-card"><img ... /></div>` 만 두고, CSS에서 `.jukebox-card-inner` / `.jukebox-card-face` 관련 규칙과 호버 플립을 제거하면 됨.
- [ ] **스크롤바 미사용**: HTML에서 스크롤바 블록 제거하고 `enableCustomScrollbar` 호출만 하지 않으면 됨.
- [ ] **전체 화면이 아닌 영역**: `.jukebox-fullscreen` 등 전체 화면용 레이아웃/배경은 사용하지 않고, `.jukebox-gallery-wrap` + `.jukebox-gallery` 만 필요한 영역에 넣으면 됨.
- [ ] **반응형**: `Jukebox.css` 의 미디어 쿼리(768px, 480px)에서 카드/스페이서/스크롤바 크기를 조정하고 있으므로, 같은 breakpoint 를 쓰거나 필요한 값만 가져와서 조정.

---

## 6. CSS 변수 (JS에서 카드에 설정하는 값)

| 변수 | 설명 | 예시 |
|------|------|------|
| `--jukebox-rotate-y` | Y축 회전 (중앙 0°, 양옆 ±45°) | `-45deg`, `0deg`, `45deg` |
| `--jukebox-scale` | 배율 (중앙 크게, 양옆 작게) | `0.88` ~ `1.25` |
| `--jukebox-translate-z` | Z축 이동 (중앙이 앞으로) | `0em`, `1.5em` |
| `--jukebox-hover-x` | 중앙 카드 호버 시 X 이동 | `-3vw`, `0`, `3vw` |
| `--jukebox-brightness` | 이미지 밝기 (양옆 어둡게) | `0.48` ~ `1` |
| `--jukebox-shadow` | 카드 box-shadow | `0 6px 22px rgba(0,0,0,0.16)` 등 |

카드의 `transform` / `box-shadow` / 이미지 `filter` 에 이 변수를 사용하도록 CSS를 작성하면, JS는 스크롤만 갱신해 주면 됩니다.

---

## 7. 참고 파일

- **구현**: `src/pages/Jukebox.js`, `src/pages/Jukebox.css`
- **참고 링크**: [Cover Flow (CSS)](https://scroll-driven-animations.style/demos/cover-flow/css/), [CodePen OXGYdX](https://codepen.io/palampinen/pen/OXGYdX)

이 매뉴얼과 위 참고 파일을 기준으로, 필요한 부분만 복사·수정하면 다른 페이지에서도 동일한 “주크박스 느낌”의 캐러셀을 사용할 수 있습니다.
