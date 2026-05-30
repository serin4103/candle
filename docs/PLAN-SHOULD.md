# Should 기능 구현 계획 (PRD-S1·S3·S4·S5·S6)

> **PRD-S2(3D 뷰에서 요소 배치/조정)는 Should → Could로 이동**했다. 본 계획의 Phase 4는 S2 직접배치 대신 **3D 뷰를 읽기 전용화**(요소·손그림 추가 패널 숨김)하는 작업으로 대체됐다.

> 본 문서는 [CLAUDE.md](../CLAUDE.md)의 PRD를 단일 출처로 삼아 **출시 직후 우선 보강(Should)** 기능을 구현하기 위한 실행 계획이다.
> 기능 ID·아키텍처·폴더 역할의 정의는 항상 루트 CLAUDE.md를 따른다. 본 문서는 *어떻게(how)* 와 *순서·계약·완료 기준* 을 다룬다.

## 0. 현재 상태와 전제

- **Must(PRD-M1~M5)는 구현 완료/진행 중**이다. 토대가 이미 서 있다:
  - `packages/shared/schema` — `Design`/`Element`(union)/`Spec`/`Asset`/`Decoration3D` 정의됨. **Should 확장 훅이 이미 선언돼 있다**: `DrawingElement`(S1), `ImageElement`+`Asset`(S4), `Decoration3D`+`Design.decorations3d`(S3), `Spec`(S5).
  - `packages/shared/geometry` — `getNet`/`uvForNetPoint`/`screenToNet`/`netToScreen`/`applyInverseRotation`/`applyForwardRotation`/`boundaryPointForU`/`buildCrossSection`/`recomputeForSpec` 존재. **S5의 `recomputeForSpec`가 이미 마련됨.** (`boundaryPointForU`·`applyInverseRotation`은 Could로 이관된 S2 역변환의 토대로 남겨둔다.)
  - `apps/web/src/document/store` — `setShape`/`setBaseColor`/`setCreamColor`/`addElement`/`moveElement`/`scaleElement`/`rotateElement`/`deleteElement`/`reorderElement`/`updateLettering`/`updatePiping`/`updateIllustration`/`loadDesign`/`getDesignSnapshot`/`setViewport`/`setPendingPiping`. (배치 대기 상태 `pendingPiping` 패턴 = S4/S3 배치 흐름에 재사용 가능.)
  - `apps/web/src/editor2d` — `canvas`/`tools`/`panels`/`elements`(+`assets`) 구현됨.
  - `apps/web/src/viewer3d` — `meshes`/`texture`(굽기 동기화)/`controls`(`CameraControls`) 구현됨. `decorations`는 `CLAUDE.md`만 있는 **빈 폴더**(S3 대상).
  - `apps/api/src` — `designs`/`share`/`infra` 구현됨. `assets`는 `CLAUDE.md`만 있는 **빈 폴더**(S4 대상).
  - `apps/web/src/auth`·`apps/web/src/mypage`·`apps/api/src/auth` — `CLAUDE.md`만 있는 **빈 폴더**(S6 대상, 본 계획에서 신설).
- 스택은 Must와 동일: **TypeScript 모노레포**, Zustand, Three.js + R3F, zod, React + Vite, Node 백엔드 + 오브젝트 스토리지. 인증은 **Supabase Auth(Google OAuth)** 를 추가로 쓴다(S6).
- 구현 순서는 CLAUDE.md "구현 순서 3"을 따른다: **PRD-S5 → PRD-S4 → PRD-S1 → PRD-S3 → PRD-S6.** (**PRD-S2(3D 직접배치)는 Could로 이동** — 본 Should 계획 범위 밖. 그 대신 Phase 4에서 **3D 뷰를 읽기 전용화**해 요소·손그림 추가 패널을 숨긴다.)

## 1. 아키텍처 불변식 (모든 Phase에서 강제)

CLAUDE.md의 MVVM 규율을 구현 내내 지킨다. PR 리뷰 체크리스트로도 사용한다. (Must 계획 1장과 동일 — Should에서도 변하지 않는다.)

