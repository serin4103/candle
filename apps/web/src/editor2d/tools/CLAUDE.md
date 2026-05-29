# tools — 편집 명령·계산 (ViewModel)

> 제품 요구사항(기능 ID 정의)은 루트 [CLAUDE.md](../../../../../CLAUDE.md)의 **PRD** 섹션 참조.

이동·크기조절·회전·삭제·손그림 등 편집 도구의 계산과 명령. editor2d의 ViewModel 레이어.

## 담는 것
- transform 도구: 이동, 대각선/변 스케일(아스펙트 락·고정점), 회전
- 레이어 순서 변경, 삭제
- 손그림 펜(PRD-S1): 브러시 굵기·색상, 획 단위 지우개
- 제스처 상태(시작 transform·고정점) 관리 후 `document/store`에 반영

## 규칙 (ViewModel)
- Canvas/R3F API를 import하지 않는다 — 렌더링 기술과 무관하게 동작.
- 좌표·회전 계산은 `shared/geometry` 순수 함수 사용.
- 드래그 연속 변경은 포인터 업에서 `history` 커밋 1건으로.
