// packages/shared/geometry — 전개도 정의·UV 매핑·좌표 변환의 순수 함수 모음.
// 2D 에디터(editor2d)와 3D 뷰(viewer3d)가 같은 함수를 공유한다.
// 규칙: 순수 함수만. UI·상태·부수효과 금지. (CLAUDE.md 좌표 단일화 원칙)
import type { Shape, Spec, Transform } from '../schema/index';

/** 전개도(픽셀이 아닌) 좌표계의 한 점. */
export interface Point {
  x: number;
  y: number;
}

/** 메시 표면 UV 좌표 [0,1]². */
export interface UV {
  u: number;
  v: number;
}

/** 캔버스 뷰포트 — 팬(panX·panY)과 줌(zoom). */
export interface Viewport {
  panX: number;
  panY: number;
  zoom: number;
}

/** 전개도 좌표계의 사각 영역. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 케이크 단면 외곽선(top-down, xz 평면). 옆면을 펼칠 때 둘레와
 * "옆면 u좌표 → 3D 경계점" 매핑의 근거가 된다. 하트 PoC의 핵심.
 */
export interface CrossSection {
  /** 외곽선을 이루는 순서 있는 점들 (닫힌 루프, 마지막→처음으로 연결). */
  points: Point3[];
  /** 각 점까지의 누적 호장(arc length). points와 같은 길이. */
  cumulative: number[];
  /** 전체 둘레(닫는 구간 포함). */
  perimeter: number;
}

/** top-down 평면의 점 (x = 가로, z = 세로). */
export interface Point3 {
  x: number;
  z: number;
}

/** shape별 전개도 정의. 옆면(펼친 사각형) + 윗면 영역 + 전체 bounds. */
export interface Net {
  shape: Shape;
  /** 옆면을 펼친 사각형: width=둘레, height=전체 높이. */
  side: Rect;
  /** 윗면(뚜껑) 영역의 바운딩 박스. */
  top: Rect;
  /** 전개도 전체 크기 — 텍스처 캔버스 크기/정규화 기준. */
  bounds: { width: number; height: number };
  /** 옆면 둘레·UV 매핑의 근거가 되는 단면. */
  crossSection: CrossSection;
}

/** 규격 변경 시 재계산 결과 요약 (M4/S5 대비). */
export interface SpecGeometry {
  net: Net;
  diameter: number;
  circumference: number;
  totalHeight: number;
}

// ── 호수(size) → 지름 규약 ──────────────────────────────────────────
/** 1호 기준 지름(cm). */
export const SIZE_BASE_DIAMETER_CM = 15;
/** 호수 1당 증가하는 지름(cm). */
export const SIZE_STEP_CM = 3;
/** 단면 외곽선 샘플 수(원형·하트). */
export const CROSS_SECTION_SAMPLES = 64;
/** 옆면과 윗면 사이 전개도 여백(cm). 사이 라벨이 들어갈 공간도 겸한다. */
export const NET_GAP_CM = 6;

/** 호수 → 지름(cm). 1호=15cm, 호당 +3cm. */
export function diameterForSize(size: number): number {
  return SIZE_BASE_DIAMETER_CM + (size - 1) * SIZE_STEP_CM;
}

/** 전체 케이크 높이(cm) — 한 단 높이 × 단 수. */
export function totalHeight(spec: Spec): number {
  return spec.height * spec.layers;
}

// ── 단면 외곽선 ─────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function dist(a: Point3, b: Point3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** 큐빅 베지에를 [0,steps) 구간으로 샘플링(끝점 제외 — 곡선 연결부 중복 방지). */
function cubicBezier(
  p0: Point3,
  p1: Point3,
  p2: Point3,
  p3: Point3,
  steps: number,
): Point3[] {
  const pts: Point3[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    pts.push({
      x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
      z: a * p0.z + b * p1.z + c * p2.z + d * p3.z,
    });
  }
  return pts;
}

/**
 * 깔끔한 둥근 하트 외곽선을 단위 정규화해 만든다.
 * 베지에 4개로 구성: 윗쪽 가운데 갈라짐(cleft)에서 시계 방향으로 돌아 아래 꼭지점까지.
 * z는 아래로 증가(작을수록 위) — 갈라짐이 위, 뾰족한 꼭지점이 아래에 온다.
 */
