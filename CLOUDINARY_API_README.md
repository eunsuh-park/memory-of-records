# Cloudinary Admin API 사용 가이드 (프로젝트용)

이 프로젝트는 Cloudinary Admin API를 직접 호출하지 않고, Vercel Serverless Function을 통해서만 접근합니다.
Admin API는 **서버에서만 호출해야 하며**, **rate limit**이 있으니 호출 빈도를 관리해야 합니다.

## 환경 변수

아래 둘 중 하나만 정상 설정되어 있으면 됩니다.

- `CLOUDINARY_URL` (권장)
- 또는 각각: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## 엔드포인트 (현재 프로젝트)

### 기본 통합 엔드포인트 (폴더 파라미터 방식)
- `GET /api/cloudinary`
- 쿼리
  - `folder` (string): 예) `Notebooks/Cover/Front`
  - `max_results` (number, 기본 20, 최대 500)
  - `next_cursor` (string)
- 응답
  - `folder`: 실제 조회한 폴더 경로
  - `folders`: `Notebooks` 하위 폴더 목록
  - `resources`: Cloudinary 리소스 배열
  - `next_cursor`: 다음 페이지 커서 (없으면 null)

### 폴더 고정 엔드포인트 (파일명 기준)
- `GET /api/cloudinary/cloudinary_get_front`
  - `Notebooks/Cover/Front` 고정
- `GET /api/cloudinary/cloudinary_get_back`
  - `Notebooks/Cover/Back` 고정
- `GET /api/cloudinary/cloudinary_get_contents`
  - `Notebooks/Contents` 고정

모든 엔드포인트는 아래 쿼리를 지원합니다.
- `max_results` (number, 기본 20, 최대 500)
- `next_cursor` (string)

## 페이지네이션

Admin API는 한 번에 가져올 수 있는 결과 수가 제한되어 있습니다.
응답에 `next_cursor`가 있으면, 동일 요청에 `next_cursor`를 넣어 다음 페이지를 이어서 호출합니다.

예:
- `GET /api/cloudinary/cloudinary_get_front?max_results=18`
- 응답의 `next_cursor`를 받아서:
  - `GET /api/cloudinary/cloudinary_get_front?next_cursor=받은값`

## 응답에서 URL 추출

`resources` 배열 안의 각 항목에 `secure_url` 또는 `url`이 들어있습니다.
프론트에서는 보통 `secure_url`을 사용하면 됩니다.

## 주의사항

- Admin API는 **rate limit**이 있습니다.
- 반드시 서버에서 호출해야 합니다. (클라이언트 직접 호출 금지)
- 폴더 구조가 바뀌면 prefix(폴더 경로)도 같이 바꿔야 합니다.

## 참고

- Cloudinary Admin API 공식 문서: https://cloudinary.com/documentation/admin_api#transformations
