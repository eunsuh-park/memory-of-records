# Figma ↔ React 컴포넌트 매핑 명세

## 1. 목적 및 기준

* **목적:** Figma 디자인과 React 구현을 연결하고, AI가 양쪽의 대응 관계를 이해하도록 한다.
* **코드의 기준:** 디자인 토큰, 컴포넌트 구조 및 동작 규칙
* **Figma의 기준:** 화면 구성, 시각적 조정 및 레이아웃
* **작업 원칙:** 기존 코드를 무조건 리팩터링하지 않는다. 매핑에 필요한 부분만 확인하고 개선한다.

이 문서의 대상은 FilterChip 하나다. 값의 출처는 `FilterChip.css`다.

## 2. 매핑 대상

| 항목            | 내용              |
| ------------- | --------------- |
| 컴포넌트명         | FilterChip |
| 사용 목적         | Timeline / By type에서 시기·유형을 나누는 라벨+개수 칩 |
| 코드 파일 경로      | `src/components/FilterChip/FilterChip.js`, `src/components/FilterChip/FilterChip.css` |
| Figma 컴포넌트 링크 | |
| 대표 사용 화면      | `/ui-lab#filter-chip`, `/timeline`, `/by-type` |
| 매핑 상태         | 미착수 |
| 특이사항          | 제품은 `device`를 넘기지 않아 뷰포트가 레이아웃을 정한다. `label`과 `labelMobile`은 문구가 달라서 나뉜다. |

## 3. 코드 ↔ Figma 대응 관계

| 구분                 | React 코드 | Figma | 매핑 메모 |
| ------------------ | -------- | ----- | ----- |
| 컴포넌트명              | FilterChip (`render`) | FilterChip | Figma 컴포넌트는 아직 없음 |
| Props / Properties | `label`, `labelMobile`, `count`, `active`, `device` | `Label`, `Count`, `Device`, `State` | `labelMobile`은 별도 속성으로 만들지 않음 |
| Variants           | `device`: `pc` / `mobile` / `auto`. `active`와 Lab `is-hover` | `Device`, `State` | `auto`는 variant가 아님 |
| 색상                 | `--color-text`, `--color-text-muted`, `--color-surface-hover`, `--color-primary` | 같은 semantic 변수 | 선택 글자는 `--color-text` |
| 타이포그래피             | `--text-xs`, `--text-2xs`, `--font-thin` / `--font-regular` / `--font-semibold`. 모바일 크기는 로컬 값 | PC는 전역 텍스트 스타일. Mobile 크기·line-height는 컴포넌트 값 | |
| 간격 및 크기            | `--space-1`·`--space-2`·`--space-3`. PC 세로 padding `0.375rem` | 간격 토큰 + 로컬 padding | 고정 폭·높이 없음 |
| 테두리 및 모서리          | `--radius-pill` / `--radius-md`. `border: none` | `Device`에 따라 pill / md | |
| 상태                 | default, hover, selected(`.is-active`), focus-visible | `State`: Default / Hover / Selected | Disabled는 매핑하지 않음 |
| 기타                 | `href`가 있으면 `<a>`, 없으면 `<button>` | | 모양 variant 아님 |

## 4. Props 및 Variants 매핑

| React prop | 타입 / 기본값 | Figma Property | 대응 규칙 |
| ---------- | -------- | -------------- | ----- |
| `label` | `string`, 기본값 `''` | `Label` | PC에 보이는 글자. `title`도 이 문자열 |
| `labelMobile` | `string`, 기본값 `''` | `Label` | Mobile이고 값이 있으면 그 문구. `<br>`은 줄바꿈. 비어 있으면 `label` |
| `count` | `number`, 기본값 `0` | `Count` | `count > 0`일 때만 레이어 표시 |
| `active` | `boolean`, 기본값 `false` | `State` = Selected | `.is-active`. 링크는 `aria-current="page"`, 버튼은 `aria-pressed` |
| `device` | `'auto'` / `'pc'` / `'mobile'`, 기본값 `'auto'` | `Device` = PC / Mobile | `pc`·`mobile`만 `data-device`. `auto`는 뷰포트로 PC 또는 Mobile을 고름 |
| `className` | `string`, 기본값 `''` | `State` = Hover | Lab이 `is-hover`를 넣을 때만 Hover. 제품 prop은 아님 |
| `href` | `string`, 기본값 `''` | | 요소 종류만 바뀜. Figma 속성에 넣지 않음 |
| `dataset` | `Record` 또는 `null` | | 연결하지 않음 |

`chip--{value}` 클래스는 제품이 붙이지만 스타일은 없다.

## 5. 디자인 값 및 토큰