function heartUnitPoints(samples: number): Point3[] {
  const steps = Math.max(2, Math.floor(samples / 4));
  const P = (x: number, z: number): Point3 => ({ x, z });
  const raw: Point3[] = [
    // 갈라짐 → 왼쪽 로브 위 → 왼쪽 바깥
    ...cubicBezier(P(0.5, 0.3), P(0.5, 0.1), P(0.1, 0.1), P(0.1, 0.4), steps),
    // 왼쪽 바깥 → 아래 꼭지점
    ...cubicBezier(P(0.1, 0.4), P(0.1, 0.68), P(0.36, 0.8), P(0.5, 0.98), steps),
    // 아래 꼭지점 → 오른쪽 바깥
    ...cubicBezier(P(0.5, 0.98), P(0.64, 0.8), P(0.9, 0.68), P(0.9, 0.4), steps),
    // 오른쪽 바깥 → 오른쪽 로브 위 → 갈라짐
    ...cubicBezier(P(0.9, 0.4), P(0.9, 0.1), P(0.5, 0.1), P(0.5, 0.3), steps),
  ];
  // 가로 폭이 1이 되도록 정규화하고 중심을 원점으로.
  const xs = raw.map((p) => p.x);
  const zs = raw.map((p) => p.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const width = maxX - minX;
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  return raw.map((p) => ({ x: (p.x - cx) / width, z: (p.z - cz) / width }));
}

/**
 * shape별 단면 외곽선을 만든다. xz 평면(top-down), 원점 중심.
 * - circle: 반지름 r 원을 샘플링
 * - square: 호수를 한 변으로 보는 정사각형 네 변 샘플링
 * - heart: 깔끔한 베지에 하트(꼭지점 아래)를 지름(가로 폭)에 맞춰 스케일
 */
export function buildCrossSection(shape: Shape, spec: Spec): CrossSection {
  const diameter = diameterForSize(spec.size);
  const r = diameter / 2;
  let points: Point3[];

  if (shape === 'circle') {
    points = Array.from({ length: CROSS_SECTION_SAMPLES }, (_, i) => {
      const a = (i / CROSS_SECTION_SAMPLES) * Math.PI * 2;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r };
    });
  } else if (shape === 'square') {
    const h = diameter / 2;
    const perSide = Math.max(2, Math.floor(CROSS_SECTION_SAMPLES / 4));
    const corners: Point3[] = [
      { x: -h, z: -h },
      { x: h, z: -h },
      { x: h, z: h },
      { x: -h, z: h },
    ];
    points = [];
    for (let c = 0; c < 4; c++) {
      const from = corners[c]!;
      const to = corners[(c + 1) % 4]!;
      for (let s = 0; s < perSide; s++) {
        const f = s / perSide;
        points.push({ x: from.x + (to.x - from.x) * f, z: from.z + (to.z - from.z) * f });
      }
    }
  } else {
    // heart — 단위 곡선을 지름(가로 폭)에 맞춰 스케일.
    points = heartUnitPoints(CROSS_SECTION_SAMPLES).map((p) => ({
      x: p.x * diameter,
      z: p.z * diameter,
    }));
  }

  // 누적 호장 + 둘레(닫는 구간 포함).
  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1]! + dist(points[i - 1]!, points[i]!));
  }
  const closing = dist(points[points.length - 1]!, points[0]!);
  const perimeter = cumulative[cumulative.length - 1]! + closing;

  return { points, cumulative, perimeter };
}

// ── 전개도 정의 ─────────────────────────────────────────────────────

/**
 * shape·규격으로 전개도를 만든다.
 * 옆면은 둘레×전체높이 사각형, 윗면은 단면 바운딩 박스. 윗면을 위쪽 가운데,
 * 옆면을 그 아래 가운데에 배치한다(가로는 둘 다 contentW 기준 중앙 정렬).
 */
export function getNet(shape: Shape, spec: Spec): Net {
  const crossSection = buildCrossSection(shape, spec);
  const height = totalHeight(spec);
  const sideWidth = crossSection.perimeter;

  const xs = crossSection.points.map((p) => p.x);
  const zs = crossSection.points.map((p) => p.z);
  const topW = Math.max(...xs) - Math.min(...xs);
  const topH = Math.max(...zs) - Math.min(...zs);

  const contentW = Math.max(sideWidth, topW);
  const top: Rect = { x: (contentW - topW) / 2, y: 0, width: topW, height: topH };
  const side: Rect = {
    x: (contentW - sideWidth) / 2,
    y: topH + NET_GAP_CM,
    width: sideWidth,
    height,
  };
  const bounds = { width: contentW, height: side.y + height };

  return { shape, side, top, bounds, crossSection };
}

/**
 * 전개도 점 → 메시 UV. **구운-전개도 규약**: 전개도 전체가 곧 텍스처이므로
 * UV는 전개도 점을 전체 bounds로 정규화한 값이다. 메시(viewer3d/meshes)는
 * 각 면의 정점 UV를 이 규약에 맞춰 배치한다.
 */
