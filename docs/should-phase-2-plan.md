# Should Phase 2 상세 실행 계획 — PRD-S4 사용자 이미지 업로드 & 배치

> 소스: [docs/PLAN-SHOULD.md](./PLAN-SHOULD.md) Phase 2 · phase 번호: 2 · 생성일: 2026-05-29
> 격리: 다른 세션이 Phase 1을 진행 중이라 본 작업은 git worktree
> `.claude/worktrees/phase-2-image-upload`(브랜치 `feat/phase-2-image-upload`)에서 진행한다.
> 기반: `feat/phase-5-share` HEAD(Must 완료) 위. 아키텍처·레이어 규율은 루트 CLAUDE.md를 따른다.

## 목표

PNG·JPG·SVG 이미지를 업로드해 전개도 위 요소로 배치하고, 일반 요소처럼 이동·크기조절·회전·삭제하며, 3D 전환 시 텍스처에 함께 구워진다.

## 설계 결정 (근거)

- **단일 마크업 출처 유지**: 이미지도 일러스트(`illustration`)와 동일하게 `elementSvg`의 순수 빌더가 `<image href=...>` 마크업을 만든다 → 2D View와 3D 베이커가 같은 마크업을 공유(동기화 "공짜").
- **data URI 임베드**: 3D 굽기(`rasterizeNetSvg`)는 SVG를 data URL 이미지로 캔버스에 그린다. 외부 URL을 SVG 안에 두면 브라우저가 로드를 막거나 캔버스를 오염시켜 텍스처가 깨진다. 따라서 일러스트와 동일하게 **이미지를 data URI로 임베드**한다.
- **assetId → data URI 레지스트리**: schema `ImageElement`는 `assetId`만 갖는다(문서 비대화 방지). 클라이언트에 `assetId → {dataUri,width,height}` 레지스트리(zustand)를 두고, 순수 빌더가 동기 조회한다(일러스트의 번들된 `illustrationAsset` 패턴과 동형). 신규 업로드 시 파일에서 즉시 등록, 공유/재적재 시 서버에서 받아 등록한다.
- **저장소 어댑터 분리**: M5의 `DesignRepository`처럼 `AssetStorage` 인터페이스 + 인메모리/Supabase 구현. 도메인(`assets`)은 인프라 세부를 모른다.
- **치수는 서버에서 파싱**: `Asset.width/height`를 위해 PNG/JPEG/SVG 헤더에서 치수를 읽는 순수 함수를 둔다(테스트 용이). 못 읽으면 0(스키마 nonnegative 허용).

## 작업 항목

### 백엔드 (apps/api)
- [x] W1 (api/infra) `AssetStorage` 인터페이스 + `createInMemoryAssetStorage` + `createSupabaseAssetStorage`(Storage 버킷 put/get). `infra/index.ts`에서 export. — depends-on: 없음
- [x] W2a (api/assets) `imageDimensions(bytes, mime)` 순수 헬퍼(PNG/JPEG/SVG 치수 파싱). — depends-on: 없음
- [x] W2b (api/assets) `createAssetService(storage)`: mime(PNG/JPG/SVG)·크기(≤50MB) 검증 → 저장 → `Asset` 반환, `get(id)`. `PayloadTooLargeError`/`UnsupportedMediaTypeError`. — depends-on: W1, W2a
- [x] W3 (api/assets routes + 배선) `registerAssetRoutes`(`POST /assets` multipart, `GET /assets/:id/raw`). `@fastify/multipart` 추가, `buildServer`에 스토리지 env 선택 배선, `routes.ts` 에러 매핑(413/415). — depends-on: W2b

### 프론트 (apps/web)
- [x] W4 (web/api) `uploadAsset(file): Promise<Asset>`(multipart), `assetSrc(asset): string`(절대 URL). — depends-on: Asset 스키마(존재)
- [x] W5 (editor2d/elements) `imageAssets.ts`: `useImageAssetStore`(레지스트리+version), `getImageAsset`, `registerImageAsset`, `fileToImageAsset`(File→dataUri+치수, DOM), `resolveImageAsset`(URL→dataUri, DOM), `useResolveImageAssets()` 훅. — depends-on: 없음(스키마)
- [x] W6 (editor2d/elements) `elementSvg`에 `imageMarkup`(레지스트리 data URI를 `<image>`로), `catalog.elementLocalSize` image가 레지스트리 종횡비 사용. — depends-on: W5
- [x] W7 (editor2d/panels) `LibraryPanel`에 "이미지" 섹션: 파일 선택 → `uploadAsset` → 등록 → `addElement({type:'image',assetId})` → 선택. — depends-on: W4, W5
- [x] W8 (배선) `App`에서 `useResolveImageAssets()` 마운트, `NetEditor`·`CakeViewer3D`가 이미지 `version` 구독해 재렌더/재굽기. — depends-on: W5

### 테스트
- [x] T1 (api) `imageDimensions` 단위 테스트(PNG/JPEG/SVG). — depends-on: W2a
- [x] T2 (api) 업로드 서비스/라우트 테스트: 허용 타입 통과·`413`·`415`(Fastify `inject`). — depends-on: W3
- [x] T3 (web) `imageMarkup`·`elementLocalSize(image)` 순수 테스트(레지스트리 시드 후). — depends-on: W6

## 실행 계획 (병렬성)

- **Wave 1 (병렬 가능):** W1, W2a, W4, W5 — 서로 다른 폴더(api/infra·api/assets·web/api·editor2d/elements), 공유 상태 없음.
- **Wave 2 (병렬 가능):** W2b(←W1,W2a), W6(←W5) — 서로 다른 앱.
- **Wave 3 (병렬 가능):** W3(←W2b), W7(←W4,W5), W8(←W5) — 라우트/패널/배선.
- **Wave 4:** T1·T2·T3 + 정적 검사 + 런타임 스모크.

> Phase 1(PRD-S5)은 `viewer3d/texture` 굽기를 함께 건드릴 수 있다(PLAN-SHOULD.md §6 경고). 본 Phase는 `bakeNet.ts`의 **로직을 바꾸지 않고** 요소 마크업 경로(`elementSvg.imageMarkup`)만 채우므로 충돌면이 작다. 병합 시 `elementSvg.ts`만 조정하면 된다.

## 완료 기준 (PRD-S4 수용 기준, PLAN-SHOULD.md Phase 2)

- [x] PNG·JPG·SVG 파일을 업로드할 수 있다. *(업로드 라우트 + 클라이언트 왕복, `Asset` 반환)*
- [x] 50MB 초과·비허용 타입이 거부된다. *(api 테스트 413/415)*
- [x] 업로드한 이미지가 전개도 요소로 배치된다. *(`addElement({type:'image'})` → 캔버스 렌더)*
- [x] 이미지 요소를 일반 요소처럼 이동·크기조절·회전·삭제할 수 있다. *(기존 tools 재사용)*
- [x] 배치한 이미지가 3D 전환 시 텍스처에 반영된다. *(굽기 결과 시각)*

## 범위 밖

- 이미지 내용 검수/리사이즈/썸네일 (PRD 명시: 검수 없음).
- 손그림(S1)·3D 직접배치(S2)·데코(S3)·규격(S5)은 각 Phase 소관.
- 공유 왕복 전체(§7 교차검증)는 본 Phase에서 자산 재적재 경로(`useResolveImageAssets`)까지만 마련하고, 전체 왕복 검증은 교차검증 단계에서.