1. **단일 디자인 문서**: 전개도·3D는 `document/store`의 같은 `Design`을 렌더링한 두 결과다. 동기화 = 재렌더링이지 변환이 아니다. **S5의 규격 변경, S1의 손그림, S4의 이미지도 store에 쓰면 2D·3D가 함께 갱신돼야 한다.**
2. **좌표 단일화**: 모든 요소 좌표는 **전개도(UV) 좌표계**로 저장한다. 픽셀↔전개도 변환·회전 역변환·규격 재계산(S5)은 전부 `packages/shared/geometry`의 순수 함수로만 한다. ViewModel/View에서 좌표 수학을 인라인하지 않는다. (3D→전개도 역변환은 S2가 Could로 이관돼 본 계획 범위 밖이나, 동일 원칙을 Could 착수 시에도 따른다.)
3. **레이어 경계**:
   - View(`canvas`, `meshes`, `panels`, `ui`, `decorations`)는 **계산 금지**. 포인터·레이캐스트 이벤트를 ViewModel에 위임만.
   - ViewModel(`tools`, `store` 액션, `texture`, `controls`의 명령부)은 **렌더 기술 import 금지**. 단 `controls`/`decorations`는 R3F 레이캐스트가 불가피한 View 부분과 계산을 분리한다(아래 Phase 4·5 참조).
   - Model(`schema`, `geometry`, `store` 상태)은 **UI를 모른다.**
4. **단방향 흐름**: View 이벤트 → ViewModel 계산 → `store`(Model)에 기록 → 구독으로 모든 View 갱신.
5. **확장 훅 우선 사용**: schema에 이미 선언된 타입(`DrawingElement`/`ImageElement`/`Decoration3D`/`Spec`)을 **재정의하지 말고 채워 쓴다.** 부족한 필드만 보강한다.

> 위반 시 리뷰에서 반려. (S2의 3D→전개도 역변환은 Could 이관 — 착수 시에도 `controls`에 인라인하지 말고 `geometry`로 내린다.)

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

## Phase 4 — 3D 뷰 읽기 전용화 (2D 전용 편집 패널 숨김) — PRD-S2는 Could로 이관

> **MoSCoW 변경**: **PRD-S2(3D 뷰에서 요소 배치/조정)는 Should → Could로 이동**했다(루트 CLAUDE.md 반영). 따라서 3D 뷰에서 직접 배치/역변환은 본 Should 계획 범위 밖이다. ID는 기존 참조 호환을 위해 `PRD-S2`로 유지한다.
>
> 그 대신 본 Phase는 **3D 뷰를 읽기 전용(확인 전용)으로 확정**한다 — 3D에서 편집할 수 없으므로 요소·손그림 추가 패널 등 2D 전용 편집 UI를 3D 뷰에서 **숨긴다**. (PRD-M4의 수용 기준에 반영.)

**목표**: 3D 뷰는 360° 회전·확대축소로 **확인만** 한다. 전개도(2D) 뷰 전용 편집 패널(요소 라이브러리/배치, 손그림 펜·지우개·브러시)을 3D 뷰에서는 노출하지 않아, 3D에서 편집 가능한 것처럼 보이는 혼동을 없앤다.
**의존**: Phase 1~3(요소·손그림·이미지 패널이 존재해야 숨길 대상이 있음). 좌표 역변환·레이캐스트 불필요.

| 작업 | 산출물 |
|---|---|
| 뷰 모드 기반 패널 가시성 | App 셸 또는 `editor2d/panels`/`ui` 레이아웃이 현재 뷰 모드(전개도/3D)를 구독 → 3D 모드일 때 **요소 추가 패널·손그림(펜/지우개/브러시) 패널**을 렌더하지 않는다(또는 숨김). |
| 3D 뷰 컨트롤 한정 | `viewer3d`에는 카메라 컨트롤(회전·줌)만 노출. 선택·드래그·배치 입력 핸들러를 붙이지 않는다(읽기 전용). |
| 회귀 방지 | 전개도 뷰로 돌아오면 모든 편집 패널이 그대로 복원된다. |

### 4.1 가시성 계약
- 패널 가시성은 **뷰 모드 상태 하나**로 결정한다(전개도=편집 패널 표시, 3D=숨김). 상태는 셸이 가진 토글(전개도↔3D)과 동일 출처를 구독 — 별도 상태 중복 금지.
- 숨기는 대상: **요소 라이브러리/배치 패널, 손그림 펜·지우개·브러시 패널**. 색상·규격 등 케이크 전체 속성 패널은 3D 확인에도 의미가 있으면 유지할 수 있다(판단은 UX 일관성 우선, 기본은 편집성 패널만 숨김).

**완료 기준**:
- [ ] 3D 뷰로 전환하면 요소 추가 패널과 손그림(펜·지우개·브러시) 패널이 보이지 않는다. *(런타임: 3D 전환 시 해당 패널 미표시 확인)*
- [ ] 전개도 뷰로 돌아오면 두 패널이 정상 복원된다. *(런타임: 전개도 복귀 시 패널 재표시)*
- [ ] 3D 뷰에서 요소/손그림 추가·편집 입력이 동작하지 않는다(읽기 전용). *(3D에서 클릭/드래그가 store를 변경하지 않음 확인)*
- [ ] (참고) PRD-S2 직접배치 자체는 Could 단계로 이관 — 본 Phase는 역변환·레이캐스트를 구현하지 않는다.

