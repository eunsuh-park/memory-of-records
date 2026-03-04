# Timeline / By Type 서브메뉴 로직

Timeline과 By Type 페이지는 같은 갤러리 UI(Jukebox) + 사이드 필터 메뉴를 쓰고, **필터 옵션·데이터 소스·URL만 다릅니다.**

---

## 1. 흐름 요약

```
라우터 (/timeline, /timeline/:period, /by-type, /by-type/:type)
  → Timeline.renderTimeline(period) 또는 ByType.renderByType(type)
  → Jukebox.renderJukeboxWithFilter({ selectedValue, filterOptions, loadNotes, getNotesCount, resolveFilterKey })
  → loadNotes() 로 노트 목록 로드
  → getNotesCount(notes) 로 옵션별 개수 계산
  → renderFilterSubMenu(selectedValue, basePath, filterOptions, counts) 로 #sub-menu에 링크 목록 렌더
  → resolveFilterKey(note) 로 필터링 후 fillJukeboxGallery(filtered)
```

---

## 2. 역할별 파일

| 역할 | Timeline | By Type |
|------|----------|---------|
| **페이지 진입** | `ui/pages/Timeline.js` | `ui/pages/ByType.js` |
| **옵션 정의** | `services/notesData.js` → `periodOptions` | `services/typeOptions.js` → `typeOptions` |
| **데이터 로드** | `services/notionNotebooks.js` → `getNotionNotebooks()` | `services/notionByType.js` → `getNotionTypeItems()` |
| **공통 UI** | `ui/pages/Jukebox.js` → `renderJukeboxWithFilter()` | 동일 |
| **서브메뉴 렌더** | `ui/components/FilterSubMenu.js` → `renderFilterSubMenu()` | 동일 |

---

## 3. 데이터 형태

- **Timeline**  
  - Notion → `notionNotebooks.convertNotionPageToNotebook()`  
  - 노트 필드: `notebookType` (period_name from Notion)  
  - `resolvePeriodKey(notebookType)` → `periodOptions.value` (e.g. `'elementary'`)

- **By Type**  
  - Notion → `notionByType.convertNotionPageToTypeItem()`  
  - 노트 필드: `type` (notebook_type from Notion)  
  - `resolveTypeKey(type)` → `typeOptions.value` (e.g. `'diary'`)

---

## 4. URL ↔ 선택값

- **라우터**  
  - `/timeline/:period` → `renderTimeline(params.period)`  
  - `/by-type/:type` → `renderByType(params.type)`

- **Timeline**  
  - `period`가 없으면: 첫 번째 시기(`periodOptions[0].value`).  
  - `period`가 있으면: `resolvePeriodKey(period)`로 옵션과 매칭, 매칭 실패 시 역시 첫 번째 시기 사용.

- **By Type**  
  - `type`이 없으면: `typeOptions[0].value` (e.g. `'diary'`).  
  - `type`이 있으면: `resolveTypeKey(type)`로 옵션과 매칭, 실패 시 첫 번째 타입 사용.

---

## 5. 서브메뉴 렌더 (FilterSubMenu)

- **컨테이너:** `#sub-menu` (main.js에서 앱 셸에 한 번 선언, 라우터는 다른 페이지로 나갈 때만 `innerHTML = ''`로 비움).
- **호출:** `renderFilterSubMenu(selectedValue, basePath, filterOptions, countsByFilter)`  
  - `selectedValue`: 현재 선택된 옵션의 `value`.  
  - `basePath`: `'/timeline'` 또는 `'/by-type'`.  
  - `filterOptions`: `periodOptions` 또는 `typeOptions`.  
  - `countsByFilter`: 옵션별 노트 개수 `{ [value]: number }`.
- **결과:** `#sub-menu` 안에 `<aside class="sub-menu">` + `basePath/${opt.value}` 링크 목록, `active` 클래스와 개수 표시.

---

## 6. 수정한 오류

- **Timeline: 잘못된 URL period**  
  - 이전: `selectedPeriod = period || 'elementary'` → `/timeline/unknown` 같은 잘못된 값이 그대로 쓰여, 활성 탭 없음 + 빈 갤러리.  
  - 수정: `selectedPeriod = (period ? resolvePeriodKey(period) : null) ?? periodOptions[0]?.value ?? 'elementary'`  
  - 이제 URL에 정의되지 않은 period가 오면 첫 번째 시기로 폴백.
