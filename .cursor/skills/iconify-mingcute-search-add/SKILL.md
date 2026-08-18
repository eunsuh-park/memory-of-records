---
name: iconify-mingcute-search-add
description: >-
  MingCute 아이콘을 Iconify에서 검색해 scripts/generate-mingcute-icons.mjs에 넣고 npm run icons로 생성한다.
  「아이콘 추가」「MingCute에 있는지 찾아」「up small filled」처럼 아이콘을 찾거나 세트에 넣을 때 사용한다.
---

사용자 요청에 맞는 **MingCute 아이콘**을 Iconify에서 검색한 뒤,
`scripts/generate-mingcute-icons.mjs`의 `ICONS` 목록에 추가하고 `npm run icons`로 자동 생성(`src/assets/mingcuteIcons.js`)까지 한 번에 처리한다.

## 목적
- “이 아이콘이 필요한데 MingCute에 있는지 찾아서 추가해줘” 같은 요청을 빠르게 수행
- 아이콘 키는 앱 코드가 참조하는 `ICONS.key`를 기준으로 생성(또는 기존 key 재사용)
- Iconify API로 확인한 뒤 **정확한 mingcute kebab-case icon name**을 `ICONS`에 기록

## 입력(자연어)
아래 중 가능한 형태로 사용자 요청을 받는다.
- “`<icon-query>`를 추가해줘” (예: “드롭박스 위로 올라가는 화살표”)
- 또는 “`<name>`이 있을 것 같은데 찾아서 넣어줘” (예: “up small filled”)

요청에 “선호 key(예: upSmallFill)”가 있으면 그대로 사용하고, 없으면 스스로 만들어도 된다.

## 실행 절차
1) **Iconify MingCute 검색**
   - Iconify 검색 API를 사용해 mingcute(prefix=mingcute)에서 검색한다.
   - URL 템플릿:
     - `https://api.iconify.design/search?prefix=mingcute&query=<ENCODED_QUERY>&limit=20`
   - 응답(JSON)에서 `icons` 배열을 확인하고, 시각적으로 가장 가까운 후보 1개를 선택한다.

2) **선택된 아이콘의 “Iconify icon name” 추출**
   - Iconify 결과 아이콘 문자열은 `mingcute:<name>` 형태를 따른다.
   - `name` 부분을 `ICONS`의 `name` 필드로 쓴다.
   - 이때 `name`은 Iconify mingcute 세트의 kebab-case여야 한다.

3) **`scripts/generate-mingcute-icons.mjs` 수정**
   - 파일에서 `const ICONS = [` 블록만 수정한다.
   - 새 엔트리를 추가:
     - `{ key, name, desc }`
   - `key`는 앱 코드에서 쓰일 식별자(영문 카멜 형태)를 만든다.
     - 예: 아이콘이 “up small filled”라면 `upSmallFilled` 같은 형태
   - `desc`는 향후 사용처를 추적할 수 있게 짧게 작성한다.

4) **재생성**
   - `npm run icons` 실행
   - 생성 결과로 `src/assets/mingcuteIcons.js`가 갱신된다.

5) **검증**
   - `src/assets/mingcuteIcons.js`에 방금 추가한 `key`가 존재하는지 확인한다.
   - 컴포넌트가 있다면 `MINGCUTE.<key>`로 참조한다.

## 실패/대체 규칙
- 검색 결과가 애매하면:
  - 가장 가까운 후보를 임시로 추가하고 `desc`에 “임시”를 남긴다.
- 동일한 `name`이 이미 `ICONS`에 있으면:
  - 새로 추가하지 말고 기존 엔트리를 재사용한다(또는 기존 key를 알려준다).

## 산출물
- `scripts/generate-mingcute-icons.mjs` 수정
- `npm run icons` 실행으로 `src/assets/mingcuteIcons.js` 자동 업데이트
- (필요 시) 관련 컴포넌트가 `MINGCUTE.<key>`를 사용하도록 최소 수정