---

## Phase 5 — PRD-S3: 3D 요소(입체 데코) 배치 (`viewer3d/decorations` + `store` + schema `Decoration3D`)

**목표**: 초·토퍼·과일 등 입체 오브젝트를 3D 케이크 위에 배치한다.
**의존**: 없음(Must viewer3d 위). **PRD-S2가 Could로 이동**했으므로 더 이상 S2의 표면 픽킹을 전제하지 않는다 — 본 Phase가 필요한 레이캐스트 표면 픽킹을 **자체적으로 마련**한다(데코 위치 산출용이며, 요소의 전개도 좌표 역변환=S2와는 무관). schema `Decoration3D`·`Design.decorations3d` 사용(이미 선언됨).

| 작업 | 산출물 |
|---|---|
| 데코 액션 | `document/store`에 `addDecoration3D(input)`·`moveDecoration3D(id,pos)`·`rotateDecoration3D(id,rot)`·`removeDecoration3D(id)`. `decorations3d` 배열 갱신. |
| 데코 메시 | `viewer3d/decorations`에 `candle`/`topper`/`fruit` 오브젝트 렌더러(타입별 메시/모델). |
| 표면 배치 | 본 Phase에서 마련한 R3F 레이캐스트와 `boundaryPointForU`로 케이크 표면 위 위치 산출 → `Decoration3D.position`(Vec3). (S2 이관으로 더 이상 Phase 4 산출물에 의존하지 않음.) |
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

## Phase 6 — PRD-S6: 로그인(Google) & 소유권 기반 저장 & 마이페이지 (`auth` + `designs` + `web/auth` + `web/mypage`)

**목표**: Google 로그인으로 작성자를 식별하고, 디자인을 **소유자(ownerId)** 에 귀속해 저장한다. 저장하면 편집 URL이 `/d/:id`가 되고, 마이페이지에서 저장 디자인을 모아 보고 다시 열어 편집을 이어간다. 편집 링크(editToken)는 제거하고 편집 권한을 소유권으로 대체한다. **열람 링크(viewToken)·복제 흐름은 유지.**
**의존**: Must Phase 5(저장·공유 토대). 인증은 **Supabase Auth(이미 백엔드가 Supabase 사용)** 에 위임. Should 다른 Phase(S1~S5)와 독립이라 병렬 가능 — 주로 다른 폴더(`auth`/`mypage`/`api/auth`)를 건드린다.

> **설계 결정(확정)**: 인증 = Supabase Auth + **Google OAuth**. 공유 = **열람 링크 유지, 편집 링크 제거**. 비로그인 사용자도 편집·3D·열람은 가능하고 **저장만 로그인 필요**.

### 6.0 Supabase / Google OAuth 설정 체크리스트 (코드 외 인프라 — 배포 작동의 전제)
- [ ] Google Cloud Console: OAuth 클라이언트 생성, **승인된 리디렉션 URI = `https://<project>.supabase.co/auth/v1/callback`** 등록(로컬·배포 공통, Supabase 주소라 도메인 무관).
- [ ] Supabase 대시보드 → Authentication → Providers: **Google 사용 설정**(client id/secret 입력).
- [ ] Supabase → Authentication → URL Configuration: `Site URL` + `Redirect URLs`에 **localhost(`http://localhost:5173`)와 배포 도메인 둘 다** 등록.
- [ ] 환경변수: 프론트 `VITE_SUPABASE_URL`·`VITE_SUPABASE_ANON_KEY`, 백엔드 JWT 검증용 시크릿(또는 `supabase.auth.getUser`로 검증).
- [ ] 운영 전환: Google OAuth 동의화면 "테스트 → 게시".

### 6.1 백엔드 인증 `apps/api/src/auth`
| 작업 | 산출물 |
|---|---|
| JWT 검증 미들웨어 | Supabase 발급 access token(Authorization: Bearer)을 검증하고 `userId`(JWT `sub`)를 요청에 주입. 토큰 없음/무효 → 401. |
| 인증 가드 | 저장·수정·목록·복제 라우트에 적용. 열람(viewToken)·열람 로드는 비인증 허용. |

