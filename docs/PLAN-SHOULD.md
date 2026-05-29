# Should 기능 구현 계획 (PRD-S1 ~ PRD-S5)

> 본 문서는 [CLAUDE.md](../CLAUDE.md)의 PRD를 단일 출처로 삼아 **출시 직후 우선 보강(Should)** 기능을 구현하기 위한 실행 계획이다.
> 기능 ID·아키텍처·폴더 역할의 정의는 항상 루트 CLAUDE.md를 따른다. 본 문서는 *어떻게(how)* 와 *순서·계약·완료 기준* 을 다룬다.

## 0. 현재 상태와 전제

- **Must(PRD-M1~M5)는 구현 완료/진행 중**이다. 토대가 이미 서 있다:
  - `packages/shared/schema` — `Design`/`Element`(union)/`Spec`/`Asset`/`Decoration3D` 정의됨. **Should 확장 훅이 이미 선언돼 있다**: `DrawingElement`(S1), `ImageElement`+`Asset`(S4), `Decoration3D`+`Design.decorations3d`(S3), `Spec`(S5).
  - `packages/shared/geometry` — `getNet`/`uvForNetPoint`/`screenToNet`/`netToScreen`/`applyInverseRotation`/`applyForwardRotation`/`boundaryPointForU`/`buildCrossSection`/`recomputeForSpec` 존재. **S5의 `recomputeForSpec`, S2의 역변환·`boundaryPointForU`가 이미 마련됨.**
  - `apps/web/src/document/store` — `setShape`/`setBaseColor`/`setCreamColor`/`addElement`/`moveElement`/`scaleElement`/`rotateElement`/`deleteElement`/`reorderElement`/`updateLettering`/`updatePiping`/`updateIllustration`/`loadDesign`/`getDesignSnapshot`/`setViewport`/`setPendingPiping`. (배치 대기 상태 `pendingPiping` 패턴 = S4/S3 배치 흐름에 재사용 가능.)
  - `apps/web/src/editor2d` — `canvas`/`tools`/`panels`/`elements`(+`assets`) 구현됨.
  - `apps/web/src/viewer3d` — `meshes`/`texture`(굽기 동기화)/`controls`(`CameraControls`) 구현됨. `decorations`는 `CLAUDE.md`만 있는 **빈 폴더**(S3 대상).
  - `apps/api/src` — `designs`/`share`/`infra` 구현됨. `assets`는 `CLAUDE.md`만 있는 **빈 폴더**(S4 대상).
- 스택은 Must와 동일: **TypeScript 모노레포**, Zustand, Three.js + R3F, zod, React + Vite, Node 백엔드 + 오브젝트 스토리지.
- 구현 순서는 CLAUDE.md "구현 순서 3"을 따른다: **PRD-S5 → PRD-S4 → PRD-S1 → PRD-S2 → PRD-S3.**

## 1. 아키텍처 불변식 (모든 Phase에서 강제)

CLAUDE.md의 MVVM 규율을 구현 내내 지킨다. PR 리뷰 체크리스트로도 사용한다. (Must 계획 1장과 동일 — Should에서도 변하지 않는다.)

1. **단일 디자인 문서**: 전개도·3D는 `document/store`의 같은 `Design`을 렌더링한 두 결과다. 동기화 = 재렌더링이지 변환이 아니다. **S5의 규격 변경, S1의 손그림, S4의 이미지도 store에 쓰면 2D·3D가 함께 갱신돼야 한다.**
2. **좌표 단일화**: 모든 요소 좌표는 **전개도(UV) 좌표계**로 저장한다. 픽셀↔전개도 변환·회전 역변환·**3D→전개도 역변환(S2)**·규격 재계산(S5)은 전부 `packages/shared/geometry`의 순수 함수로만 한다. ViewModel/View에서 좌표 수학을 인라인하지 않는다.
3. **레이어 경계**:
   - View(`canvas`, `meshes`, `panels`, `ui`, `decorations`)는 **계산 금지**. 포인터·레이캐스트 이벤트를 ViewModel에 위임만.
   - ViewModel(`tools`, `store` 액션, `texture`, `controls`의 명령부)은 **렌더 기술 import 금지**. 단 `controls`/`decorations`는 R3F 레이캐스트가 불가피한 View 부분과 계산을 분리한다(아래 Phase 4·5 참조).
   - Model(`schema`, `geometry`, `store` 상태)은 **UI를 모른다.**
