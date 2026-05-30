# Undo/Redo 기능 구현 계획 (PRD-C2)

> 본 문서는 [CLAUDE.md](../CLAUDE.md)의 PRD를 단일 출처로 삼아 **편집 내용 undo·redo(PRD-C2)** 를 **커맨드(Command) 패턴**으로 구현하기 위한 실행 계획이다.
> 기능 ID·아키텍처·폴더 역할의 정의는 항상 루트 CLAUDE.md를 따른다. 본 문서는 *어떻게(how)* 와 *순서·계약·완료 기준* 을 다룬다.
>
> 대상 폴더는 `apps/web/src/document/history`(코어)와 `document/store`(통합), 그리고 트리거 UI(`editor2d`/App 셸)다.

## 0. 현재 상태와 전제

- Must·Should 핵심은 구현 완료 상태다. `document/store`는 Zustand 스토어(`useDesignStore`)로 동작하며, 모든 편집은 store 액션으로만 일어난다([designStore.ts](../apps/web/src/document/store/designStore.ts)).
- store는 단일 `design: Design` 문서를 **불변 갱신**한다. `getDesignSnapshot()`이 `structuredClone(validateDesign(...))`로 검증된 깊은 복사본을 제공한다 — 스냅샷 기반 커맨드의 토대.
- 연속 제스처는 이미 View에서 처리된다: [NetEditor.tsx](../apps/web/src/editor2d/canvas/NetEditor.tsx)의 `onPointerMove`가 드래그 동안 `moveElement`/`scaleElement`/`rotateElement`를 **매 프레임 반복 호출**하고, `onPointerUp`에서 손그림(`addDrawing`)·파이핑 생성·지우개 삭제가 마무리된다. 즉 **커밋 경계는 pointer down→up**이다.
- `document/history` 폴더는 의도만 정의된 빈 상태다([history/CLAUDE.md](../apps/web/src/document/history/CLAUDE.md)): "커밋 경계: 드래그처럼 수십 번 바뀌는 연속 동작은 포인터 업 시점에 1건으로 묶는다", "View는 history를 직접 알 필요 없다(undo/redo 명령만 호출)".
- 스택: **TypeScript + Zustand + React + Vite**. PRD-C2는 Could 우선순위.

## 1. 아키텍처 불변식 (모든 Phase에서 강제)

CLAUDE.md의 MVVM 규율을 그대로 따른다. PR 리뷰 체크리스트로도 사용한다.

1. **히스토리 대상은 `design` 문서뿐**: undo/redo는 디자인 문서(`elements`·색상·`spec`·`decorations3d`)의 변화만 기록·복원한다. **표현 상태(`selectedId`, `viewport`, `drawingTool`, `brush`, `pendingPiping`)는 히스토리에 넣지 않는다.** 뷰 모드 전환·선택·팬/줌은 "편집 동작"이 아니다.
2. **단일 디자인 문서**: undo/redo로 `design`이 바뀌면 전개도·3D는 구독을 통해 자동 재렌더링된다. 동기화 = 재렌더링이지 별도 변환이 아니다(`viewer3d/texture`가 store 구독). undo 전용 동기화 코드를 두지 않는다.
3. **레이어 경계**:
   - `document/history` 코어는 **순수 Model/ViewModel** — 렌더 기술(three/r3f/canvas)·React·UI를 import하지 않는다. `Design` 스냅샷만 다룬다.
   - View(`canvas`, `panels`, App 셸)는 **계산 금지** — `undo()`/`redo()`/`canUndo`/`canRedo` 명령·플래그만 호출·구독한다.
4. **단방향 흐름**: View 이벤트(단축키·버튼·제스처) → store 액션/히스토리 명령 → `design`(Model)에 기록 → 구독으로 모든 View 갱신.
5. **연속 제스처 = 1커밋**: 드래그·연속 지우개 한 번은 히스토리 1건으로만 남긴다. 중간 상태는 스택에 쌓지 않는다.

> 위반 시 리뷰 반려. 특히 history 코어에 React/Zustand/Canvas import가 들어오면 안 된다.

---

## Phase 1 — History 코어: 커맨드 스택 (순수 모듈)

**목표**: 디자인 스냅샷을 담는 커맨드 스택을 순수 모듈로 만든다 — store·UI와 무관하게 단위 테스트로 검증 가능.
**의존**: 없음.

| 작업 | 산출물 |
|---|---|
| 커맨드·엔트리 타입 정의 | `apps/web/src/document/history/types.ts` — `Command` 인터페이스, `HistoryState` 타입 |
| 커맨드 스택(undo/redo 스택, 깊이 제한) | `apps/web/src/document/history/commandStack.ts` — `createCommandStack()` 순수 팩토리 |
| 공개 엔트리 | `apps/web/src/document/history/index.ts` — 타입·팩토리 re-export |
| 단위 테스트 | `apps/web/src/document/history/commandStack.test.ts` |

