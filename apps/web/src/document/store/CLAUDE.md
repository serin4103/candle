# store — 디자인 문서 상태 (Model 상태 + ViewModel 액션)

> 제품 요구사항(기능 ID 정의)은 루트 [CLAUDE.md](../../../../../CLAUDE.md)의 **PRD** 섹션 참조.

디자인 문서의 현재 상태와 이를 바꾸는 액션. Zustand 등으로 구현하며, 이 스토어가 곧 ViewModel 역할의 중심.

## 담는 것
- 상태: 현재 `Design` (요소 리스트·색상·규격·3D 데코)
- 액션: 요소 추가/이동/스케일/회전/삭제, 레이어 순서, 색상·규격 변경, 데코 배치
- 선택 상태(selected element id) 등 표현 상태

## 규칙
- 액션은 `shared/geometry`의 순수 함수로 계산하고 결과만 반영.
- 렌더링 기술(Canvas/R3F) import 금지.
- 연속 변경(드래그)은 `history/`와 협력해 커밋 단위를 묶는다.