4. **단방향 흐름**: View 이벤트 → ViewModel 계산 → `store`(Model)에 기록 → 구독으로 모든 View 갱신.
5. **확장 훅 우선 사용**: schema에 이미 선언된 타입(`DrawingElement`/`ImageElement`/`Decoration3D`/`Spec`)을 **재정의하지 말고 채워 쓴다.** 부족한 필드만 보강한다.

> 위반 시 리뷰에서 반려. 특히 S2의 3D→전개도 역변환을 `controls`에 인라인하지 말고 `geometry`로 내린다.

---

## Phase 1 — PRD-S5: 케이크 규격 조정 (`cake` + `geometry` + `store` + `viewer3d`)

**목표**: 사이즈(호수)·높이·층수(단)를 바꾸면 전개도와 3D 매핑이 함께 재계산돼 반영된다.
**의존**: 없음 (Must 완료 위에서 시작).

| 작업 | 산출물 |
|---|---|
| 규격 변경 액션 추가 | `document/store/designStore.ts`에 `setSpec(patch: Partial<Spec>)` 액션. `spec`만 갱신(좌표 재계산은 View가 geometry로). |
| 규격 재계산 함수 검수·보강 | `packages/shared/geometry`의 `recomputeForSpec(shape, spec)` 가 size/height/layers 모두 반영하는지 확인·보강. 필요 시 `getNet`/`buildCrossSection`이 `spec.layers`·`spec.height`를 쓰도록 정리. |
| 규격 조정 UI | `cake/CakeControls.tsx`(또는 신규 `SpecControls.tsx`)에 호수·높이·단수 입력(슬라이더/스텝퍼). `store.setSpec` 호출. |
| 전개도 반영 | `editor2d/canvas`가 `spec` 변경 구독 → `getNet`로 전개도 크기/영역 재구성. 요소 좌표는 전개도 좌표라 불변. |
| 3D 반영 | `viewer3d/meshes`가 `spec` 기반으로 메시 치수·**단수(층)** 재생성, `viewer3d/texture`가 새 UV로 재굽기. |

### 1.1 `store.setSpec` 계약
```ts
// 부분 갱신: 주어진 필드만 교체. 음수/0 방지는 zod Spec(positive/int)로 검증.
setSpec: (patch: Partial<Spec>) => void;
```
- 액션은 `spec` 상태만 바꾼다. geometry 호출·메시 재생성은 구독한 View 책임(단방향 흐름 유지).

### 1.2 다단(layers) 처리
- `layers > 1`이면 메시는 단을 쌓고(높이 = `height * layers` 또는 단별 높이), 전개도 옆면 높이도 그에 맞춰 늘린다. 매핑 규칙은 `geometry`에 집중(메시·텍스처가 동일 규칙 참조).

**완료 기준 (PRD-S5 수용 기준)**:
- [x] 호수·높이·단수를 UI에서 조정할 수 있다. *(cake `SpecControls` 스텝퍼 — 런타임에서 호수 1→2호·층수 1→2단 변경 확인)*
- [x] 규격 변경 시 전개도 뷰 크기/영역이 재계산돼 반영된다. *(런타임: 호수 1→2호에서 옆면폭 47.1→56.5cm(=π·지름), 층수 1→2단에서 옆면높이 7→14cm. `NetEditor`가 `getNet(shape,spec)` 구독)*
- [x] 규격 변경 시 3D 메시 치수·단수와 텍스처 UV가 재계산돼 반영된다. *(런타임: 3D 전환 시 2호·2단 규격이 반영된 큰 실린더 렌더. `CakeMesh`가 `useMemo(getNet,[shape,spec])`로 재생성. **단수는 전체 높이=height×layers로 반영** — 적층 메시는 Phase 1 범위 밖)*
- [x] `geometry.recomputeForSpec`(또는 `getNet`/`buildCrossSection`) 단위 테스트가 size/height/layers 입력에 대해 통과한다. *(geometry.test.ts에 size↑·height↑·layers↑ 민감도 테스트 3건 추가, 전체 29건 통과)*
- [x] 규격 변경 후에도 기존 요소가 전개도 좌표 기준으로 보존된다(좌표 단일화 회귀). *(designStore.test.ts `setSpec` 회귀 테스트: 규격 변경 후 요소 transform 불변 확인)*

