---
name: component-create-design
description: >-
  UI 컴포넌트를 새로 만들거나 기존 컴포넌트의 마크업·CSS·디자인을 고칠 때 반드시 사용한다.
  버튼·칩·토글·드롭다운·모달·패널·헤더 컨트롤, 「스타일 이상해」「전역 CSS」,
  ThemeSwitch·DropdownChip·FilterChip·Button처럼 태그는 같아도 역할이 다른 조각.
---

# 컴포넌트 생성 · 디자인 수정

컴포넌트는 **역할이 다르면 다른 것**이다. `<button>`이라고 해서 전부 전역 기본 버튼이 아니다.

이 스킬은 컴포넌트를 만들거나 스타일을 손대기 **전에** 읽는다.

## 이번에 틀린 판단

ThemeSwitch는 앱에서 **그 토글 하나**다. 전역 `button`은 “이름 없는 기본 버튼”용이다.

그런데 토글이 기본 버튼 패딩·primary 배경에 덮였을 때, 전역 선택자에서 빼지 않고 컴포넌트 선택자에 속성을 잔뜩 붙여 `index.css`와 싸우게 했다. 토글이 하나뿐이면 **전역 기본 버튼 범위가 잘못된 것**이다. `.btn`·드롭다운처럼 `:not(.theme-switch)`로 빼는 쪽이 맞다.

반대로, 이유를 모른 채 전역에 `:not()`만 쌓는 것도 안 된다. 먼저 “이 컨트롤이 기본 버튼이 맞는가?”를 본다.

## 이 레포의 컴포넌트 구분

공통 `Button`(`shape`: circle · solid · text)으로 되는 액션만 Button을 쓴다. 규칙은 `.cursor/rules/ui-buttons.mdc`.

Button이 **아닌** 컨트롤은 자기 컴포넌트·CSS를 유지한다.

| 역할 | 컴포넌트 | Button에 넣지 않는 이유 |
| --- | --- | --- |
| 폼 제출·아이콘 액션 | `Button` | 공통 팩토리 |
| 라이트/다크 토글 | `ThemeSwitch` | 앱에 하나인 pill 스위치 |
| 필터 칩 | `FilterChip` | 라벨+개수, PC/모바일 레이아웃이 다름 |
| 드롭다운 트리거 | `DropdownChip` | 칩+화살표, 열림/선택 상태 |
| 드롭다운 항목 | `DropdownMenu` | 목록 옵션. 칩과 짝 |
| 모달 껍데기 | `Dialog` | Dim+패널. 버튼이 아님 |

새 UI를 넣을 때 순서:

1. `styles/colors.css` · `styles/sizes.css` 토큰이 있는지
2. 기존 컴포넌트(위 표)로 충분한지
3. 안 되면 **그 역할 전용** 컴포넌트를 `src/components/`에 만든다
4. 공통 Button에 variant를 억지로 늘리지 않는다

## 전역 `button` vs 컴포넌트

`index.css`의 전역 버튼은 남겨 둔 기본 `<button>`용이다. 이미 디자인한 컨트롤은 대상이 아니다.

지금 제외하는 것:

```css
button:not(.btn):not(.dropdown-chip):not(.dropdown-menu__item):not(.theme-switch)
```

- `.btn` — 공통 Button
- `.dropdown-chip` / `.dropdown-menu__item` — 드롭다운
- `.theme-switch` — 테마 토글 (앱에 이 컴포넌트 하나)

모양이 깨지면 먼저 묻는다.

1. 이 요소가 **기본 버튼**인가, **전용 컴포넌트**인가
2. 전용이고 앱에서 그 역할이 그 컴포넌트뿐이면 → 전역 기본 버튼 범위에서 뺀다 (`index.css`)
3. 기본 버튼이 맞으면 → 전역을 건드리지 않고 그 화면/컴포넌트 CSS만 고친다
4. 컴포넌트 선택자에 data 속성을 잔뜩 붙여 전역과 특이도 싸움을 하지 않는다

전역 hover/focus/padding **값 자체**를 한 컴포넌트 때문에 바꾸지는 않는다. 범위(`:not`)만 맞춘다.

## 생성·수정 체크

1. **범위:** 필요한 파일만. 관련 없는 PR·컴포넌트를 끼워 넣지 않는다.
2. **소유:** 마크업은 그 컴포넌트 JS, 모양은 그 컴포넌트 CSS. 기본 버튼이 아닌데 전역이 덮으면 `index.css` 범위를 고친다.
3. **토큰:** `--color-*` · `--space-*` · `--radius-*` · `--text-*`. ThemeSwitch처럼 semantic을 쓰면 안 되는 예외는 파일 주석에 이유를 남긴다.
4. **아이콘:** `MINGCUTE`만. (`iconify-mingcute-search-add`)
5. **확인:** `/ui-lab`에서 해당 섹션을 본다.
6. **다른 작업과 섞지 않는다:** 파일 목록이 다른 PR과 겹치지 않으면 합치지 않는다. 겹치더라도 `UiLab.js` 문구와 실제 컴포넌트 CSS를 구분해서 말한다.

## 하지 말 것

- 전용 컴포넌트(토글 하나)인데 전역 범위를 안 고치고 선택자만 늘려 `index.css`와 싸우기
- 이유를 모른 채 전역에 `:not()`만 쌓기
- 전역 hover/padding **값**을 한 컴포넌트 때문에 바꾸기
- ThemeSwitch·칩·토글을 공통 `Button` shape로 억지 변환하기
- 헤더 작업 PR에 드롭다운 파일을 합치기, 그 반대도 마찬가지
- 생성 파일(`mingcuteIcons.js`)을 손으로 고치기
