---
name: conventional-commits
description: >-
  git 커밋 메시지를 Conventional Commits 1.0.0 형식으로 작성한다.
  「커밋해」「커밋 메시지」「conventional commit」하거나 코드를 커밋할 때 사용한다.
---

# Conventional Commits

커밋 메시지는 [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)을 따른다.
이 레포는 설명(description)만 한국어로 쓴다.

사용자가 커밋을 요청했을 때만 커밋한다. 메시지에 AI 서명·Co-authored-by를 넣지 않는다.

## 형식

```
<type>[optional scope][optional !]: <description>

[optional body]

[optional footer(s)]
```

- `type` 뒤에 콜론과 공백은 필수다. (`feat: …`)
- `scope`는 선택이다. 쓰면 소문자 명사, 괄호로 감싼다. (`fix(jukebox): …`)
- 이 레포는 scope를 **필요할 때만** 쓴다. 화면·모듈이 분명할 때 (`viewer`, `jukebox`, `auth`).
- 깨는 변경은 type/scope 바로 뒤에 `!`를 붙인다. (`feat(auth)!: …`)

## type

| type | 언제 |
|------|------|
| `feat` | 사용자에게 보이는 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서만 (`README`, `Design.md`, 스킬, 주석 설명) |
| `style` | 포맷·공백·세미콜론. 동작 변화 없음 |
| `refactor` | 동작은 같고 구조만 바꿈 |
| `perf` | 성능 |
| `test` | 테스트 추가·수정 |
| `chore` | 빌드·설정·아이콘 생성·의존성. 앱 동작과 무관 |
| `revert` | 이전 커밋 되돌림 |

`feat` / `fix`만 스펙상 필수 type이다. 나머지는 위 표만 쓴다. `update`, `wip`, `changes` 같은 임의 type은 쓰지 않는다.

## description (한국어)

콜론+공백 뒤에 한 줄 요약을 쓴다.

- 한국어, 현재형 **「~한다」** 로 끝낸다.
- 무엇을 바꿨는지 구체적으로. 파일이름 나열은 하지 않는다.
- 마침표·이모지·이슈번호는 제목에 넣지 않는다.
- 50~72자 안으로 맞춘다.
- 명령문(`추가해`, `수정함`)·과거형(`추가했다`)·명사만 (`오버레이 제거`)은 쓰지 않는다.

맞음:

```
feat: 홀수 장 북플립에 회색 가상 페이지를 넣어 뒷표지 안쪽을 채운다
fix: 모바일 주크박스의 보기/채우기 오버레이를 제거한다
docs: 커밋 메시지에 Conventional Commits 스킬을 추가한다
chore: 쓰지 않는 아이콘 import를 제거한다
```

틀림:

```
Update jukebox
feat: 오버레이 제거
fix: 버튼을 삭제했습니다.
feat(Jukebox): Add demo note
```

## body · footer

본문이 필요하면 제목 다음 **빈 줄 한 줄** 뒤에 쓴다. 왜 바꿨는지, 범위, 후속 주의만.

푸터는 본문 다음 빈 줄 뒤에 둔다.

- 깨는 변경: `BREAKING CHANGE: …` (또는 type 뒤 `!`)
- 이슈 연결이 있으면 `Refs: #12` 처럼 토큰을 쓴다. 공백 대신 `-`.

## 한 커밋의 범위

- 한 커밋 = 한 의도. feat와 무관한 chore를 섞지 않는다.
- 사용자가 「일단 커밋해」라고만 해도 이 형식을 지킨다.
- 이미 커밋된 워킹트리가 깨끗하면 빈 커밋을 만들지 않고 그 사실을 알린다.

## 절차

1. `git status` · `git diff` · `git log -8 --format='%s'` 로 스타일과 변경을 확인한다.
2. type을 고른다. 새 UI/동작이면 `feat`, 잘못된 동작을 고치면 `fix`.
3. 위 형식의 메시지로 `git add` 후 `git commit` 한다.
4. 푸시는 사용자가 요청했거나 이 작업의 브랜치 규칙이 있을 때만 한다.
