# viewer3d — 3D 뷰 (PRD-M4, PRD-S2, PRD-S3)

> 제품 요구사항(기능 ID 정의)은 루트 [CLAUDE.md](../../../../CLAUDE.md)의 **PRD** 섹션 참조.

전개도 디자인을 3D 케이크로 매핑해 입체로 확인하는 화면. 360° 회전·확대축소.

## 동기화 원리
전개도를 직접 변환하지 않는다. `document/store`를 구독해 전개도를 **텍스처로 구워**(`texture/`) 메시에 UV 매핑한다. 같은 문서를 다시 렌더링하므로 전환 시 자동 동기화된다.

## MVVM 배치
- `meshes/` — View (메시 생성)
- `texture/` — ViewModel (텍스처 굽기·동기화 핵심)
- `decorations/` — View (입체 데코)
- `controls/` — View + ViewModel (카메라·3D 직접배치)
