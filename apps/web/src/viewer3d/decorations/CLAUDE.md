# decorations — 입체 데코 배치 (View, PRD-S3)

> 제품 요구사항(기능 ID 정의)은 루트 [CLAUDE.md](../../../../../CLAUDE.md)의 **PRD** 섹션 참조.

초·토퍼·과일 등 입체 오브젝트를 케이크 위에 올린다. 전개도 텍스처와 달리 **별도의 3D 오브젝트**다.

## 담는 것
- 데코 3D 모델(초/토퍼/과일 등)
- `document/store`의 `decorations3d[]`를 읽어 위치·회전대로 배치

## 규칙
- 배치 위치 데이터는 `store`(Model)에. 여기는 렌더링만.
- PRD-S3는 PRD-S2보다 후순위.
