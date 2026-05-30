# Should Phase 8 실행 plan — 마이페이지 썸네일 (저장 시 케이크 윗면 이미지)

- **소스 문서**: [docs/PLAN-SHOULD.md](./PLAN-SHOULD.md) · **Phase 8** (PRD-S6 보강)
- **생성일**: 2026-05-30
- **목표**: 저장 시 케이크 **윗면**을 작은 PNG로 캡처해 오브젝트 스토리지에 올리고, 그 참조를 디자인에 귀속해 마이페이지 카드에 썸네일로 보여준다.

> **번호 메모**: 본 작업은 처음 "Phase 7"로 착수했으나, 병행 머지된 main에 이미 **Phase 7(파이핑 보강)** 이 있어 **Phase 8**로 재번호했다([should-phase-7-plan.md](./should-phase-7-plan.md)=파이핑). 내용·설계는 그대로다.

## 확정 설계 (사용자 결정 + 코드 정독 후 정제)

사용자 결정(추천안): ① 캡처 소스 = **전개도 윗면(top) crop**, ② 저장 = **오브젝트 스토리지(파일), base64 인라인 금지**, ③ 생성 시점 = **저장 직전 프론트**.

코드 정독 후 정제 — **참조는 DB 컬럼이 아니라 `Design.thumbnailAssetId`(doc 필드)로 둔다**:
- 이유: `designs.doc`(JSONB)는 이미 저장/로드/목록/복제에 그대로 왕복한다([repository.ts](../apps/api/src/infra/repository.ts), [supabase.ts](../apps/api/src/infra/supabase.ts)). 짧은 asset id 문자열만 더하므로 **doc 비대 없음**(base64 아님). 백엔드 변경 0 — 마이그레이션·라우트 바디 변경·시그니처 churn 없음.
- 저장 메커니즘은 그대로 **오브젝트 스토리지**: 썸네일 PNG를 기존 `POST /assets`로 올리고([assets/service.ts](../apps/api/src/assets/service.ts)) 받은 `Asset.id`만 doc에 둔다. 렌더는 기존 이미지 요소와 동일하게 [`assetRawSrc(id)`](../apps/web/src/api/client.ts#L103)로 절대 URL을 구성.
- 단일 디자인 문서 원칙(CLAUDE.md)과도 일치 — 썸네일 참조가 문서와 함께 직렬화된다(복제 시 원본 썸네일을 물려받고, 재저장 시 갱신).

## 작업 항목

- [x] W1 (schema) `packages/shared/schema/index.ts`의 `Design`에 `thumbnailAssetId: z.string().optional()` 추가. 왜: 윗면 썸네일 asset 참조를 문서에 귀속(단일 출처). — depends-on: 없음
- [x] W2 (viewer3d/texture) `bakeNet.ts`에서 윗면 path+옆면 rect+요소 마크업을 `netInnerMarkup(design, net)`로 추출해 `buildNetSvg`가 재사용(중복 구현 금지). 왜: 썸네일이 같은 마크업을 윗면 viewBox로만 다시 써야 함. — depends-on: 없음 *(기존 bakeNet 10건 그린 — 출력 보존 회귀 확인)*
- [x] W3 (viewer3d/texture) `topThumbnail.ts` 신설: `buildTopThumbnailSvg(design)`(viewBox=`net.top` rect, 순수 문자열) + `buildTopThumbnail(design, maxPx=256): Promise<Blob>`(rasterize→PNG toBlob). `index.ts`에서 export. 왜: 윗면만 잘라 PNG 생성(Phase 8.1). 좌표·스케일은 `getNet().top`에서만(인라인 좌표 수학 금지). — depends-on: W2
- [x] W4 (share) `useShareSession.save`·`update`에 베스트에포트 썸네일 단계 추가: `buildTopThumbnail` → `uploadAsset(File)` → `thumbnailAssetId`를 저장 스냅샷에 주입(`withTopThumbnail`, try/catch). 실패해도 저장 진행. 왜: 저장 흐름 배선(Phase 8.2). — depends-on: W1, W3
- [x] W5 (mypage) `MyPage` `DesignCard`: `design.thumbnailAssetId` 있으면 `<img src={assetRawSrc(id)}>`(윗면), 없으면 기존 `creamColor` 단색 폴백 유지. 왜: 카드 표시(Phase 8.4). — depends-on: W1
- [x] W6 (test) `topThumbnail.test.ts` 4건(viewBox=net.top·전체bounds 아님·요소/크림 포함·순수) + `schema.test.ts` `thumbnailAssetId` optional 왕복 1건. 왜: 완료 기준 증거. — depends-on: W1, W3
- [x] W7 (docs) [PLAN-SHOULD.md](./PLAN-SHOULD.md) Phase 8(8.0/8.2/8.3/8.4) 문구를 doc-필드 방식으로 동기화하고 증거 있는 완료 기준 체크. — depends-on: W4·W5·W6 검증

> **런타임 수동 항목**(로그인+Supabase 필요 — Phase 6과 동일): 실제 저장 시 PNG 인코딩·`/assets` 업로드, 마이페이지 카드 썸네일 시각 확인, 수정 저장 갱신. canvas `toBlob`/`drawImage` 경로는 라이브 3D 텍스처가 쓰는 `rasterizeNetSvg`와 동일 API라 리스크 낮음.

## 실행 계획 (병렬성)

- **Wave 1 (병렬 가능):** W1, W2 — 서로 다른 패키지/파일(`shared/schema` vs `web/viewer3d/texture`), 공유 상태 없음.
- **Wave 2 (병렬 가능):** W3 — W2의 `netInnerMarkup`에 의존(같은 모듈이라 W2 직후).
- **Wave 3 (병렬 가능):** W4, W5, W6 — 서로 다른 파일(`share` vs `mypage` vs `texture/*.test`), W1·W3 산출물 소비. 공유 쓰기 없음.
- **Wave 4 (순차):** W7 — 검증 통과 후 문서 동기화.

## 검증 (3종)

1. 정적: `pnpm -r typecheck`, `pnpm -r test`, `pnpm -r build`, `pnpm lint`.
2. 완료 기준 매핑: PLAN-SHOULD.md Phase 8 완료 기준 7개 각각에 증거(테스트/빌드/런타임) 연결.
3. 런타임 스모크: web 빌드 통과 + (가능 시) dev 서버에서 저장→마이페이지 카드 썸네일 확인. canvas 래스터화는 브라우저 의존이라 단위 테스트는 순수 SVG까지 검증하고, 픽셀 확인은 수동 항목으로 보고.

## 범위 밖

- 3D 데코(`decorations3d`)는 윗면 썸네일에 미포함(텍스처 아님 — Phase 8.0 명시).
- DB 컬럼/마이그레이션은 하지 않는다(doc 필드로 대체).