| 항목      | 현재 코드 값 / 변수 | Figma 변수 또는 스타일 | 처리 방침           |
| ------- | ------------ | --------------- | --------------- |
| 색상      | 선택 라벨·개수 `--color-text`. PC 기본 라벨 `--color-text-muted`. hover·selected 배경 `--color-surface-hover`. 포커스 링 `--color-primary` | semantic 색, 모드 dark / light | 유지 |
| 색상      | 개수·모바일 기본 라벨 `color-mix(in srgb, var(--color-text) 50%, transparent)` | `--color-text` + opacity 50% 후보 | 확인 필요 |
| 글꼴 및 크기 | PC 라벨 `--text-xs`, PC 개수 `--text-2xs`. weight `--font-thin` / 선택 시 라벨 `--font-semibold`, 개수 `--font-regular` | 전역 텍스트 | 유지 |
| 글꼴 및 크기 | 모바일 라벨 `0.875rem`, 모바일 개수 `0.625rem`. line-height PC 라벨 `12px`, 모바일 라벨 `18px`, 개수 `14px` | 컴포넌트 로컬 값 | 유지 |
| 간격      | 내용 간격 `--space-1`. PC 가로 `--space-3`, 모바일 가로 `--space-2`, 모바일 세로 `--space-3` | space 토큰 | 유지 |
| 간격      | PC 세로 padding `0.375rem` | 컴포넌트 로컬 값 | 유지 |
| 모서리 반경  | PC `--radius-pill`, Mobile `--radius-md` | radius 토큰 | 유지 |
| 기타      | focus-visible `2px` outline, offset `2px`. 전환 `0.2s ease` | 컴포넌트 효과 | 유지 |

`--text-sm`(0.85rem)과 모바일 라벨 `0.875rem`은 의미가 같아 보여도 값이 다르므로 통합하지 않는다.

## 6. 상태 및 동작

| 상태 / 조건           | 코드에서의 동작 | Figma 표현 | 확인 결과 |
| ----------------- | -------- | -------- | ----- |
| 기본                | 배경 투명. PC 라벨은 muted / thin. 모바일 라벨은 text 50% | Default | CSS로 확인. Figma 비교 전 |
| Hover             | `.is-active`가 아니면 배경 `--color-surface-hover`. 실제 hover는 fine pointer일 때. Lab은 `.is-hover` | Hover | 선택 상태와 hover를 겹친 별도 모양은 없음 |
| Focus             | `:focus`는 outline 없음. `:focus-visible`은 `2px solid var(--color-primary)`, offset `2px` | | Lab 변형 행에는 없음. 매핑 시 링만 추가하면 됨 |
| Disabled          | CSS에 opacity 0.5가 있음. `render()`에 `disabled` 인자 없음 | | 호출처를 찾지 못함. Figma variant로 만들지 않음 |
| Loading / Error 등 | | | 구현 없음 |

선택(`.is-active`)은 배경이 hover와 같고, 라벨·개수 색이 `--color-text`, 라벨 weight 600, 개수 weight 400이다.

## 7. 불일치 및 조치 항목

| ID   | 발견한 차이 | 영향 | 조치              | 우선순위         |
| ---- | ------ | -- | --------------- | ------------ |
| M-01 | Figma 컴포넌트가 아직 없다 | 화면 비교를 시작할 수 없음 | 추가 확인 | 높음 |
| M-02 | `color-mix` 50%와 Figma opacity 50%의 픽셀 일치 여부가 확인되지 않음 | 개수·모바일 라벨 색이 어긋날 수 있음 | 추가 확인 | 중간 |
| M-03 | 코드는 `label` / `labelMobile` 두 필드, Figma 텍스트는 한 칸 | 연결 규칙을 빼면 모바일 문구가 빠짐 | 유지 | 높음 |
| M-04 | `device: 'auto'`는 variant가 아님 | 제품 칩을 `pc`로 고정하면 모바일 레이아웃이 사라짐 | 유지 | 중간 |
| M-05 | Disabled 스타일만 있고 prop과 사용처가 없음 | 없는 상태를 Figma에 만들 위험 | 유지 | 낮음 |

## 8. 검증 결과

* [ ] Figma와 React 컴포넌트의 역할이 일치한다.
* [x] 주요 Props와 Variants의 대응 관계를 확인했다.
* [x] 주요 디자인 값의 대응 관계를 확인했다.
* [ ] 구현된 상태와 동작을 비교했다.
* [ ] 의도하지 않은 디자인 변경이 없는지 확인했다.

코드 쪽 prop·토큰·상태는 `FilterChip.js`와 `FilterChip.css`로 확인했다. Figma 컴포넌트가 없어 화면 비교는 하지 않았다.

**최종 상태:** 미착수

**남은 작업:** Figma에 FilterChip 컴포넌트 세트를 만든 뒤 링크를 이 문서에 넣고, M-02를 나란히 비교한다.

**다음 단계:** `Device` PC/Mobile × `State` Default/Hover/Selected 여섯 칸을 만들고, 텍스트는 `Label` 하나와 `Count`만 둔다.