### 6.2 영속화·도메인 변경 (`infra` + `designs` + `share`)
| 작업 | 산출물 |
|---|---|
| 스키마 마이그레이션 | `designs` 테이블에 `owner_id text not null` 추가. `tokens` 테이블은 **view 역할만** 사용(edit 행 발급 중단). `docs/supabase-schema.sql` 갱신 + 마이그레이션 SQL. |
| 저장소 계약 확장 | `DesignRepository`에 `saveDesign(design, ownerId)`·`listDesignsByOwner(ownerId)`·`getOwner(designId)` 추가. `issueShareLink`는 viewToken만 발급(editToken 제거). |
| designs 서비스 개정 | `create(input, ownerId)` → ownerId 귀속·저장·viewToken 발급. `getById(id, userId)`/`updateById(id, userId, input)` → **소유자 일치 검증**(불일치 403). `listMine(userId)`. `cloneByView`는 로그인 사용자에게 복제본을 **그 사용자 소유로** 부여. |
| editToken 경로 제거 | `getByEdit`/`updateByEdit`와 `/designs/by-edit/*` 라우트 삭제(Must Phase 5가 만든 것을 걷어냄). |

### 6.3 API 라우트 (개정안)
```
POST   /designs              (auth)        → 저장, ownerId 귀속, { design, viewToken } 반환 (design.id = /d/:id)
GET    /designs              (auth)        → 내 디자인 목록(마이페이지)
GET    /designs/:id          (auth, 소유자) → 편집용 로드
PUT    /designs/:id          (auth, 소유자) → 수정 저장 (id 유지)
GET    /designs/by-view/:viewToken          → 비로그인 열람 로드(유지)
POST   /designs/by-view/:viewToken/clone (auth) → 복제 → 새 id·새 viewToken, 복제자 소유
```
- 소유자 불일치 → 403, 없음 → 404. 토큰 미존재/만료 → 404(기존 유지).
- `ShareLink` 스키마에서 `editToken` 제거(또는 마이그레이션 기간 optional). 소유권은 Design **문서가 아니라 DB 메타**(designs.owner_id)로 둔다 — 디자인 문서는 콘텐츠만.

### 6.4 프론트 `apps/web/src/auth` + `mypage` + 기존 `share`/`api`/`App`
| 작업 | 산출물 |
|---|---|
| Supabase 클라이언트·세션 | `auth/`에 anon 키 Supabase 클라이언트, `useAuthSession`(user/session·`signInWithGoogle`·`signOut`). 세션 access token을 `api` 호출 Authorization 헤더에 부착. |
| 로그인/로그아웃 팝업 | `auth/`에 로그인 다이얼로그(Google로 계속하기)·로그인 상태 사용자 메뉴(드롭다운, 로그아웃) 컴포넌트. 상단바 트리거가 이 팝업을 연다. |
| 상단바 버튼(셸) | `App.tsx` 헤더에 **로그인/로그아웃(또는 아바타)**, **저장**, **마이페이지** 버튼 **배치**(전개도/3D 토글과 동일하게 셸 소유). 로그인 트리거는 `auth/` 팝업을 열고, 저장은 `share` 세션, 마이페이지는 `/mypage` 이동에 연결. 비로그인 시 저장 버튼은 로그인 유도. |
| 라우팅 | `share/route.ts`에 `/d/:id`(편집·소유자) 파싱 추가. `/view/:token` 유지, `/edit/:token` 제거. `/mypage` 경로. |
| 세션 훅 개정 | `useShareSession`: 저장은 로그인 필요 → 성공 시 `/d/:id`로 URL 승격. 편집 진입은 `/d/:id` + 소유권 로드(`GET /designs/:id`). editToken 분기 제거. |
| API 클라이언트 개정 | `loadById`·`updateById`·`listMyDesigns` 추가, `loadByEdit`/`updateByEdit` 제거, `saveDesign` 반환을 `{ design, viewToken }`로. |
| 마이페이지 UI | `mypage/`에 저장 디자인 목록(썸네일/이름/수정일) → 선택 시 `/d/:id`로 이동해 편집 이어가기. |