### 1.1 커맨드 계약 (스냅샷 기반 메멘토 커맨드)

`Design`이 이미 불변 갱신되므로, 각 편집을 **이전/이후 스냅샷을 담은 커맨드**로 표현한다. undo는 `before`로, redo는 `after`로 복원한다 — 가장 견고하고 검증이 쉬운 형태.

```ts
/** 한 번의 편집 동작을 되돌리고 다시 실행하기 위한 커맨드. */
export interface Command {
  /** 사람이 읽는 라벨(예: '요소 이동', '색상 변경'). UI·디버깅용. */
  label: string;
  /** 이 편집 직전의 디자인 문서 스냅샷(깊은 복사본). undo 시 복원. */
  before: Design;
  /** 이 편집 직후의 디자인 문서 스냅샷(깊은 복사본). redo 시 복원. */
  after: Design;
}
```

> 향후 메모리 최적화가 필요하면 `before/after` 전체 스냅샷 대신 액션별 역연산 커맨드(diff/patch)로 교체할 수 있도록, 스택은 `Command`를 불투명하게 다룬다(8장 훅 참조).

### 1.2 커맨드 스택 API

```ts
export interface CommandStack {
  /** 새 커맨드를 푸시. redo 스택은 비운다. 깊이 초과 시 가장 오래된 것 폐기. */
  push(command: Command): void;
  /** 직전 커맨드를 꺼내 그 before 스냅샷을 반환(없으면 null). 해당 커맨드는 redo 스택으로. */
  undo(): Design | null;
  /** redo 스택의 커맨드를 꺼내 그 after 스냅샷을 반환(없으면 null). 다시 undo 스택으로. */
  redo(): Design | null;
  canUndo(): boolean;
  canRedo(): boolean;
  /** 두 스택 모두 비운다(문서 로드 시). */
  clear(): void;
}

/** maxDepth 기본값(예: 100). 초과분은 바닥부터 폐기. */
export function createCommandStack(maxDepth?: number): CommandStack;
```

- 순수 함수/클로저로 구현. **React·Zustand·렌더 기술 import 금지.**
- 스냅샷 복원은 깊은 복사본을 반환한다(스택 내부 객체가 store와 공유되지 않도록).

**완료 기준**:
- [x] `push → undo → redo` 순서가 올바른 스냅샷을 반환한다 (단위 테스트). *(`commandStack.test.ts` "push → undo → redo 순서" 통과)*
- [x] undo 후 새 `push`가 일어나면 redo 스택이 비워진다 (단위 테스트). *(`commandStack.test.ts` "undo 후 새 push" 통과)*
- [x] 빈 스택에서 `undo()`/`redo()`는 `null`을 반환하고 `canUndo()`/`canRedo()`가 `false`다. *(`commandStack.test.ts` "빈 스택" 통과)*
- [x] `maxDepth` 초과 시 가장 오래된 커맨드가 폐기된다 (단위 테스트). *(`commandStack.test.ts` "maxDepth 초과" 통과)*
- [x] history 코어에 three/r3f/canvas/react import 0건 (레이어 경계 린트 통과). *(`@candle/shared` 타입·로컬 타입만 import, eslint 통과)*

---

## Phase 2 — store 통합: 편집 액션을 커맨드로 + 트랜잭션 커밋 경계

**목표**: 모든 디자인 편집이 자동으로 커맨드를 남기고, 드래그 같은 연속 동작은 1커밋으로 묶인다. store가 `undo`/`redo`/`canUndo`/`canRedo`를 노출한다.
**의존**: Phase 1.

### 2.1 store에 히스토리 통합

[designStore.ts](../apps/web/src/document/store/designStore.ts)에 커맨드 스택을 합성한다. 두 가지 커밋 방식을 둔다:

- **자동 커밋(이산 동작)**: `addElement`, `deleteElement`, `setShape`, `setBaseColor`, `setCreamColor`, `reorderElement`, `updateLettering`, `updatePiping`, `updateIllustration`, `addDrawing` — 각 호출이 끝나면 직전/직후 스냅샷으로 커맨드 1건을 push한다.
- **트랜잭션 커밋(연속 동작)**: 드래그·연속 지우개처럼 한 제스처 안에서 store가 여러 번 갱신되는 경우, 시작 시 `beginTransaction()`으로 before 스냅샷을 고정하고, 종료 시 `commitTransaction(label)`로 그 사이 누적 변화를 **커맨드 1건**으로 push한다. 트랜잭션 중에는 자동 커밋을 억제한다.