---

## Phase 2 — PRD-S4: 사용자 이미지 업로드 & 배치 (`api/assets` + `web/api` + `editor2d` + `texture`)

**목표**: PNG·JPG·SVG 이미지를 업로드해 전개도 위 요소로 배치하고, 일반 요소처럼 이동·크기조절·회전·삭제한다.
**의존**: Phase 0(전제: Must Phase 5 `api`/`infra` 완료). schema `ImageElement`·`Asset` 사용(이미 선언됨).

| 작업 | 산출물 |
|---|---|
| 업로드 백엔드 | `apps/api/src/assets/` — 업로드 라우트·검증(타입 PNG/JPG/SVG, 최대 50MB, 검수 없음)·`Asset` 메타 반환. |
| 스토리지 연동 | `apps/api/src/infra`에 오브젝트 스토리지 put/get 추가(이미 DB 연동 있음). |
| 업로드 클라이언트 | `apps/web/src/api`에 `uploadAsset(file): Promise<Asset>` 추가(스키마 타입 재사용, 로직·상태 없음). |
| 이미지 요소 정의·렌더 | `editor2d/elements`에 `image` 요소 렌더러(자산 URL 로드 → 전개도에 그리기). |
| 업로드/배치 UI | `editor2d/panels`에 파일 선택 → 업로드 → `store.addElement({ type:'image', assetId })`. 배치는 기존 `pendingPiping`류 "대기 후 배치" 패턴 재사용 가능. |
| 3D 굽기 반영 | `viewer3d/texture`가 `image` 요소를 오프스크린 캔버스에 그려 텍스처에 포함. |

### 2.1 업로드 API 계약 (초안)
```
POST /assets            (multipart/form-data: file)
  → 200 { id, url, mime, width, height, sizeBytes }   // Asset
  → 413 파일 50MB 초과
  → 415 허용되지 않는 mime (PNG/JPG/SVG 외)
```
- 검수(내용 심사) 없음 — PRD 명시. 크기·확장자만 막는다.

### 2.2 store 재사용
- 별도 액션 불필요. `addElement`에 `{ type:'image', assetId, transform, zIndex }` 전달. 이동/스케일/회전/삭제는 기존 `moveElement`/`scaleElement`/`rotateElement`/`deleteElement` 재사용.

**완료 기준 (PRD-S4 수용 기준)**:
- [x] PNG·JPG·SVG 파일을 업로드할 수 있다. *(POST /assets 실제 HTTP: PNG 201+Asset; JPEG/SVG 치수 파싱 단위 테스트; mime accept 3종)*
- [x] 50MB 초과·비허용 타입이 거부된다. *(라우트 inject 테스트 413/415 + 실제 HTTP 415 확인)*
- [x] 업로드한 이미지가 전개도 요소로 배치된다. *(LibraryPanel→addElement({type:'image'}) 타입검증, imageMarkup `<image>` 단위 테스트)*
- [x] 이미지 요소를 일반 요소처럼 이동·크기조절·회전·삭제할 수 있다. *(기존 tools 재사용, elementLocalSize(image) 종횡비 단위 테스트로 히트박스 검증)*
- [x] 배치한 이미지가 3D 전환 시 텍스처에 반영된다. *(bakeNet: 이미지 data URI가 굽기 입력 SVG에 포함됨을 단위 테스트로 확인; CakeViewer3D version 재굽기 배선. 픽셀 시각 확인은 브라우저 권장)*

---

## Phase 3 — PRD-S1: 전개도 손그림 그리기 (`editor2d/tools` + `canvas` + `elements` + `store`)

**목표**: 전개도 위에 펜으로 자유 손그림을 그리고(브러시 굵기·색상), 획 단위로 지운다.
**의존**: 없음 (Must editor2d 위). schema `DrawingElement` 사용(이미 선언됨: `points`/`color`/`width`).

