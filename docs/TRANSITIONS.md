# Transition · Animation

Memory of Records UI의 **상태 전환(transition)** 규칙입니다. 색·타이포·spacing 토큰과 같이 `src/styles/sizes.css`에 motion 토큰을 두고, 컴포넌트 CSS에서는 아래 원칙을 따릅니다.

---

## 기본 easing

**`ease-in-out`을 기본으로 씁니다.**

- 들어갈 때·나올 때 모두 같은 곡선 → hover 해제(default 복귀)와 hover 진입이 대칭적으로 느껴집니다.
- CSS 토큰: `--ease-default` (`ease-in-out`)

`ease`, `ease-out`만 단독으로 쓰지 않습니다. 예외가 필요하면 이 문서에 이유를 적고 해당 컴포넌트 주석에 남깁니다.

---

## duration — 같은 종류의 인터랙션은 같은 시간

**동일하게 시작되는 인터랙션**(같은 트리거·같은 역할)은 기본적으로 **같은 duration**을 씁니다.

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `--duration-interaction` | `0.2s` | hover·focus에 따른 **색**, opacity, 작은 surface 변화 |
| `--duration-emphasis` | `0.3s` | 굵기(font-weight) · 패널·시트·서브메뉴 접기 등 조금 더 길게 읽혀야 하는 변화 |

새 컴포넌트를 만들 때:

1. 이 인터랙션이 이미 있는 패턴(hover 색, 라벨 굵기 등)과 **같은 시작 조건**인지 본다.
2. 같으면 표의 duration을 그대로 쓴다.
3. 다르면(예: 모달 등장, 캐러셀 스크롤)만 별도 duration을 정하고 문서·주석에 남긴다.

---

## 무엇을 transition할지

**실제로 값이 바뀌는 속성만** transition에 넣습니다.

| 속성 | transition 권장 | 비고 |
|---|---|---|
| `color` | ✅ `--duration-interaction` + `--ease-default` | |
| `opacity` | ✅ 동일 tier | |
| `transform` | ✅ 목적에 맞는 tier | |
| `font-weight` | ✅ label 등 자식에 `--duration-emphasis` | 루트보다 `.tab__label`처럼 분리 |
| `background-color` (클릭·라우트 있는 탭) | ❌ 기본 instant | fade-out이 클릭·SPA 전환 시 깜빡임 유발 — **Tab** 참고 |
| `background-color` (고정 칩·버튼) | ✅ 가능 | FilterChip 등, 페이지 이동 없는 hover |

---

## Tab (보기 전환)

`src/components/Tab/Tab.css` — Timeline / By type / Favorites

| 상태 | 배경 | 글자·굵기 |
|---|---|---|
| default ↔ hover | **instant** (`--color-surface-hover`, transition 없음) | color `0.2s ease-in-out`, label font-weight `0.3s ease-in-out` |
| selected | hover 시 배경만 instant | 다크 `--color-primary` · 라이트 `--color-text` |
| pressed | UiLab 미리보기(`.is-pressed`)만 `--color-surface-active` | 실제 `:active` 배경 없음 |

라우트 전환 시 깜빡임을 막기 위해 `router.js`(Notes↔Notes 헤더 유지) · `Jukebox.js`(갤러리 교체 전 `syncSubMenu`)와 함께 봅니다.

---

## 참고

- 토큰 정의: `src/styles/sizes.css` (`--ease-default`, `--duration-interaction`, `--duration-emphasis`)
- 설계 개요: `Design.md`
- 컴포넌트 실물: `/ui-lab`
