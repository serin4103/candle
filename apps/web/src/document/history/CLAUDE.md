# history — undo/redo (PRD-C2)

> 제품 요구사항(기능 ID 정의)은 루트 [CLAUDE.md](../../../../../CLAUDE.md)의 **PRD** 섹션 참조.

직전 편집 동작을 되돌리고 다시 실행한다.

## 담는 것
- 디자인 문서 변경의 커밋 스택 (undo/redo)
- 커밋 경계: 드래그처럼 수십 번 바뀌는 연속 동작은 **포인터 업 시점에 1건**으로 묶는다

## 규칙
- `store`와 협력하되, View는 history를 직접 알 필요 없다 (undo/redo 명령만 호출).
- PRD-C2는 Could 우선순위지만, 폴더를 미리 둬 store 액션이 커밋 단위를 의식하도록 설계.