| 작업 | 산출물 |
|---|---|
| 펜 도구 | `editor2d/tools`에 펜 도구: 포인터 경로를 `screenToNet`으로 전개도 좌표 점열로 변환 → `DrawingElement` 1개 = 1획. |
| 획 단위 지우개 | `editor2d/tools`에 지우개: 포인터가 닿은 `drawing` 요소를 `deleteElement`로 제거(획 단위). |
| 드로잉 추가 액션 | `document/store`에 `addDrawing(points, color, width)` (또는 `addElement`로 `type:'drawing'` 직접 추가). |
| 캔버스 입력 | `editor2d/canvas`가 펜/지우개 모드에서 포인터 스트림을 tools에 위임(계산은 tools). |
| 도구·브러시 UI | `editor2d/panels`(또는 툴바)에 펜/지우개 토글, 브러시 굵기·색상 선택. |
| 렌더·굽기 | `editor2d/elements`에 `drawing` 렌더러(점열→경로), `viewer3d/texture`가 동일 경로를 굽기에 포함. |

### 3.1 좌표·획 계약
- 펜 중 모은 화면 점은 **반드시 `geometry.screenToNet`** 으로 전개도 좌표로 변환해 저장(픽셀 저장 금지 — 좌표 단일화).
- 1획 = `DrawingElement` 1개. 지우개는 요소 단위 삭제이므로 별도 자료구조 불필요.
- 연속 드래그 1획은 store 커밋 1건으로(미래 C2 undo 대비; 지금은 단순 커밋이라도 1획=1요소 유지).

