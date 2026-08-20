---
name: component-create-design
description: >-
  UI 컴포넌트를 새로 만들거나 기존 컴포넌트의 마크업·CSS·디자인을 고칠 때 반드시 사용한다.
  버튼·칩·토글·드롭다운·모달·패널·헤더 컨트롤, 「스타일 이상해」「전역 CSS」,
  ThemeSwitch·DropdownChip·FilterChip·Button처럼 태그는 같아도 역할이 다른 조각.
---

# 컴포넌트 생성 · 디자인 수정

컴포넌트는 **역할이 다르면 다른 것**이다. `<button>` 태그가 같다고 해서 한 덩어리로 스타일하지 않는다.

이 스킬은 컴포넌트를 만들거나 스타일을 손대기 **전에** 읽는다.

## 전역에 `button` 규칙을 두지 않는다

`index.css` / `App.css`에 `button { … }` 나 `button:not(.btn)…` 를 두지 않는다.

버튼은 이미 역할별로 컴포넌트가 있다. 패딩·배경·hover·focus는 **그 컴포넌트 CSS**가 전부 맡는다.

| 역할 | 컴포넌트 | 스타일 파일 |
| --- | --- | --- |
| 폼 제출·아이콘 액션 | `Button` | `Button.css` (`.btn`) |
| 라이트/다크 토글 | `ThemeSwitch` | `ThemeSwitch.css` |
| 필터 칩 | `FilterChip` | `FilterChip.css` (`.chip`) |
| 드롭다운 트리거 | `DropdownChip` | `DropdownChip.css` |
| 드롭다운 항목 | `DropdownMenu` | `DropdownMenu.css` |
| 헤더 Logout·햄버거 | PageHeader raw button | `PageHeader.css` |
| 주크박스 보기/채우기·새 점 | Jukebox raw button | `Jukebox.css` |

공통 `Button`(`shape`: circle · solid · text)으로 되는 액션만 Button을 쓴다. 규칙은 `.cursor/rules/ui-buttons.mdc`. 칩·토글·스위치는 Button에 넣지 않는다.

모양이 깨져도 `index.css`에 버튼을 다시 넣지 않는다. 해당 컴포넌트 파일만 고친다.

## 이번에 틀린 판단

전역 `button`이 ThemeSwitch를 덮자 `:not(.theme-switch)`로 전역을 구멍 내거나, 선택자를 늘려 전역과 싸우게 했다. 둘 다 전제를 남긴다. 전역 버튼 규칙 자체가 필요 없다.

## 새 UI 순서

1. `styles/colors.css` · `styles/sizes.css` 토큰이 있는지
2. 위 표의 기존 컴포넌트로 충분한지
3. 안 되면 `src/components/`에 **그 역할 전용** 컴포넌트를 만들고, 버튼이면 그 CSS에 padding·background·border·font·cursor·appearance·focus를 모두 적는다
4. 공통 Button에 variant를 억지로 늘리지 않는다

## 생성·수정 체크

1. **범위:** 필요한 컴포넌트 파일만. 관련 없는 PR을 끼워 넣지 않는다.
2. **소유:** 마크업은 그 컴포넌트 JS, 모양은 그 컴포넌트 CSS. 전역 `button`에 기대지 않는다.
3. **토큰:** `--color-*` · `--space-*` · `--radius-*` · `--text-*`. ThemeSwitch처럼 semantic을 쓰면 안 되는 예외는 파일 주석에 이유를 남긴다.
4. **아이콘:** `MINGCUTE`만. (`iconify-mingcute-search-add`)
5. **확인:** `/ui-lab`에서 해당 섹션을 본다.
6. **다른 작업과 섞지 않는다:** 파일 목록이 다른 PR과 겹치지 않으면 합치지 않는다. 겹치더라도 `UiLab.js` 문구와 실제 컴포넌트 CSS를 구분해서 말한다.

## 하지 말 것

- `index.css` / `App.css`에 `button` 선택자를 추가하거나 `:not()`으로 예외를 쌓기
- 전용 컴포넌트 버그를 전역 hover/padding 값으로 고치기
- ThemeSwitch·칩·토글을 공통 `Button` shape로 억지 변환하기
- 헤더 작업 PR에 드롭다운 파일을 합치기, 그 반대도 마찬가지
- 생성 파일(`mingcuteIcons.js`)을 손으로 고치기