export function uvForNetPoint(shape: Shape, spec: Spec, point: Point): UV {
  const { bounds } = getNet(shape, spec);
  return {
    u: clamp(point.x / bounds.width, 0, 1),
    v: clamp(point.y / bounds.height, 0, 1),
  };
}

/**
 * 옆면 u좌표(0~1) → 단면 경계점(xz). 옆면을 펼친 가로 위치가 3D에서 어느
 * 경계점에 붙는지를 준다. 하트처럼 비원통형도 둘레 호장 기준으로 일관 매핑.
 * (viewer3d/meshes의 옆면 UV 배치, PRD-S2 역변환의 토대)
 */
export function boundaryPointForU(shape: Shape, spec: Spec, u: number): Point3 {
  const cs = buildCrossSection(shape, spec);
  const target = clamp(u, 0, 1) * cs.perimeter;
  const { points, cumulative, perimeter } = cs;

  for (let i = 0; i < points.length; i++) {
    const segStart = cumulative[i]!;
    const segEnd = i + 1 < points.length ? cumulative[i + 1]! : perimeter;
    if (target <= segEnd || i === points.length - 1) {
      const from = points[i]!;
      const to = points[(i + 1) % points.length]!;
      const segLen = segEnd - segStart;
      const f = segLen > 0 ? (target - segStart) / segLen : 0;
      return { x: from.x + (to.x - from.x) * f, z: from.z + (to.z - from.z) * f };
    }
  }
  return points[0]!;
}

// ── 화면 ↔ 전개도 좌표 변환 ─────────────────────────────────────────

/** 화면(픽셀) → 전개도. 팬/줌 역적용. */
export function screenToNet(viewport: Viewport, point: Point): Point {
  return {
    x: (point.x - viewport.panX) / viewport.zoom,
    y: (point.y - viewport.panY) / viewport.zoom,
  };
}

/** 전개도 → 화면(픽셀). 줌/팬 적용. screenToNet의 역. */
export function netToScreen(viewport: Viewport, point: Point): Point {
  return {
    x: point.x * viewport.zoom + viewport.panX,
    y: point.y * viewport.zoom + viewport.panY,
  };
}

// ── 회전 역변환 ─────────────────────────────────────────────────────

/**
 * 회전된 요소의 로컬 좌표를 구한다. transform(원점 x·y, rotation 라디안)을
 * 기준으로 point를 -rotation 만큼 역회전한다. (M3 핸들 히트테스트, S2 대비)
 */
export function applyInverseRotation(transform: Transform, point: Point): Point {
  const dx = point.x - transform.x;
  const dy = point.y - transform.y;
  const c = Math.cos(-transform.rotation);
  const s = Math.sin(-transform.rotation);
  return { x: dx * c - dy * s, y: dx * s + dy * c };
}

/**
 * 요소 중심 기준 로컬 오프셋을 전개도 좌표로 변환한다(`applyInverseRotation`의 역).
 * local을 +rotation 만큼 회전한 뒤 transform 원점으로 평행이동한다.
 * 선택 핸들 배치·대각 스케일 피벗 계산에 쓴다(M3, S2 대비).
 */
export function applyForwardRotation(transform: Transform, local: Point): Point {
  const c = Math.cos(transform.rotation);
  const s = Math.sin(transform.rotation);
  return {
    x: transform.x + local.x * c - local.y * s,
    y: transform.y + local.x * s + local.y * c,
  };
}

// ── 드래그 런(파이핑 등) ────────────────────────────────────────────

/**
 * 두 전개도 점(드래그 시작·끝)으로부터 "런" 요소의 중심·방향·길이를 구한다.
 * 파이핑처럼 드래그한 길이만큼 모티프를 반복하는 선 요소 생성에 쓴다.
 */
export function runFromPoints(
  start: Point,
  end: Point,
): { center: Point; rotation: number; length: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return {
    center: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    rotation: Math.atan2(dy, dx),
    length: Math.hypot(dx, dy),
  };
}

// ── 규격 변경 재계산 ────────────────────────────────────────────────

/** 규격 변경 시 전개도·파생 치수를 재계산 (M4/S5 대비). */
export function recomputeForSpec(shape: Shape, spec: Spec): SpecGeometry {
  const net = getNet(shape, spec);
  return {
    net,
    diameter: diameterForSize(spec.size),
    circumference: net.crossSection.perimeter,
    totalHeight: totalHeight(spec),
  };
}