**완료 기준 (PRD-S6 수용 기준)**:
- [x] 비로그인 상태로 편집·3D 확인·열람 링크 열기가 그대로 동작한다(로그인 강제 없음). *(App이 로그인 없이 기본 디자인을 편집·3D 토글 렌더; `/view/:token` 200(curl). web build 통과.)*
- [ ] Google 로그인/로그아웃이 로컬·배포에서 동작한다(리디렉션 URL 등록 후). *(**수동 확인 필요** — Supabase·Google 콘솔 설정 + 실 브라우저. 6.0 체크리스트. 코드: `useAuthSession`·`signInWithOAuth` 배선·build 통과.)*
- [x] 로그인 사용자가 디자인을 저장하면 편집 URL이 `/d/:id`로 바뀐다(고유 id 부여). *(curl: alice 저장 201 → 서버 uuid 부여. `useShareSession.save`가 `replaceUrl(designUrl(id))`로 승격. 브라우저 주소창 시각 확인 권장.)*
- [x] 비로그인 상태에서 저장 시도는 차단되고 로그인으로 유도된다(백엔드 401, 프론트 안내). *(curl: 비로그인 POST /designs → 401. App `onSave`가 비로그인 시 LoginDialog 오픈.)*
- [x] 저장한 디자인은 소유자만 `/d/:id`로 열어 수정할 수 있다(타인/비로그인 접근 403/거부). *(curl: alice 로드/수정 200, bob 로드 403, 수정 view 반영. service.test 소유권 케이스.)*
- [x] 마이페이지에서 내 저장 디자인 목록이 보이고, 선택 시 해당 편집 페이지로 이동해 편집을 이어갈 수 있다. *(curl: GET /designs(alice) 목록 1건, 비로그인 401. `MyPage` 카드→`navigate(designUrl(id))` 배선·build. 브라우저 시각 확인 권장.)*
- [x] 열람 링크(viewToken)로 비로그인 열람·복제가 유지되고, 복제본은 복제자 소유의 새 디자인이 된다. *(curl: by-view 200, bob 복제 201→복제본 bob 소유(alice 403), 비로그인 복제 401. service.test 복제 소유권.)*
- [x] editToken 경로(`/edit/:token`, `/designs/by-edit/*`)가 제거됐다(잔존 참조 0건 — grep 점검). *(grep: 소스에 functional editToken/by-edit 0건 — 주석·부정단언 테스트만 잔존.)*
- [x] designs 서비스 단위 테스트: 소유자 일치/불일치(403)·내 목록·복제 소유권·비로그인 저장 차단. *(`designs/service.test.ts` 7케이스 + `routes.test.ts` 4케이스 + `auth/verifier.test.ts` 3케이스 통과.)*

### 6.5 리스크 / 주의
- **순서 의존**: 소유권 저장(6.2)은 인증(6.1)이 있어야 의미가 있다 → 6.1 → 6.2 → 6.3 → 6.4 순. 기존 Must Phase 5의 editToken 코드를 6.2/6.3에서 걷어낸다.
- **마이그레이션**: 기존에 editToken으로 저장된 디자인은 ownerId가 없다. MVP 단계라 데이터가 적으면 재설정/삭제로 처리(데이터 보존이 필요하면 별도 백필 작업 — 범위 밖이면 보고).
- **JWT 검증 위치는 `auth/`에 격리**: 라우트는 `userId`만 받는다(레이어 경계 — 도메인은 인증 세부를 모른다).

---

## Phase 7 — 파이핑 보강 (PRD-M3 파이핑 정교화: `schema` + `editor2d` + `store` + `geometry` + `texture`)

> **위치**: PRD-M3(Must)의 파이핑 기능을 출시 직후 보강한다. 새 PRD ID를 만들지 않고 **PRD-M3 파이핑 보강**으로 다룬다(루트 CLAUDE.md의 PRD-M3 수용 기준에 반영됨). 손그림(PRD-S1) 패널 패턴을 파이핑에 적용하므로 Should 계획에 둔다.

**목표**:
1. **파이핑 추가 패널을 손그림 패널처럼 라이브러리에서 분리**한 독립 패널로 만든다.
2. 모양뿐 아니라 **굵기(0.2~2.0cm)**와 **색상**을 지정할 수 있게 한다.
3. **별모양(`star-tip`) 파이핑을 제거**하고 **물방울(`teardrop`) 모양**으로 교체한다.
4. 파이핑을 **곡선 경로를 따라**(펜처럼 드래그) 그린다. 모티프 크기는 굵기로 **고정**이라 드래그 중 커졌다 작아졌다 하지 않고(경로가 길어지면 **개수만** 증가), 원형·물방울은 간격=지름이라 빈 공간 없이 이어진다.
5. 파이핑 전용 수평 확장 핸들은 **두지 않는다**. 선택 시 다른 요소와 동일하게 대각선·회전 핸들로 이동·크기·회전만 한다.

**의존**: Must editor2d/파이핑(이미 존재), Phase 3(손그림 펜 경로 수집·패널 분리 패턴 재사용), Phase 4(3D 읽기 전용 — 분리한 파이핑 패널도 3D에서 숨김 대상에 포함).

