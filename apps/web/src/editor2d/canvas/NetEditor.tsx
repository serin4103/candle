// editor2d/canvas/NetEditor — 전개도 편집 캔버스(View).
// 전개도(옆면+윗면)와 요소를 그리고 선택 핸들을 표시하며, 포인터 이벤트를
// tools(ViewModel)로 위임한다. 계산 금지: 좌표 변환은 SVG CTM, 히트테스트·
// 제스처 수학은 tools/shared-geometry. store를 구독해 렌더만 한다.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getNet } from '@candle/shared/geometry';
import type { Point } from '@candle/shared/geometry';
import { useDesignStore } from '../../document/store';
import { palette, fontStack } from '../../ui';
import { ElementView, PipingRun, elementLocalSize, useImageAssetStore } from '../elements';
import {
  handlePositions,
  pickTopElement,
  CORNERS,
  type Corner,
  type Pickable,
  beginMove,
  beginScale,
  beginRotate,
  applyGesture,
  type Gesture,
  appendStrokePoint,
  pickStrokeAt,
  type Strokelike,
} from '../tools';
import { topOutlinePath } from './netPath';
import { PEN_CURSOR, ERASER_CURSOR, PIPING_CURSOR } from './cursors';

const PAD = 6;
// 핸들은 화면 일정 크기(px)로 보이도록 렌더 스케일로 cm 변환해 그린다.
const HANDLE_R_PX = 5; // 핸들 반지름(px)
const HANDLE_HIT_PX = 11; // 핸들 히트 반경(px)
const ROTATE_OFFSET_PX = 22; // 회전 핸들을 박스 위로 띄우는 거리(px)
const STROKE_PX = 1.2; // 선택 외곽선·핸들 테두리 두께(px)

interface ActiveGesture {
  gesture: Gesture;
  elementId: string;
}