추가/변경할 store 인터페이스(표현 상태와 구분):

```ts
// 히스토리 명령(표현 상태가 아니라 명령 — 호출 시 design을 교체)
undo: () => void;          // canUndo면 design을 before로 교체(없으면 무시)
redo: () => void;          // canRedo면 design을 after로 교체
canUndo: boolean;          // 구독 가능한 플래그(버튼 disabled용)
canRedo: boolean;

// 연속 제스처 커밋 경계
beginTransaction: () => void;            // 현재 design을 before로 고정
commitTransaction: (label: string) => void;  // before≠after면 커맨드 1건 push, 아니면 무시
```

- `undo`/`redo`는 **새 커맨드를 만들지 않는다** — 스택에서 꺼낸 스냅샷으로 `design`만 교체한다.
- `undo`/`redo` 후 `selectedId`가 더 이상 존재하지 않는 요소를 가리키면 `null`로 정리한다. `viewport`·`drawingTool`·`brush`·`pendingPiping`은 건드리지 않는다(불변식 1).
- `loadDesign`은 히스토리를 `clear()` 한다 — 저장본·공유본을 적재하면 이전 undo 이력은 의미 없다.

### 2.2 연속 제스처의 커밋 경계 배선 (View → 트랜잭션)

[NetEditor.tsx](../apps/web/src/editor2d/canvas/NetEditor.tsx)의 제스처 경계에 트랜잭션을 건다(계산은 추가하지 않음, 명령 위임만):

- `onPointerDown`에서 이동/스케일/회전 제스처(`active`) 또는 지우개 드래그 시작 시 `beginTransaction()`.
- `onPointerUp`/취소에서 `commitTransaction(label)`. (예: 이동='요소 이동', 지우개='획 지우기')
- `addDrawing`·파이핑 생성은 pointer up의 단일 호출이므로 **자동 커밋**으로 충분(트랜잭션 불필요). 지우개는 드래그 동안 여러 `deleteElement`를 호출하므로 트랜잭션으로 묶는다.

> View는 `beginTransaction`/`commitTransaction`만 호출한다 — 스냅샷·diff 계산은 store/history가 한다.

**완료 기준**:
- [ ] 이산 동작 1회(요소 추가·삭제·색상 변경·레터링 변경·레이어 순서) → `undo` 1회로 직전 디자인이 복원된다 (store 단위 테스트).
- [ ] `redo`로 되돌린 동작이 다시 적용된다 (store 단위 테스트).
- [ ] 드래그 이동(트랜잭션 중 `moveElement` N회) → `undo` 1회로 드래그 **전체**가 한 번에 되돌려진다 (begin→move×N→commit 시뮬레이션 테스트).
- [ ] 연속 지우개(여러 `deleteElement`) → `undo` 1회로 지운 획이 모두 복원된다 (테스트).
- [ ] 표현 상태 전용 액션(`select`, `setViewport`, `setDrawingTool`, `setBrush`, `setPendingPiping`)은 히스토리 엔트리를 만들지 않는다 (`canUndo` 불변 확인 테스트).
- [ ] `loadDesign` 호출 후 `canUndo`·`canRedo`가 모두 `false`다 (테스트).
- [ ] `undo`로 삭제됐던 선택 요소가 사라지면 `selectedId`가 `null`로 정리되고, `viewport`는 변하지 않는다 (테스트).
- [ ] 런타임: 2D 캔버스에서 드래그 이동 후 1회 되돌리기로 원위치 복귀 확인.

---

## Phase 3 — 트리거 UI: 단축키 + 되돌리기/다시실행 버튼

**목표**: 사용자가 키보드 단축키와 버튼으로 undo/redo를 실행하고, 가능 여부가 버튼 상태에 드러난다.
**의존**: Phase 2.

| 작업 | 산출물 |
|---|---|
| 단축키 훅 | `apps/web/src/document/history/useUndoRedoShortcuts.ts` — 키 이벤트→`store.undo`/`redo` 위임 |
| 툴바 버튼 | 되돌리기/다시실행 버튼(전개도 뷰 툴바 또는 App 셸 상단바) — `canUndo`/`canRedo`로 disabled |
| 배선 | App 셸/에디터에서 훅 마운트·버튼 노출 |

### 3.1 단축키 계약

- `Ctrl/Cmd+Z` → undo, `Ctrl/Cmd+Shift+Z` 및 `Ctrl+Y` → redo.
- 레터링 텍스트 입력 등 **입력 필드(`input`/`textarea`/contenteditable) 포커스 중에는 무시**(브라우저 기본 텍스트 undo와 충돌 방지).
- 편집 맥락(전개도 뷰)에서만 동작. **3D 뷰는 읽기 전용**이므로 편집 단축키를 노출하지 않는다(PRD-M4).

