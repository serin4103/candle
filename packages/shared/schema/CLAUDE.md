# schema — 디자인 문서 타입 (Model)

> 제품 요구사항(기능 ID 정의)은 루트 [CLAUDE.md](../../../CLAUDE.md)의 **PRD** 섹션 참조.

디자인 문서의 형식과 검증 규칙. 프론트·백엔드 공통 단일 출처.

## 담는 것
- `Design`: id, shape(원형/사각/하트), baseColor, spec(호수·높이·층수), elements[], decorations3d[]
- `Element`: type(illustration/lettering/piping/drawing/image), transform(x·y·scale·rotation), zIndex, type별 payload — 좌표는 **전개도(UV) 좌표계** 기준
- `Decoration3D`: type(초/토퍼/과일), position(3D), rotation
- `ShareLink`: designId, editToken, viewToken
- `Asset`: 업로드 이미지 메타(URL·크기·mime)

## 규칙
- 타입 + 검증(zod 등)만. 비즈니스 로직·계산은 `geometry/`나 ViewModel으로.
- 필드 추가·변경 시 프론트·백엔드 양쪽 영향이 있으니 신중히.
