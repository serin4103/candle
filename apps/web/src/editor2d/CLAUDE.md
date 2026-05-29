# editor2d — 전개도 뷰 (PRD-M3, PRD-S1, PRD-S4)

> 제품 요구사항(기능 ID 정의)은 루트 [CLAUDE.md](../../../../CLAUDE.md)의 **PRD** 섹션 참조.

펼친 도면 위에서 2D 요소를 배치·편집하는 화면. 사용자가 디자인 문서를 직접 편집하는 주 작업 공간.

## MVVM 배치
- `canvas/` — View (렌더링·이벤트 수신)
- `tools/` — ViewModel (편집 계산·명령)
- `elements/` — Model + View (요소 정의·렌더링)
- `panels/` — View (속성·라이브러리 UI)

## 규칙
- 계산은 `tools/`와 `shared/geometry`에. `canvas/`에 수식을 넣지 말 것.
- 모든 편집 결과는 `document/store`에만 쓴다.