### 3.2 버튼

- `canUndo`/`canRedo`를 구독해 `disabled` 토글. 입력 위임만, 로직 없음(View).
- 배치는 App 셸/에디터 툴바 — 기존 상단바 패턴을 따른다.

**완료 기준 (PRD-C2 수용 기준: 직전 동작 되돌리기·다시 실행)**:
- [ ] `Ctrl/Cmd+Z`로 직전 편집이 되돌려지고, `Ctrl/Cmd+Shift+Z`(또는 `Ctrl+Y`)로 다시 실행된다 (런타임 확인).
- [ ] 되돌리기/다시실행 버튼이 `canUndo`/`canRedo`에 따라 활성/비활성된다 (런타임 확인).
- [ ] 레터링 텍스트 입력 중에는 `Ctrl/Cmd+Z`가 요소 히스토리를 건드리지 않는다 (런타임 확인).
- [ ] 3D 뷰에서는 편집 단축키·버튼이 노출/동작하지 않는다.

---

## 6. 의존 그래프 / 권장 순서

```
Phase 1 history 코어 (순수 커맨드 스택)
  └─ Phase 2 store 통합 (자동 커밋 + 트랜잭션 경계, NetEditor 배선)
       └─ Phase 3 트리거 UI (단축키 + 버튼)
```

- 순차 의존이 강하다(코어→통합→UI). 병렬 여지는 작다 — 다만 Phase 3의 **버튼 UI**는 Phase 2가 노출할 `undo`/`redo`/`canUndo`/`canRedo` 시그니처만 합의되면 단축키 훅과 분리해 먼저 스케치할 수 있다.
- **리스크**: 트랜잭션 커밋 경계(2.2)가 가장 까다롭다 — 드래그가 1커밋으로 묶이지 않으면 "한 번 되돌리기에 한 픽셀씩" 되는 회귀가 난다. Phase 2에서 begin→move×N→commit 시뮬레이션 테스트로 **선검증**한다. 막히면 트랜잭션 대신 "pointer up 시 직전 스냅샷과 비교해 1커밋" 폴백을 검토.

## 7. 교차 검증 (완료 정의)

- [ ] **연속 제스처 1커밋**: 드래그 이동/스케일/회전/연속 지우개가 각각 `undo` 1회로 통째 복원된다 (Phase 2 테스트 + 런타임).
- [ ] **표현 상태 분리**: `select`/`setViewport`/뷰 전환/`drawingTool` 변경이 히스토리에 남지 않는다 (`canUndo` 불변 grep/test).
- [ ] **동기화 회귀**: `undo`/`redo`로 `design`이 바뀌면 3D 텍스처가 재생성된다 — 2D에서 요소 추가→3D 전환→undo→3D에서 사라짐 확인(store 구독 경로 그대로, undo 전용 코드 없음).
- [ ] **레이어 경계 린트**: `document/history` 코어에 three/r3f/canvas/react import 0건.
- [ ] **로드 시 초기화**: 공유/저장 디자인 `loadDesign` 후 undo가 이전 문서로 넘어가지 않는다.

## 8. 범위 밖 (혼동 방지)

- **액션별 역연산(diff/patch) 커맨드**: 본 계획은 스냅샷 기반 메멘토 커맨드로 충분하다. 메모리 최적화를 위한 granular inverse 커맨드는 다루지 않되, Phase 1의 `Command`를 불투명 타입으로 두고 스택이 `before/after`에만 의존하지 않게 해 **추후 교체 훅**을 남긴다.
- **서버 측·세션 간 히스토리**: undo 스택은 메모리(세션) 한정. 새로고침·재로드 후 복원 안 함.
- **협업/멀티 유저 undo**: 실시간 공동 편집은 PRD Won't — 다루지 않는다.
- **3D 직접배치(PRD-S2) 제스처의 히스토리**: 현재 3D는 읽기 전용. S2 도입 시 동일한 `beginTransaction`/`commitTransaction` API를 재사용하도록 트랜잭션 경계를 store에 일반형으로 남긴다(특정 요소 타입에 묶지 않음).
- **규격(PRD-S5)·데코(PRD-S3) 등 향후 액션**: 새 편집 액션을 추가할 때 자동 커밋 경로에 얹기만 하면 히스토리에 포함되도록, Phase 2의 커밋 래핑을 액션 공통 지점에 둔다(개별 액션마다 수동으로 push하지 않는 구조).