**완료 기준 (PRD-S1 수용 기준)**:
- [x] 전개도 위에 펜으로 자유 손그림을 그릴 수 있다. *(런타임: 펜 모드(data-drawing-tool=pen·cursor crosshair)에서 포인터 드래그 → `drawing` 요소 1건 생성·SVG polyline 렌더 확인. `addDrawing` 단위 테스트.)*
- [x] 브러시 굵기·색상을 바꿀 수 있고 결과에 반영된다. *(DrawingPanel 슬라이더·ColorPicker→`setBrush`; 런타임 polyline stroke=#5a3b3b·stroke-width=2 반영. `setBrush` 부분 갱신 단위 테스트.)*
- [x] 획 단위 지우개로 한 획을 지울 수 있다. *(런타임: 지우개 모드(cursor cell) 획 정점 클릭 → 해당 획만 삭제(count 1→0). `pickStrokeAt`/`strokeHit`/`pointToSegmentDistance` 단위 테스트.)*
- [x] 그린 손그림이 3D 전환 시 텍스처에 반영된다. *(`bakeNet` 단위 테스트: 굽기 SVG에 손그림 polyline+색·두께, 점1개는 circle. 굽기 입력=2D와 동일 `elementGroupMarkup` 단일 출처.)*
- [x] 저장 좌표가 전개도 좌표계다(픽셀 인라인 저장 0건 — grep/코드 점검). *(grep: `tools/drawing.ts`·`store`에 clientX/Y 직접 저장 0건. 점은 canvas `toNet`(SVG CTM)으로 전개도 cm 변환 후 저장 — 런타임 points가 cm 좌표.)*

---

## Phase 4 — PRD-S2: 3D 뷰에서 요소 배치/조정 (`viewer3d/controls` + `geometry` + `store`)

**목표**: 3D 뷰에서 직접 요소를 집어 옮기고(옆면 경계·윗면 보정), 그 결과가 전개도 문서에 반영된다.
**의존**: Phase 1~3 권장(요소가 많을수록 의미 있음). **리스크 PoC 우선** — CLAUDE.md가 지목한 "3D→전개도 좌표 역변환".

| 작업 | 산출물 |
|---|---|
| 3D→전개도 역변환 | `packages/shared/geometry`에 `netPointForUV(shape, spec, uv)` (= `uvForNetPoint` 역함수) 또는 `boundaryPointForU` 기반 역변환 추가. |
| 레이캐스트 픽 | `viewer3d/controls`(View)가 R3F 레이캐스트로 메시 위 교점·UV 취득 → ViewModel에 위임. |
| 좌표 변환·명령 | `controls`의 ViewModel 부가 UV→전개도 좌표(geometry) → `store.moveElement`(필요 시 `scaleElement`/`rotateElement`). |
| 선택·드래그 상태 | 3D에서 요소 선택→드래그 추적(시작 UV·교점). 카메라 조작과 충돌하지 않도록 모드 분리. |

### 4.1 역변환 계약 (리스크 핵심)
```ts
// UV(메시) → 전개도 좌표. uvForNetPoint의 역. 옆면/윗면 영역 모두 지원.
netPointForUV(shape: Shape, spec: Spec, uv: UV): Point;
```
- **PoC 먼저**: 원형·사각은 매핑이 직관적. 하트 압출 옆면의 UV→전개도 역변환을 작은 테스트로 먼저 검증한다. 막히면 **원형·사각만 3D 직접배치 지원**으로 축소하고 하트는 후순위 이관(보고 후).
- 레이캐스트·R3F는 `controls`의 View 부분에만. 좌표 수학은 전부 `geometry`. (레이어 경계)

### 4.2 store 재사용
- 새 좌표를 기존 `moveElement(id, {x,y})`에 전달. 미세 조정은 `scaleElement`/`rotateElement` 재사용. 전개도 에디터와 동일 액션을 쓰므로 동기화가 "공짜".

**완료 기준 (PRD-S2 수용 기준)**:
- [ ] 3D 뷰에서 요소를 선택해 직접 옮길 수 있다. *(메시 위 드래그 → 위치 변경 런타임 확인)*
- [ ] 3D에서 옮긴 결과가 전개도 뷰에도 동일하게 반영된다. *(3D 이동 → 전개도 전환 시 같은 위치, 동기화 회귀)*
- [ ] 3D→전개도 역변환이 `geometry` 순수 함수로 제공되고 단위 테스트를 통과한다(`netPointForUV` round-trip). *(하트 포함 또는 리스크 축소 보고)*
- [ ] 옆면 경계·윗면 영역에서 배치/보정이 동작한다. *(경계 케이스 런타임 확인)*

---

## Phase 5 — PRD-S3: 3D 요소(입체 데코) 배치 (`viewer3d/decorations` + `store` + schema `Decoration3D`)

**목표**: 초·토퍼·과일 등 입체 오브젝트를 3D 케이크 위에 배치한다.
**의존**: **Phase 4(PRD-S2) 이후** — PRD가 S3를 S2보다 후순위로 명시. schema `Decoration3D`·`Design.decorations3d` 사용(이미 선언됨).

| 작업 | 산출물 |
|---|---|
| 데코 액션 | `document/store`에 `addDecoration3D(input)`·`moveDecoration3D(id,pos)`·`rotateDecoration3D(id,rot)`·`removeDecoration3D(id)`. `decorations3d` 배열 갱신. |
| 데코 메시 | `viewer3d/decorations`에 `candle`/`topper`/`fruit` 오브젝트 렌더러(타입별 메시/모델). |
| 표면 배치 | Phase 4의 레이캐스트·`boundaryPointForU`로 케이크 표면 위 위치 산출 → `Decoration3D.position`(Vec3). |
| 데코 라이브러리 UI | `viewer3d` 패널 또는 `ui`에 데코 종류 선택 → 배치 대기 → 클릭 위치에 추가. |

### 5.1 데코 store 계약
```ts
addDecoration3D: (input: { type: 'candle'|'topper'|'fruit'; position: Vec3; rotation: Vec3 }) => string;
moveDecoration3D: (id: string, position: Vec3) => void;
rotateDecoration3D: (id: string, rotation: Vec3) => void;
removeDecoration3D: (id: string) => void;
```
- 데코는 전개도 텍스처가 아니라 **3D 씬의 오브젝트**다 → `texture` 굽기와 무관. `decorations3d`는 `Design`에 저장되므로 공유/복제에 함께 직렬화된다.

**완료 기준 (PRD-S3 수용 기준)**:
- [ ] 최소 3종(초/토퍼/과일) 입체 데코를 배치할 수 있다. *(각 타입 추가 → 3D 렌더 런타임 확인)*
- [ ] 데코를 케이크 표면 위 원하는 위치에 둘 수 있다(이동·삭제). *(배치/이동/삭제 런타임 확인)*
- [ ] 배치한 데코가 `Design.decorations3d`에 저장돼 공유/복제에 포함된다. *(저장→로드 왕복으로 데코 보존 확인)*
- [ ] 데코 store 액션 단위 테스트 통과.

---

## 6. 의존 그래프 / 권장 순서

```
(Must 완료)
  ├─ Phase 1 PRD-S5 규격조정 (cake·geometry·meshes·texture)   ← 독립
  ├─ Phase 2 PRD-S4 이미지 업로드 (api/assets·web/api·editor2d) ← 독립(Must Phase5 전제)
  ├─ Phase 3 PRD-S1 손그림 (editor2d·texture)                  ← 독립
  └─ Phase 4 PRD-S2 3D 직접배치 (controls·geometry)            ← 리스크 PoC
        └─ Phase 5 PRD-S3 3D 데코 (decorations)                ← S2의 표면 픽 재사용
```

- **CLAUDE.md 권장 순서**(S5→S4→S1→S2→S3)를 기본 진행 순서로 둔다.
- **Phase 1·2·3 은 서로 독립적**이라 병렬 가능: 각각 주로 다른 폴더를 건드린다 — S5=`cake`/`geometry`/`meshes`, S4=`api/assets`/`web/api`/`editor2d/panels`, S1=`editor2d/tools`. **단, 셋 다 `viewer3d/texture` 굽기를 건드릴 수 있으니** texture 변경은 순차 머지 또는 충돌 조정 필요.
- **Phase 4(S2) 는 리스크 선검증** — `netPointForUV` 역변환을 작은 테스트로 먼저 통과시키고 본 구현에 들어간다. 막히면 원형·사각으로 축소 후 보고.
- **Phase 5(S3) 는 Phase 4 이후** — 표면 위 좌표 픽킹(레이캐스트)을 S2에서 마련한 것을 재사용한다.

## 7. 교차 검증 (완료 정의)

- [ ] **동기화 회귀**: S5 규격 변경·S4 이미지·S1 손그림을 추가/변경 → 2D↔3D 전환 시 모두 반영(스냅샷/시각).
- [ ] **좌표 단일화 grep**: S1 펜 경로·S2 3D 픽·S5 재계산이 전부 `geometry` 경유. `editor2d`/`viewer3d`에 인라인 좌표 수학 0건.
- [ ] **역변환 round-trip**: `netPointForUV(uvForNetPoint(p)) ≈ p` (원형/사각 필수, 하트 통과 또는 축소 보고).
- [ ] **레이어 경계 린트**: `tools`/`store`/`texture`/`controls`(ViewModel부)에서 three/r3f/canvas import 0건 유지.
- [ ] **공유 왕복 확장**: 이미지(S4)·손그림(S1)·데코(S3)·규격(S5)이 포함된 디자인을 저장→editToken 수정→viewToken 열람·복제→복제본 독립 수정까지 보존.
- [x] **자산 업로드 한계**: 50MB 초과·비허용 mime 거부가 회귀 없이 유지. *(Phase 2: api 라우트 413/415 테스트 + 실제 HTTP 415)*

## 8. 범위 밖 (혼동 방지)

- **Could 기능은 본 계획 밖**: undo/redo(PRD-C2, `document/history`), 라이브러리 검색·템플릿(PRD-C1), 3D 내보내기(PRD-C3), 링크 만료·접근 제어(PRD-C4). 단 S1의 "1획=1요소·1커밋" 규칙은 미래 C2 undo를 막지 않도록 유지한다.
- **Won't 그대로 제외**: 주문·결제, 로그인·계정, 실시간 공동 편집, 네이티브 앱, 케이크 외 제품.
- **확장 훅 유지**: S3 데코 타입은 `Decoration3D.type`의 enum(`candle`/`topper`/`fruit`)에 한정하되, 미래 데코 추가를 막지 않도록 enum 한 곳에서만 늘린다. S4 `Asset`·S2 `netPointForUV`는 공용(`shared`)에 두어 백엔드·다른 뷰가 재사용할 수 있게 한다.