export function NetEditor() {
  const shape = useDesignStore((s) => s.design.shape);
  const spec = useDesignStore((s) => s.design.spec);
  const creamColor = useDesignStore((s) => s.design.creamColor);
  const elements = useDesignStore((s) => s.design.elements);
  const selectedId = useDesignStore((s) => s.selectedId);
  const select = useDesignStore((s) => s.select);
  const moveElement = useDesignStore((s) => s.moveElement);
  const scaleElement = useDesignStore((s) => s.scaleElement);
  const rotateElement = useDesignStore((s) => s.rotateElement);
  const deleteElement = useDesignStore((s) => s.deleteElement);
  const pendingPiping = useDesignStore((s) => s.pendingPiping);
  const setPendingPiping = useDesignStore((s) => s.setPendingPiping);
  const drawingTool = useDesignStore((s) => s.drawingTool);
  const setDrawingTool = useDesignStore((s) => s.setDrawingTool);
  const brush = useDesignStore((s) => s.brush);
  const addDrawing = useDesignStore((s) => s.addDrawing);
  const addPiping = useDesignStore((s) => s.addPiping);
  // 이미지 자산이 비동기로 해석되면(version) 요소 마크업을 다시 그린다(PRD-S4).
  const imageVersion = useImageAssetStore((s) => s.version);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const activeRef = useRef<ActiveGesture | null>(null);
  // 손그림 펜·파이핑 모두 곡선 경로를 점열로 모은다(라이브 미리보기는 state로 재렌더).
  const strokeRef = useRef<Point[]>([]);
  const [strokePreview, setStrokePreview] = useState<Point[] | null>(null);
  // 지우개 드래그 중 여부(드래그하며 닿는 획을 연속 삭제).
  const erasingRef = useRef(false);
  // 화면 px ÷ 전개도 cm 배율(핸들을 일정 화면 크기로 그리기 위함).
  const [pxPerCm, setPxPerCm] = useState(1);

  // 키보드: Esc로 도구(펜/지우개/파이핑)·선택 해제, Delete/Backspace로 선택 삭제(입력 중 제외).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') {
        if (drawingTool) setDrawingTool(null);
        if (pendingPiping) setPendingPiping(null);
        select(null);
        return;
      }
      if (selectedId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        deleteElement(selectedId);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, deleteElement, pendingPiping, setPendingPiping, drawingTool, setDrawingTool, select]);

  const net = getNet(shape, spec);
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
  const selected = elements.find((el) => el.id === selectedId) ?? null;

  const viewW = net.bounds.width + PAD * 2;
  const viewH = net.bounds.height + PAD * 2;

  // 렌더 스케일(px/cm) 측정 — getScreenCTM().a가 가로 배율. 리사이즈 시 재측정.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => {
      const ctm = svg.getScreenCTM();
      if (ctm && ctm.a > 0 && Number.isFinite(ctm.a)) setPxPerCm(ctm.a);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(svg);
    return () => ro.disconnect();
  }, [viewW, viewH]);

  // px 핸들 치수를 cm로 환산(렌더 스케일 반영).
  const handleR = HANDLE_R_PX / pxPerCm;
  const handleHit = HANDLE_HIT_PX / pxPerCm;
  const rotateOffset = ROTATE_OFFSET_PX / pxPerCm;
  const strokeW = STROKE_PX / pxPerCm;

  // 화면(픽셀) → 전개도(SVG 사용자 단위=cm).
  const toNet = (clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  // 선택 요소의 핸들에 닿았는지 판별(코너 스케일 + 회전).
  const pickHandle = (point: Point): 'rotate' | Corner | null => {
    if (!selected) return null;
    const size = elementLocalSize(selected);
    const { corners, rotate } = handlePositions(selected.transform, size, rotateOffset);
    if (Math.hypot(point.x - rotate.x, point.y - rotate.y) <= handleHit) return 'rotate';
    for (const c of CORNERS) {
      const hp = corners[c];
      if (Math.hypot(point.x - hp.x, point.y - hp.y) <= handleHit) return c;
    }
    return null;
  };

  // 지우개: 점에 닿은 획(드로잉 요소) 하나를 삭제(획 단위, PRD-S1).
  const eraseAt = (point: Point) => {
    const strokes: Strokelike[] = elements.flatMap((el) =>
      el.type === 'drawing'
        ? [{ id: el.id, points: el.points, width: el.width, zIndex: el.zIndex }]
        : [],
    );
    const id = pickStrokeAt(strokes, point);
    if (id) deleteElement(id);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const point = toNet(e.clientX, e.clientY);
    if (!point) return;

    // 0a) 손그림 펜: 드래그로 1획을 그린다(전개도 좌표 점열로 수집).
    if (drawingTool === 'pen') {
      strokeRef.current = [point];
      setStrokePreview([point]);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // 0b) 지우개: 누른 즉시 + 드래그하며 닿는 획을 삭제한다.
    if (drawingTool === 'eraser') {
      erasingRef.current = true;
      eraseAt(point);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // 0) 파이핑 그리기 모드: 펜처럼 곡선 경로를 점열로 모은다(선택/이동 대신).
    if (pendingPiping) {
      strokeRef.current = [point];
      setStrokePreview([point]);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // 1) 선택된 요소의 핸들 먼저.
    if (selected) {
      const handle = pickHandle(point);
      if (handle) {
        const size = elementLocalSize(selected);
        const gesture =
          handle === 'rotate'
            ? beginRotate(selected.transform)
            : beginScale(selected.transform, size, handle);
        activeRef.current = { gesture, elementId: selected.id };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }

    // 2) 요소 본체 picking(위에 있는 것 우선). 손그림은 선택 대상 제외(획 단위
    //    편집은 펜/지우개 도구로만 — S1 범위).
    const pickables: Pickable[] = elements
      .filter((el) => el.type !== 'drawing')
      .map((el) => ({
        id: el.id,
        transform: el.transform,
        size: elementLocalSize(el),
        zIndex: el.zIndex,
      }));
    const hitId = pickTopElement(pickables, point);
    if (hitId) {
      select(hitId);
      const el = elements.find((x) => x.id === hitId)!;
      activeRef.current = { gesture: beginMove(el.transform, point), elementId: hitId };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // 3) 빈 곳 → 선택 해제.
    select(null);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    // 펜·파이핑 드래그 중: 점을 솎아 경로에 모으고 미리보기 갱신.
    if ((drawingTool === 'pen' || pendingPiping) && strokeRef.current.length > 0) {
      const point = toNet(e.clientX, e.clientY);
      if (point) {
        const next = appendStrokePoint(strokeRef.current, point);
        if (next !== strokeRef.current) {
          strokeRef.current = next;
          setStrokePreview(next);
        }
      }
      return;
    }
    // 지우개 드래그 중: 닿는 획을 연속 삭제.
    if (erasingRef.current) {
      const point = toNet(e.clientX, e.clientY);
      if (point) eraseAt(point);
      return;
    }
    const active = activeRef.current;
    if (!active) return;
    const point = toNet(e.clientX, e.clientY);
    if (!point) return;
    const patch = applyGesture(active.gesture, point);
    if (patch.rotation !== undefined) rotateElement(active.elementId, patch.rotation);
    if (patch.scale !== undefined) scaleElement(active.elementId, patch.scale);
    if (patch.x !== undefined && patch.y !== undefined) {
      moveElement(active.elementId, { x: patch.x, y: patch.y });
    }
  };

  const releaseCapture = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    // 펜 드래그 종료 → 모은 점열로 손그림 1획 생성(1획=1요소).
    if (drawingTool === 'pen' && strokeRef.current.length > 0) {
      addDrawing(strokeRef.current, brush.color, brush.width);
      strokeRef.current = [];
      setStrokePreview(null);
      releaseCapture(e);
      return;
    }
    // 지우개 드래그 종료.
    if (erasingRef.current) {
      erasingRef.current = false;
      releaseCapture(e);
      return;
    }
    // 파이핑 드래그 종료 → 그린 곡선 경로로 파이핑 요소 생성.
    if (pendingPiping && strokeRef.current.length > 0) {
      const id = addPiping(
        strokeRef.current,
        pendingPiping.variant,
        pendingPiping.color,
        pendingPiping.width,
      );
      select(id);
      strokeRef.current = [];
      setStrokePreview(null);
      releaseCapture(e);
      return;
    }
    if (activeRef.current) {
      activeRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const onPointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    activeRef.current = null;
    strokeRef.current = [];
    setStrokePreview(null);
    erasingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const labelStyle = {
    fontFamily: fontStack,
    fontSize: 1,
    fontWeight: 600,
    fill: '#c4b3b3',
  } as const;

  return (
    <svg
      ref={svgRef}
      viewBox={`${-PAD} ${-PAD} ${viewW.toFixed(2)} ${viewH.toFixed(2)}`}
      role="img"
      aria-label={`전개도 편집기 (${shape})`}
      data-shape={shape}
      data-element-count={elements.length}
      data-image-version={imageVersion}
      data-piping-mode={pendingPiping ? pendingPiping.variant : undefined}
      data-drawing-tool={drawingTool ?? undefined}
      style={{
        width: '100%',
        height: '100%',
        maxHeight: 760,
        touchAction: 'none',
        cursor: pendingPiping
          ? PIPING_CURSOR
          : drawingTool === 'pen'
            ? PEN_CURSOR
            : drawingTool === 'eraser'
              ? ERASER_CURSOR
              : 'default',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <defs>
        <filter id="net-edit-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx={0} dy={0.8} stdDeviation={1} floodColor="#b47878" floodOpacity={0.22} />
        </filter>
      </defs>

      {/* 윗면 */}
      <text x={net.top.x + net.top.width / 2} y={net.top.y - 2} textAnchor="middle" style={labelStyle}>
        윗면
      </text>
      <path
        d={topOutlinePath(net.crossSection.points, net.top.x, net.top.y)}
        fill={creamColor}
        filter="url(#net-edit-shadow)"
      />

      {/* 옆면(전개) */}
      <text
        x={net.side.x + net.side.width / 2}
        y={net.side.y - 2}
        textAnchor="middle"
        style={labelStyle}
      >
        옆면
      </text>
      <rect
        x={net.side.x}
        y={net.side.y}
        width={net.side.width}
        height={net.side.height}
        fill={creamColor}
        filter="url(#net-edit-shadow)"
      />

      {/* 요소(zIndex 오름차순). 도구 활성 시 요소 위에서도 도구 커서가 보이도록 inherit. */}
      {sorted.map((el) => (
        <ElementView
          key={el.id}
          element={el}
          cursor={pendingPiping || drawingTool ? 'inherit' : 'pointer'}
        />
      ))}

      {/* 파이핑 곡선 라이브 미리보기(그리는 중) — 경로를 따라 모티프 */}
      {strokePreview && strokePreview.length > 0 && pendingPiping && (
        <g opacity={0.75} pointerEvents="none">
          <PipingRun
            variant={pendingPiping.variant}
            color={pendingPiping.color}
            points={strokePreview}
            width={pendingPiping.width}
          />
        </g>
      )}

      {/* 손그림 펜 라이브 미리보기(그리는 중) */}
      {strokePreview && strokePreview.length > 0 && drawingTool === 'pen' && (
        <polyline
          points={strokePreview.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}
          fill="none"
          stroke={brush.color}
          strokeWidth={brush.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}

      {/* 선택 핸들 (파이핑·손그림 모드에선 숨김) */}
      {selected && !pendingPiping && !drawingTool && (
        <SelectionOverlay
          element={selected}
          handleR={handleR}
          rotateOffset={rotateOffset}
          strokeW={strokeW}
        />
      )}
    </svg>
  );
}

/** 선택 요소의 바운딩 박스·코너 핸들·회전 핸들(View 전용). 치수는 화면 px 기준(cm 환산). */
function SelectionOverlay({
  element,
  handleR,
  rotateOffset,
  strokeW,
}: {
  element: Parameters<typeof ElementView>[0]['element'];
  handleR: number;
  rotateOffset: number;
  strokeW: number;
}) {
  const size = elementLocalSize(element);
  const { corners, rotate } = handlePositions(element.transform, size, rotateOffset);
  const order: Corner[] = ['nw', 'ne', 'se', 'sw'];
  const polygon = order.map((c) => `${corners[c].x.toFixed(2)},${corners[c].y.toFixed(2)}`).join(' ');
  const topMid = {
    x: (corners.nw.x + corners.ne.x) / 2,
    y: (corners.nw.y + corners.ne.y) / 2,
  };

  return (
    <g pointerEvents="none">
      <polygon
        points={polygon}
        fill="none"
        stroke={palette.primary}
        strokeWidth={strokeW}
        strokeDasharray={`${handleR * 0.8} ${handleR * 0.6}`}
      />
      {/* 회전 핸들 연결선 + 핸들 */}
      <line
        x1={topMid.x}
        y1={topMid.y}
        x2={rotate.x}
        y2={rotate.y}
        stroke={palette.primary}
        strokeWidth={strokeW}
      />
      <circle
        cx={rotate.x}
        cy={rotate.y}
        r={handleR}
        fill={palette.surface}
        stroke={palette.primaryDeep}
        strokeWidth={strokeW}
      />
      {/* 코너 스케일 핸들 */}
      {order.map((c) => (
        <rect
          key={c}
          x={corners[c].x - handleR}
          y={corners[c].y - handleR}
          width={handleR * 2}
          height={handleR * 2}
          fill={palette.surface}
          stroke={palette.primaryDeep}
          strokeWidth={strokeW}
        />
      ))}
    </g>
  );
}
