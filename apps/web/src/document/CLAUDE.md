# document — 디자인 문서 (진실의 원천)

> 제품 요구사항(기능 ID 정의)은 루트 [CLAUDE.md](../../../../CLAUDE.md)의 **PRD** 섹션 참조.

앱 전체의 **Single Source of Truth**. 전개도 에디터와 3D 뷰 모두 여기를 구독하고, 여기에만 쓴다.

## 단방향 흐름
포인터 이벤트(View) → 계산(ViewModel) → **여기에 쓰기** → 구독한 모든 View 자동 갱신.

## 규칙
- View가 상태를 직접 들고 있지 않게 한다 (`useState`로 비즈니스 상태 금지).
- 상태 변경은 반드시 store 액션을 통해서만.

## 하위 폴더
- `store/` — 문서 상태와 수정 액션
- `history/` — undo/redo
