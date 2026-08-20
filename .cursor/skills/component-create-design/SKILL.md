---
name: component-create-design
description: >-
  UI 컴포넌트를 새로 만들거나 기존 컴포넌트의 마크업·CSS·디자인을 고칠 때 반드시 사용한다.
  버튼·칩·토글·드롭다운·모달·패널·헤더 컨트롤, 「스타일 이상해」「전역 CSS」「특이도」,
  ThemeSwitch·DropdownChip·FilterChip·Button처럼 생긴 게 비슷해도 역할이 다른 조각.
---

# 컴포넌트 생성 · 디자인 수정

컴포넌트는 **역할이 다르면 다른 것**이다. `<button>` 태그를 쓴다고 해서 전역 버튼 규칙이나 공통 `Button`에 끼워 맞추지 않는다.

이 스킬은 컴포넌트를 만들거나 스타일을 손대기 **전에** 읽는다.

## 잘못했던 것 (반복 금지)

헤더 ThemeSwitch가 전역 `button` 패딩·primary 배경에 덮였을 때, `index.css`에 `:not(.theme-switch)`를 넣어 전역 규칙을 구멍 냈다.

그건 틀린 수정이다.

- 전역 규칙은 만만한 예외 목록이 아니다. 컴포넌트가 늘어날 때마다 `:not()`을 붙이지 않는다.
- 같은 `<button>`이라도 ThemeSwitch · DropdownChip · FilterChip · 공통 Button · 헤더 Logout은 **각각 다른 컴포넌트**다. 구분해서 만든 이유가 있다.
- 시각이 깨지면 **그 컴포넌트 CSS**가 `index.css`보다 특이도를 높이게 고친다. 전역을 약하게 만들어 우회하지 않는다.
- 환경·전역 동작을 조용히 바꾸지 않는다. 로컬 컴포넌트 버그를 전역 선택자 변경으로 고치지 않는다.

## 이 레포의 컴포넌트 구분

공통 `Button`(`shape`: circle · solid · text)으로 되는 액션만 Button을 쓴다. 규칙은 `.cursor/rules/ui-buttons.mdc`.

Button이 **아닌** 컨트롤은 자기 컴포넌트·CSS를 유지한다.

| 역할 | 컴포넌트 | Button에 넣지 않는 이유 |
| --- | --- | --- |
| 폼 제출·아이콘 액션 | `Button` | 공통 팩토리 |
| 라이트/다크 토글 | `ThemeSwitch` | pill 스위치. 트랙·썸·아이콘이 목적 |
| 필터 칩 | `FilterChip` | 라벨+개수, PC/모바일 레이아웃이 다름 |
| 드롭다운 트리거 | `DropdownChip` | 칩+화살표, 열림/선택 상태 |
| 드롭다운 항목 | `DropdownMenu` | 목록 옵션. 칩과 짝 |
| 모달 껍데기 | `Dialog` | Dim+패널. 버튼이 아님 |

새 UI를 넣을 때 순서:

1. `styles/colors.css` · `styles/sizes.css` 토큰이 있는지
2. 기존 컴포넌트(위 표)로 충분한지
3. 안 되면 **그 역할 전용** 컴포넌트를 `src/components/`에 만든다
4. 공통 Button에 variant를 억지로 늘리거나, 전역 `button`에 예외를 달지 않는다

## CSS: 전역보다 컴포넌트가 이긴다

`main.js`가 컴포넌트 CSS 다음에 `index.css`를 부른다. **같은 특이도면 전역이 이긴다.**

전역 버튼 규칙 (건드리지 말 것):

```css
button:not(.btn):not(.dropdown-chip):not(.dropdown-menu__item)
```

특이도 `(0, 3, 1)`. padding · background · border-radius · hover 배경을 준다.

컴포넌트가 이 값을 덮으려면 **자기 파일에서** 선택자를 `(0, 4, 1)` 이상으로 둔다. 속성은 이미 마크업에 있는 것만 쓴다.

- ThemeSwitch 예: `button.theme-switch[role='switch'][data-theme][data-theme-toggle]`
- DropdownChip 예: `button.dropdown-chip[aria-haspopup='listbox']` — 칩/항목은 자기 CSS로 패딩·색을 정한다
- `!important`로 배경을 지우거나, 새 유틸 클래스로 전역을 무력화하지 않는다
- hover도 전역 `button:hover`를 컴포넌트 hover가 이겨야 한다

전역 `index.css` / `App.css`를 고쳐야 할 것 같으면 한 번 멈춘다. 거의 항상 컴포넌트 선택자가 진 것이다.

## 생성·수정 체크

1. **범위:** 지금 고치는 컴포넌트 파일만. 관련 없는 전역·다른 PR·다른 컴포넌트를 끼워 넣지 않는다.
2. **소유:** 마크업·클래스·ARIA는 그 컴포넌트 JS, 시각은 그 컴포넌트 CSS.
3. **토큰:** 하드코드 색·간격 대신 `--color-*` · `--space-*` · `--radius-*` · `--text-*`. ThemeSwitch처럼 semantic을 쓰면 안 되는 예외는 파일 주석에 이유를 남긴다.
4. **아이콘:** `MINGCUTE`만. SVG를 컴포넌트에 직접 적지 않는다. (`iconify-mingcute-search-add`)
5. **충돌 진단:** 깨진 스타일이 있으면 브라우저/계산된 스타일 기준으로 *어느 규칙이 이겼는지* 본다. 짐작으로 `index.css`에 `:not()`을 추가하지 않는다.
6. **확인:** `/ui-lab`에서 해당 섹션(Button · ThemeSwitch · Dropdown · 헤더 크롬)을 본다.
7. **다른 작업과 섞지 않는다:** 파일 목록이 다른 PR과 겹치지 않으면 합치지 않는다. 겹치더라도 문서(`UiLab.js`)와 실제 컴포넌트 CSS를 구분해서 말한다.

## 하지 말 것

- `index.css` 전역 `button` 선택자에 컴포넌트 클래스 `:not()`을 추가하기
- 한 컴포넌트 버그를 고친다고 전역 hover/focus/padding을 바꾸기
- ThemeSwitch·칩·토글을 공통 `Button` shape로 억지 변환하기
- 헤더 작업 PR에 드롭다운 파일을 합치기, 그 반대도 마찬가지
- 생성 파일(`mingcuteIcons.js`)을 손으로 고치기