| 작업 | 산출물 |
|---|---|
| 스키마 보강 | `packages/shared/schema`의 `PipingElement`을 **경로 기반**으로 — `points: {x,y}[]`(min 1, 로컬 좌표)와 `width?: positive`(굵기, cm). `length` 제거. `variant`는 원형/스캘럽/물방울(문자열, 카탈로그가 단일 출처) — **`star-tip` 제거**. |
| 카탈로그 갱신 | `editor2d/elements/catalog.ts`의 `pipingVariants`에서 `별깍지(star-tip)` 제거, **`물방울(teardrop)`** 추가. 굵기 상수 `DEFAULT_PIPING_WIDTH=1`·**`MIN=0.2`·`MAX=2`**. `elementLocalSize(piping)`은 경로 경계상자 + 굵기 여유로 계산. (`PIPING_HEIGHT`/`PIPING_UNIT`/`pipingCount`/`MIN_PIPING_LENGTH` 제거.) |
| 경로 샘플링(geometry) | `packages/shared/geometry`에 `resamplePath(points, spacing)`(폴리라인을 고정 간격으로 샘플 → {x,y,angle}) + `centerOfPoints(points)`(경계상자 중심). 간격 고정이라 경로가 길어져도 모티프 크기 불변·개수만 증가. |
| 마크업 갱신 | `editor2d/elements/elementSvg.ts` `pipingMarkup(variant, color, points, width)`: 경로를 `resamplePath(points, width)`로 샘플 → **원형**=반지름 width/2 원(간격=지름→빈틈 없음), **물방울**=크기 width 드롭을 접선 방향으로 정렬, **스캘럽**=경로를 따라가는 연속 stroke(두께 width). `star-tip` 제거(미상 variant는 원형 폴백). 2D View `PipingRun`·3D 베이커가 단일 출처 공유. |
| store 계약 | `document/store`: `PipingPatch`=`{ color?, width? }`(length 제거). `pendingPiping`=`{ variant, color, width }`, `pipingBrush`+`setPipingBrush`(그리기 모드 동기화). **`addPiping(points, variant, color, width)`** — 절대 경로를 경계상자 중심 기준 로컬 좌표로 바꿔 `transform`에 중심을 둔다(이동·스케일·회전이 transform으로 동작). |
| 독립 파이핑 패널 | `editor2d/panels/PipingPanel.tsx` 신설(`DrawingPanel` 패턴): 모양 선택 + **굵기 슬라이더(0.2~2.0, step 0.1)** + **색상 피커** → `setPendingPiping`/`setPipingBrush`. **`LibraryPanel`에서 파이핑 섹션 제거.** |
| 캔버스 입력·미리보기 | `editor2d/canvas/NetEditor.tsx`: 파이핑 모드에서 펜처럼 곡선 점열을 모아(`appendStrokePoint`) 라이브 미리보기(경로 모티프) → pointerup에 `addPiping`. 파이핑 전용 핸들·길이 제스처 제거(코너+회전만). |
| 3D 굽기 반영 | `viewer3d/texture`가 `pipingMarkup`(경로·width·물방울) 갱신을 그대로 굽는다(마크업 단일 출처라 자동 반영). |
| 3D 숨김 연동(Phase 4) | 분리한 **파이핑 추가 패널**도 3D 뷰에서 숨김 대상에 포함(`App` 셸 `view==='net'` 게이트). |

### 7.1 굵기·크기 계약
- `width`는 전개도(cm) 기준 파이핑 **굵기**(0.2~2.0). 원형·물방울은 모티프 지름, 스캘럽은 stroke-width.
- 모티프 **간격 = width 고정**, **크기 = width 고정**. 경로 길이에 따라 `resamplePath`가 찍는 **개수만** 변한다 → 드래그 중 크기 펄럭임 없음. 원형·물방울은 간격=지름이라 서로 접해 빈틈이 없다.
- 기본값·범위는 카탈로그 상수(`DEFAULT/MIN/MAX_PIPING_WIDTH`)에 단일 정의.

### 7.2 곡선 경로·선택 계약
- 파이핑은 펜처럼 **곡선 경로**(점열)로 그린다. 점은 `addPiping`이 경계상자 중심 기준 로컬 좌표로 저장하고 `transform.x·y`에 중심을 둔다.
- 선택 시 핸들은 **대각선(스케일)+회전**뿐(다른 요소와 동일). 파이핑 전용 수평 확장 핸들은 없다 — 길이 변경은 다시 그리거나 스케일로.

