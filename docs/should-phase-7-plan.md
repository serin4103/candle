# Should Phase 7 상세 실행 plan — 파이핑 보강

- **소스 문서**: [docs/PLAN-SHOULD.md](./PLAN-SHOULD.md) Phase 7
- **PRD 근거**: 루트 [CLAUDE.md](../CLAUDE.md) PRD-M3(파이핑 보강)
- **생성일**: 2026-05-30

## 목표 (소스 Phase 7)
1. 파이핑 추가 패널을 손그림 패널처럼 라이브러리에서 **분리한 독립 패널**로.
2. 모양 + **굵기** + **색상** 지정.
3. 별모양(`star-tip`) 제거 → **물방울(`teardrop`)** 추가.
4. 원형(도트)·물방울은 **점 사이 빈 공간 없이**(점 간격 = 점 지름) 채움.
5. 선택 시 대각선 핸들 + **파이핑 방향 수평 확장 핸들**, 드래그하면 **개수(런 길이) 증감**.

## 설계 결정 (코드 근거)
- **`width`는 schema에서 optional**(`z.number().positive().optional()`)로 둔다 — 기존 저장 디자인·테스트(`bakeNet.test`는 width 없이 piping 생성)가 깨지지 않게 하고, 렌더·생성 시 `DEFAULT_PIPING_WIDTH`로 보강한다. 패널은 항상 width를 채워 추가한다. (확장 훅 원칙: 부족한 필드만 보강.)
- **빈틈 없는 배치**: `count = max(1, round(length / width))`, `spacing = length / count`, 점 지름 = `spacing`(서로 접함). 길이를 늘리면 count가 늘어 개수 증감 요구(5)를 자동 충족.
- **수평 핸들 = length 변경**(스케일 불변). 반대편 변 중점을 고정점으로 두고 포인터를 축에 투영해 새 length·중심을 계산 — 기존 대각 스케일 제스처와 동일한 투영 방식(`tools/gestures`)을 따른다. 좌표 변환은 `shared/geometry`(`applyForwardRotation`) 재사용.
- `star-tip`은 카탈로그에서 제거하되 `pipingMarkup`은 미상 variant를 dots로 폴백 → 옛 데이터 안전.

## 작업 항목
- [x] W1 (shared/schema) `PipingElement`에 `width?: number(positive)` 추가 — depends-on: 없음
- [x] W2 (editor2d/elements/catalog) `pipingVariants` 별→물방울 교체, `DEFAULT/MIN/MAX_PIPING_WIDTH` 상수, `pipingCount(length,width)` 헬퍼, `elementLocalSize(piping)` height=width 기반 — depends-on: 없음
- [x] W3 (editor2d/elements/elementSvg) `pipingMarkup(variant,color,length,width)` — teardrop path 추가, dots/teardrop 빈틈 없는 배치, scallop은 width를 두께로, star-tip 분기 제거 — depends-on: W2
- [x] W4 (editor2d/elements ElementView·PipingPreview) `PipingRun`에 `width` prop, 미리보기 width 기반 — depends-on: W3
- [x] W5 (document/store) `PipingPatch`에 `width`·`length` 추가, `pendingPiping`에 width, `setPendingPiping`/`updatePiping` 시그니처 확장 — depends-on: W1
- [x] W6 (editor2d/tools) `handles.ts`에 `edgeMidPoint(e|w)`·`SideHandle` 추가, `gestures.ts`에 `LengthGesture`(`beginLength`/`applyLength`)와 `TransformPatch.length` — depends-on: 없음
- [x] W7 (editor2d/canvas NetEditor) 수평 핸들 렌더(SelectionOverlay)·`pickHandle` 확장·length 제스처 위임, piping 생성/미리보기에 width 반영 — depends-on: W4, W5, W6
- [x] W8 (editor2d/panels) `PipingPanel.tsx` 신설(모양·굵기·색상), `LibraryPanel`에서 파이핑 섹션 제거, `panels/index.ts` export, `App.tsx`에 렌더(2D 전용이라 `view==='net'` 게이트로 3D 자동 숨김) — depends-on: W2, W5
- [x] W9 (tests) schema width, catalog 물방울/상수, elementSvg 빈틈 없음·teardrop, gestures length, store width/length 패치 — depends-on: W1~W8

## 실행 계획 (병렬성)
- **Wave 1 (병렬):** W1(schema), W2(catalog), W6(tools) — 서로 다른 패키지/파일, 공유 상태 없음
- **Wave 2 (병렬):** W3(elementSvg ← W2), W5(store ← W1) — 서로 다른 파일
- **Wave 3 (병렬):** W4(ElementView/Preview ← W3), W8(PipingPanel/LibraryPanel/App ← W2,W5) — 서로 다른 파일
- **Wave 4 (순차):** W7(NetEditor ← W4,W5,W6) — 핸들·제스처·width 통합 지점
- **Wave 5 (순차):** W9(테스트) — 구현 전체 검증

## 완료 기준 (소스 Phase 7)
- [x] 파이핑 추가가 독립 패널로 분리되고 라이브러리에 파이핑 섹션이 없다.
- [x] 패널에서 모양·굵기·색상을 지정해 배치하고 결과 반영.
- [x] 별모양 제거 + 물방울 제공(`star-tip` 잔존 0건 grep).
- [x] 원형·물방울이 빈 공간 없이 그려진다(간격 = 지름).
- [x] 선택 시 대각선 + 수평 확장 핸들 표시.
- [x] 수평 핸들 드래그로 개수 증감(length 변경, 스케일 불변).
- [x] 3D 전환 시 텍스처 반영(마크업 단일 출처).
- [x] 좌표·길이 계산 geometry/gestures 경유(인라인 좌표 수학 0건 grep).
- [x] 단위 테스트 통과.
</content>
</invoke>
