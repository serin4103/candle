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
 * 옆면은 둘레×전체높이 사각형, 윗면은 단면 바운딩 박스. 옆면(펼친 띠) 위에 윗면(뚜껑)을
 * 실제 전개도처럼 "붙는 면" 기준으로 배치한다:
 * - 사각형: 옆면이 네 면으로 나뉘므로 윗면을 한 면(둘레 1/4 폭) 바로 위에 올려 박스 전개도처럼.
 * - 원형·하트: 이음매(옆면 좌우 끝) 반대편 가운데에 접하므로 가로 가운데 정렬.
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
  const sideX = (contentW - sideWidth) / 2;
  // 사각형 뚜껑은 옆면 두 번째 면(둘레 1/4 지점부터 한 면 폭) 위에 정렬, 그 외엔 가운데.
  const topX = shape === 'square' ? sideX + sideWidth / 4 : (contentW - topW) / 2;
  const top: Rect = { x: topX, y: 0, width: topW, height: topH };
  const side: Rect = { x: sideX, y: topH + NET_GAP_CM, width: sideWidth, height };
  const bounds = { width: contentW, height: side.y + height };

  return { shape, side, top, bounds, crossSection };
}

/**
 * 단면 외곽선에서 진행 방향이 임계각 이상 꺾이는 꼭지점(=3D 모서리·이음매) 인덱스.
 * 사각형은 네 모서리, 하트는 아래 꼭지점·갈라짐이 잡히고, 원형처럼 매끈하면 비어 있다.
 */
function cornerIndices(points: Point3[], threshold = Math.PI / 6): number[] {
  const n = points.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]!;
    const cur = points[i]!;
    const next = points[(i + 1) % n]!;
    const ax = cur.x - prev.x;
    const az = cur.z - prev.z;
    const bx = next.x - cur.x;
    const bz = next.z - cur.z;
    const la = Math.hypot(ax, az);
    const lb = Math.hypot(bx, bz);
    if (la < 1e-9 || lb < 1e-9) continue;
    const cos = clamp((ax * bx + az * bz) / (la * lb), -1, 1);
    if (Math.acos(cos) > threshold) out.push(i);
  }
  return out;
}

/**
 * 옆면(펼친 띠)에 그릴 눈금선의 u좌표(0~1, 좌→우) 목록. 옆면이 3D에서 어느 면·모서리에
 * 대응하는지 보여주는 참조선이다. 단면의 꺾임 꼭지점(=3D 모서리)을 호장 위치로 환산해
 * 돌려준다(사각형=네 모서리, 하트=아래 꼭지점). 원형처럼 꺾임이 없으면 빈 배열 — 그릴
 * 모서리가 없다. 옆면 좌우 경계(u≈0·u≈1=이음매)와 겹치는 선은 이미 옆면 테두리이므로 제외.
 */
export function sideGridU(shape: Shape, spec: Spec): number[] {
  const cs = buildCrossSection(shape, spec);
  const us = cornerIndices(cs.points)
    .map((i) => cs.cumulative[i]! / cs.perimeter)
    .filter((u) => u > 1e-3 && u < 1 - 1e-3);
  return [...new Set(us.map((u) => Math.round(u * 1e4) / 1e4))].sort((a, b) => a - b);
}

/** 단면 외곽선에서 호장 절반(둘레의 50%) 위치 경계점 — 옆면(펼친 띠) 가로 가운데에 대응. */
function halfPerimeterPoint(cs: CrossSection): Point3 {
  const target = cs.perimeter / 2;
  const { points, cumulative, perimeter } = cs;
  for (let i = 0; i < points.length; i++) {
    const segEnd = i + 1 < points.length ? cumulative[i + 1]! : perimeter;
    if (target <= segEnd || i === points.length - 1) {
      const from = points[i]!;
      const to = points[(i + 1) % points.length]!;
      const segStart = cumulative[i]!;
      const f = segEnd > segStart ? (target - segStart) / (segEnd - segStart) : 0;
      return { x: from.x + (to.x - from.x) * f, z: from.z + (to.z - from.z) * f };
    }
  }
  return points[0]!;
}

/**
 * 윗면(뚜껑)을 전개도에 놓을 때 단면을 회전시키는 각(라디안). 옆면 가운데(둘레 절반)에
 * 닿는 단면점이 뚜껑의 **아래쪽 가운데**(옆면과 접하는 변)에 오도록 맞춘다 —
 * 즉 전개도를 접으면 윗면 가운데와 옆면 가운데가 3D에서 맞닿는다. 사각형은 한 면 위에
 * 축 정렬로 두므로(getNet 참조) 회전하지 않는다(0). 하트는 아래 꼭지점이 이미 둘레
 * 절반이라 ≈0이 된다. 원형은 -90°가 되어 옆면 가운데가 뚜껑 아래로 온다.
 */
export function topOrientation(net: Net): number {
  if (net.shape === 'square') return 0;
  const pts = net.crossSection.points;
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
  const mid = halfPerimeterPoint(net.crossSection);
  // 중심→가운데점 방향을 +z(전개도에서 아래=옆면 쪽)로 돌리는 각. (-π,π]로 정규화.
  const a = Math.PI / 2 - Math.atan2(mid.z - cz, mid.x - cx);
  return Math.atan2(Math.sin(a), Math.cos(a));
}

/**
 * 윗면(뚜껑) 외곽선을 topOrientation만큼 회전시킨 단면점(xz, 원점 부근). 인덱스는
 * crossSection.points와 1:1 대응 — 2D 외곽선(netPath)·3D 뚜껑 UV(meshes)가 같은 점열을
 * 공유해 전개도↔3D가 일관된다. 호출부가 바운딩박스 좌상단을 net.top에 맞춰 평행이동한다.
 */
export function orientedTopCrossSection(net: Net): Point3[] {
  const a = topOrientation(net);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return net.crossSection.points.map((p) => ({ x: p.x * c - p.z * s, z: p.x * s + p.z * c }));
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

// ── 경로(곡선 파이핑·손그림) ────────────────────────────────────────

/** 점열의 경계 상자 중심(없으면 원점). 로컬 좌표화·핸들 배치에 쓴다. */
export function centerOfPoints(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

/** 폴리라인을 따라 spacing 간격으로 샘플 위치·접선각을 구한다(파이핑 모티프 배치).
 *  간격이 고정이라 경로가 길어지면 개수만 늘고 모티프 크기는 일정하다. maxSamples로 상한. */
export function resamplePath(
  points: Point[],
  spacing: number,
  maxSamples = 5000,
): { x: number; y: number; angle: number }[] {
  if (points.length === 0) return [];
  if (points.length === 1 || !(spacing > 0)) {
    return [{ x: points[0]!.x, y: points[0]!.y, angle: 0 }];
  }
  const out: { x: number; y: number; angle: number }[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);

  let seg = 0;
  let acc = 0; // points[seg] 까지의 누적 거리
  let segLen = Math.hypot(points[1]!.x - points[0]!.x, points[1]!.y - points[0]!.y);
  for (let k = 0; k <= maxSamples; k++) {
    const d = k * spacing;
    if (d > total + 1e-9) break;
    while (d > acc + segLen && seg < points.length - 2) {
      acc += segLen;
      seg++;
      segLen = Math.hypot(points[seg + 1]!.x - points[seg]!.x, points[seg + 1]!.y - points[seg]!.y);
    }
    const a = points[seg]!;
    const b = points[seg + 1]!;
    const t = segLen > 0 ? (d - acc) / segLen : 0;
    out.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      angle: Math.atan2(b.y - a.y, b.x - a.x),
    });
  }
  return out;
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