**완료 기준 (PRD-M3 파이핑 보강 수용 기준)**:
- [x] 파이핑 추가가 손그림처럼 **독립 패널**로 분리되고, 라이브러리 패널에는 파이핑 섹션이 없다. *(런타임 스냅샷: 좌측에 별도 "파이핑" 패널(원형/스캘럽/물방울·굵기 슬라이더·색상), "요소" 패널엔 일러스트·레터링·이미지만.)*
- [x] 파이핑 추가 패널에서 **모양·굵기(0.2~2.0cm)·색상**을 지정해 그릴 수 있고 결과에 반영된다. *(런타임: 슬라이더 min=0.2·max=2·step=0.1·기본 1.0. 곡선 드래그 → 파이핑 요소 1건 생성.)*
- [x] 별모양 파이핑이 사라지고 **물방울 모양**이 제공된다(`star-tip` 잔존 0건 — grep). *(catalog.test: teardrop 포함·star-tip 미포함. grep: functional `star-tip`/`PIPING_UNIT`/`PIPING_HEIGHT`/`length`(piping) 0건.)*
- [x] 파이핑을 **곡선 경로**를 따라 그릴 수 있다. *(런타임: sin 곡선 드래그 → 161개 원이 경로를 따라 배치. `addPiping`이 로컬 좌표·중심 변환 — store.test.)*
- [x] **드래그 중 모티프 크기가 일정**하고(펄럭임 없음) 경로가 길어지면 **개수만** 증가한다. *(런타임: 161개 원의 반지름이 모두 0.5(=width/2)로 동일. elementSvg.test: 길이↑→개수↑·반지름 불변. catalog.test: 크기=bbox+굵기.)*
- [x] 원형·물방울이 점 사이 **빈 공간 없이** 이어진다(간격 = 지름). *(elementSvg.test: dots r=width/2·간격=width → 접함; teardrop은 path 다수.)*
- [x] 파이핑 전용 **수평 확장 핸들이 없다**. 선택 시 대각선·회전 핸들만 표시된다. *(런타임: 선택 오버레이 코너 rect 4·회전 circle 1·**측면 마름모 0**. tools/handles에서 edgeMidPoint·Side·LengthGesture 제거.)*
- [x] 변경이 3D 전환 시 텍스처에 반영된다(굵기·물방울·곡선). *(`pipingMarkup`이 2D View·3D 베이커 단일 출처 — points·width 전달. bakeNet.test 회귀 통과.)*
- [x] 좌표·경로 계산이 전부 `geometry` 경유(인라인 좌표 수학 0건). *(샘플링=`resamplePath`, 중심=`centerOfPoints`(shared/geometry). canvas는 점 수집만.)*
- [x] schema/store/markup/geometry 단위 테스트 통과. *(전체 154건 통과: schema 8·catalog 11·elementSvg 7·tools 10·store 21·geometry 등.)*

---

## 6. 의존 그래프 / 권장 순서

```
(Must 완료)
  ├─ Phase 1 PRD-S5 규격조정 (cake·geometry·meshes·texture)   ← 독립
  ├─ Phase 2 PRD-S4 이미지 업로드 (api/assets·web/api·editor2d) ← 독립(Must Phase5 전제)
  ├─ Phase 3 PRD-S1 손그림 (editor2d·texture)                  ← 독립
  ├─ Phase 4 3D 뷰 읽기 전용화 (2D 편집 패널 숨김)              ← Phase 1~3 후(숨길 패널 존재)
  ├─ Phase 5 PRD-S3 3D 데코 (decorations)                     ← 자체 표면 픽킹(S2 이관으로 의존 해소)
  ├─ Phase 6 PRD-S6 로그인·소유권 저장·마이페이지 (auth·designs)  ← 독립(Must Phase5 전제)
  └─ Phase 7 파이핑 보강 (schema·editor2d·geometry·texture)     ← Phase 3(패널 패턴)·Phase 4(3D 숨김) 참조

  (이관) PRD-S2 3D 직접배치 → Could 단계. 본 Should 계획 범위 밖.
```

- **CLAUDE.md 권장 순서**(S5→S4→S1→S3→S6)를 기본 진행 순서로 둔다. **PRD-S2는 Could로 이동**했다.
- **Phase 1·2·3 은 서로 독립적**이라 병렬 가능: 각각 주로 다른 폴더를 건드린다 — S5=`cake`/`geometry`/`meshes`, S4=`api/assets`/`web/api`/`editor2d/panels`, S1=`editor2d/tools`. **단, 셋 다 `viewer3d/texture` 굽기를 건드릴 수 있으니** texture 변경은 순차 머지 또는 충돌 조정 필요.
- **Phase 4 는 3D 뷰 읽기 전용화** — Phase 1~3에서 만든 편집 패널(요소·손그림)을 3D 모드에서 숨긴다. 역변환·레이캐스트 불필요.
- **Phase 5(S3) 는 자체 표면 픽킹** — S2 이관으로 Phase 4 산출물에 더 이상 의존하지 않으며, 데코 배치용 레이캐스트를 자체 구현한다.
- **Phase 6(S6) 는 독립** — Must Phase 5만 전제하며 S1~S5와 병렬 가능. 이 Phase에서 editToken을 소유권으로 대체한다(다른 Phase는 영향 없음).
- **Phase 7(파이핑 보강) 은 PRD-M3 정교화** — 손그림 패널 분리(Phase 3) 패턴과 3D 숨김(Phase 4) 계약을 참조한다. 주로 `schema`·`editor2d`(panels/elements/tools/canvas)·`geometry`를 건드리고 `viewer3d/texture`는 마크업 단일 출처라 자동 반영된다.

