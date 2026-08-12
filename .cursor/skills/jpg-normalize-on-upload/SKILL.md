---
name: jpg-normalize-on-upload
description: >-
  페이지(이미지·PDF) 업로드 전에 JPG 정규화(동일 장변·비율 유지·고해상도 JPEG)를
  반드시 확인·적용한다. AddPageModal, pages.js 변환, Cloudinary page 업로드,
  PDF→JPEG 변환을 다룰 때 사용한다.
---

# JPG 이미지 자동 정규화 (페이지 업로드)

페이지를 Cloudinary `page-*.jpg`로 올리기 **직전**에 항상 정규화를 거친다.
에이전트는 업로드 경로를 수정·추가할 때 이 체크리스트를 먼저 확인한다.

## 필수 규칙

1. **업로드 직전 정규화 필수**  
   `uploadPageImage` / `/api/pages` `op: upload` 로 보내기 전에  
   `normalizePageImageToJpeg` (`src/services/pages.js`)를 반드시 통과시킨다.
2. **원본 PNG/GIF/비정규 JPEG도 동일 경로**  
   `convertImageDataUrlToJpeg`만 쓰지 말고, 장변 제한이 포함된  
   `normalizePageImageToJpeg`를 쓴다. (내부에서 JPEG 변환 + 장변 스케일)
3. **PDF도 동일**  
   `convertPdfFileToJpegDataUrls`는 렌더 후 각 페이지에 정규화를 적용해야 한다.  
   기본 렌더 스케일·품질 상수를 `pages.js`의 export 값과 맞춘다.
4. **해상도**  
   - 장변 목표: `PAGE_JPEG_MAX_EDGE` (기본 **3200px**) — 비율 유지, 확대는 하지 않음  
   - JPEG 품질: `PAGE_JPEG_QUALITY` (기본 **0.95**)  
   - PDF 렌더 스케일: `PDF_RENDER_SCALE` (기본 **2.5**)  
   이보다 낮추지 않는다. 더 낮춰야 하면 사용자 확인 후 상수만 조정한다.
5. **서버 하드코딩 금지**  
   클라이언트에서 정규화한 JPEG를 올린다. 서버(`api/pages.js`)에 sharp 리사이즈를  
   새로 넣지 않는 한, 클라이언트 경로를 깨지 말 것.

## 작업 체크리스트

페이지 업로드·변환 코드를 만질 때:

- [ ] `AddPageModal` 이미지 선택 경로가 `normalizePageImageToJpeg`를 호출하는가
- [ ] PDF 변환 결과가 정규화된 JPEG data URL인가
- [ ] `uploadPageImage` payload의 `file`이 이미 정규화된 JPEG인가
- [ ] `PAGE_JPEG_MAX_EDGE` / `PAGE_JPEG_QUALITY` / `PDF_RENDER_SCALE`을 임의로 낮추지 않았는가
- [ ] 미리보기·업로드가 같은 정규화 결과를 쓰는가 (미리보기만 저해상도 금지)

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/services/pages.js` | `normalizePageImageToJpeg`, PDF 변환, 상수 |
| `src/components/AddPageModal/AddPageModal.js` | 선택·변환·업로드 UI |
| `api/pages.js` | Cloudinary 업로드 (format jpg) |

## 회귀 방지

- 새로 이미지→업로드 경로를 추가하면 이 skill을 다시 읽고 정규화 호출을 넣을 것.
- “원본 해상도 그대로” 업로드는 노트마다 크기가 들쭉날쭉해지므로 허용하지 않는다.
