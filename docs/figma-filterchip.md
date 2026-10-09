# FilterChip Figma 매핑

구현 CSS가 기준이다. `Design.md`와 UI Lab 문장이 다르면 CSS를 따른다.

출처

- `src/components/FilterChip/FilterChip.js`
- `src/components/FilterChip/FilterChip.css`
- `/ui-lab#filter-chip`
- 제품 호출: `src/components/FilterSubMenu/FilterSubMenu.js`

## 결정

- 선택 라벨·개수 색은 `--color-text`. 라벨 weight는 `--font-semibold`, 개수는 `--font-regular`.
- 포커스 링 색은 `--color-primary`. 다크 `--primary-2`, 라이트 `--primary-4`.
- `label`과 `labelMobile`은 코드에 둔다. 문구가 다르기 때문이다. Figma 텍스트 칸은 variant마다 하나다.
- disabled는 CSS만 있고 `render()` 인자가 없다. 매핑에서 뺀다.
- `13px` 메뉴 radius, 버튼 크기, 포커스 링 통일은 이 명세 밖이다.

## Figma 컴포넌트

- 이름: FilterChip
- Variant `device`: `pc` | `mobile`
- Variant `state`: `default` | `hover` | `selected`
- 모드: `dark` | `light` (페이지 semantic. 컴포넌트 prop 아님)
- 텍스트 속성 하나: `label`
  - PC에 보이는 글자 = 코드 `label`
  - Mobile에 보이는 글자 = `labelMobile`이 있으면 그 값, 없으면 `label`
  - `<br>`은 Mobile 텍스트의 줄바꿈
- 텍스트 속성 `count`. `count > 0`일 때만 레이어를 보인다
- 크기는 내용에 맞춘다. 고정 폭·높이는 CSS에 없다

`device: 'auto'`는 제품 기본값이다. Figma variant로 만들지 않고, 뷰포트가 `pc` 또는 `mobile` 중 어느 쪽인지를 고른다.

## 전역 토큰

| 토큰 | 쓰는 곳 |
|---|---|
| `--color-text` | 선택 라벨·개수. 다크 `#eeeff0`, 라이트 `#2c343b` |
| `--color-text-muted` | PC 기본 라벨 |
| `--color-surface-hover` | hover·selected 배경 |
| `--color-primary` | focus-visible outline 색만 |
| `--radius-pill` / `--radius-md` | PC / Mobile |
| `--space-1` | 라벨과 개수 간격 |
| `--space-2` | Mobile 가로 padding |
| `--space-3` | PC 가로 padding, Mobile 세로 padding |
| `--text-xs` / `--text-2xs` | PC 라벨 / PC 개수 |
| `--font-thin` / `--font-regular` / `--font-semibold` | 기본 / 선택 개수 / 선택 라벨 |
| `--font-sans` | `.chip`은 `inherit`. body가 이 스택 |

## 컴포넌트 로컬 값

전역 토큰으로 올리지 않는다.

| id | CSS | PC | Mobile | 종류 |
|---|---|---|---|---|
| `chip.padBlock` | `--chip-pad-block` | `0.375rem` | `--space-3` | PC는 literal |
| `chip.labelSize` | `--chip-label-size` | `--text-xs` | `0.875rem` | Mobile은 literal |
| `chip.labelLine` | `--chip-label-line` | `12px` | `18px` | literal |
| `chip.countSize` | `--chip-count-size` | `--text-2xs` | `0.625rem` | Mobile은 literal |
| `chip.countLine` | `--chip-count-line` | `14px` | `14px` | literal. 모바일 블록이 덮지 않음 |
| `chip.labelColor` | `--chip-label-color` | `--color-text-muted` | `color-mix(in srgb, var(--color-text) 50%, transparent)` | Mobile은 formula |
| `chip.countColor` | `--chip-count-color` | 같은 `color-mix` | 같은 formula | formula |
| `chip.focusWidth` | `.chip:focus-visible` | `2px` | `2px` | literal |
| `chip.focusOffset` | 같은 규칙 | `2px` | `2px` | literal |
| `chip.transition` | 배경·색·굵기 | `0.2s ease` | 동일 | literal |
| `chip.disabledOpacity` | `:disabled` | `0.5` | 동일 | literal. 매핑 제외 |

`0.875rem`은 `--text-sm`(0.85rem)과 다르다. `0.375rem`은 `--space-1`과 `--space-2` 사이다. formula의 불투명 hex는 적지 않는다. Figma에서는 `--color-text`에 opacity 50%를 거는 로컬 색으로 대응한다. `color-mix`와 opacity가 픽셀까지 같은지는 확인하지 않았다.

## 코드 연결

| 코드 | Figma |
|---|---|
| `active` | `state=selected` |
| `device: 'pc' \| 'mobile'` | `device` |
| `label` / `labelMobile` | variant의 `label` 텍스트 한 칸 |
| `count > 0` | `count` 텍스트와 표시 여부 |
| Lab `className: 'is-hover'` | `state=hover`. 제품 prop은 아님 |
| `href` | 요소가 `a`인지 `button`인지. 모양 variant 아님 |
| `className`의 `chip--{value}`, `dataset` | 연결하지 않음. `chip--*` 스타일은 없음 |

`title`은 항상 코드 `label`이다. 화면에 나온 모바일 문구가 아니다.

## 확인

- `/ui-lab#filter-chip`의 PC·Mobile 여섯 칸
- `/timeline`, `/by-type`의 auto 칩. 링크, 개수 0이면 숫자 숨김, 시기 칩의 모바일 줄바꿈