## 7. 교차 검증 (완료 정의)

- [ ] **동기화 회귀**: S5 규격 변경·S4 이미지·S1 손그림을 추가/변경 → 2D↔3D 전환 시 모두 반영(스냅샷/시각).
- [ ] **좌표 단일화 grep**: S1 펜 경로·S5 재계산이 전부 `geometry` 경유. `editor2d`/`viewer3d`에 인라인 좌표 수학 0건. *(S2 3D 픽 역변환은 Could로 이관 — 본 계획 검증 대상 아님.)*
- [ ] **3D 읽기 전용**: 3D 뷰에서 요소·손그림 추가 패널이 숨겨지고, 3D 입력이 store를 변경하지 않는다(Phase 4). 전개도 복귀 시 패널 복원.
- [ ] **레이어 경계 린트**: `tools`/`store`/`texture`/`controls`(ViewModel부)에서 three/r3f/canvas import 0건 유지.
- [ ] **공유 왕복 확장**: 이미지(S4)·손그림(S1)·데코(S3)·규격(S5)이 포함된 디자인을 저장→편집 수정→viewToken 열람·복제→복제본 독립 수정까지 보존. *(S6 적용 전 편집은 editToken, S6 적용 후 소유권(`/d/:id`) 경로)*
- [x] **소유권 왕복(S6)**: 로그인 저장 → `/d/:id` 수정(소유자) → 타인/비로그인 수정 차단(403/401) → viewToken 열람·복제 → 복제본은 복제자 소유. *(Phase 6: `routes.test.ts`·`service.test.ts` + tsx 서버 curl 왕복 10단계 전부 통과.)*
- [x] **editToken 제거 점검(S6)**: `/edit/:token`·`/designs/by-edit/*`·`editToken` 잔존 참조 0건(grep). *(소스 grep: functional 참조 0 — 주석·부정단언 테스트만.)*
- [x] **자산 업로드 한계**: 50MB 초과·비허용 mime 거부가 회귀 없이 유지. *(Phase 2: api 라우트 413/415 테스트 + 실제 HTTP 415)*
- [x] **파이핑 보강(Phase 7)**: 독립 패널 분리 · 모양/굵기/색상 지정 · 물방울 교체(별모양 제거) · 원형·물방울 빈틈 없음 · 수평 확장 핸들로 개수 증감 · 2D↔3D 반영 · 좌표는 `geometry` 경유. *(Phase 7: 단위테스트 159건 + 런타임 패널 스냅샷 + grep 점검. 캔버스 드래그 상호작용은 수동 확인 권장.)*

## 8. 범위 밖 (혼동 방지)

- **Could 기능은 본 계획 밖**: **3D 뷰 직접배치(PRD-S2 — Should→Could 이동)**, undo/redo(PRD-C2, `document/history`), 라이브러리 검색·템플릿(PRD-C1), 3D 내보내기(PRD-C3), 링크 만료·접근 제어(PRD-C4). 단 S1의 "1획=1요소·1커밋" 규칙은 미래 C2 undo를 막지 않도록 유지한다.
- **Won't 그대로 제외**: 주문·결제, 자체 비밀번호·이메일 계정 관리(로그인은 PRD-S6에서 Google OAuth로 도입됨), 실시간 공동 편집, 네이티브 앱, 케이크 외 제품.
- **확장 훅 유지**: S3 데코 타입은 `Decoration3D.type`의 enum(`candle`/`topper`/`fruit`)에 한정하되, 미래 데코 추가를 막지 않도록 enum 한 곳에서만 늘린다. S4 `Asset`은 공용(`shared`)에 둔다. **S2 역변환(`netPointForUV`)은 Could 착수 시 `shared/geometry`에 추가** — 이미 마련된 `boundaryPointForU`/`applyInverseRotation` 위에 올린다.
