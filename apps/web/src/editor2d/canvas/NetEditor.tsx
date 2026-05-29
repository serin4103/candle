// editor2d/canvas/NetEditor — 전개도 편집 캔버스(View).
// 전개도(옆면+윗면)와 요소를 그리고 선택 핸들을 표시하며, 포인터 이벤트를
// tools(ViewModel)로 위임한다. 계산 금지: 좌표 변환은 SVG CTM, 히트테스트·
// 제스처 수학은 tools/shared-geometry. store를 구독해 렌더만 한다.
import { useEffect, useRef, useState } from 'react';
import { getNet, runFromPoints } from '@candle/shared/geometry';
import type { Point } from '@candle/shared/geometry';
import { useDesignStore } from '../../document/store';
import { palette, fontStack } from '../../ui';
import { ElementView, PipingRun, elementLocalSize, MIN_PIPING_LENGTH } from '../elements';
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
} from '../tools';
import { topOutlinePath } from './netPath';

const PAD = 14;
const HANDLE_R = 2.6; // 핸들 반지름(cm)
const HANDLE_HIT = 4; // 핸들 히트 반경(cm)

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
  const addElement = useDesignStore((s) => s.addElement);
  const moveElement = useDesignStore((s) => s.moveElement);
  const scaleElement = useDesignStore((s) => s.scaleElement);
  const rotateElement = useDesignStore((s) => s.rotateElement);
  const deleteElement = useDesignStore((s) => s.deleteElement);
  const pendingPiping = useDesignStore((s) => s.pendingPiping);
  const setPendingPiping = useDesignStore((s) => s.setPendingPiping);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const activeRef = useRef<ActiveGesture | null>(null);
  // 파이핑 드래그 진행 상태(시작점은 ref, 끝점은 미리보기 갱신용 state).
  const drawStartRef = useRef<Point | null>(null);
  const [drawEnd, setDrawEnd] = useState<Point | null>(null);

  // 키보드: Esc로 파이핑 모드 해제, Delete/Backspace로 선택 삭제(입력 중 제외).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape' && pendingPiping) {
        setPendingPiping(null);
        return;
      }
      if (selectedId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        deleteElement(selectedId);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, deleteElement, pendingPiping, setPendingPiping]);

  const net = getNet(shape, spec);
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);
  const selected = elements.find((el) => el.id === selectedId) ?? null;

  const viewW = net.bounds.width + PAD * 2;
  const viewH = net.bounds.height + PAD * 2;

  // 화면(픽셀) → 전개도(SVG 사용자 단위=cm).
  const toNet = (clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  // 선택 요소의 핸들에 닿았는지 판별.
  const pickHandle = (point: Point): 'rotate' | Corner | null => {
    if (!selected) return null;
    const size = elementLocalSize(selected);
    const { corners, rotate } = handlePositions(selected.transform, size);
    if (Math.hypot(point.x - rotate.x, point.y - rotate.y) <= HANDLE_HIT) return 'rotate';
    for (const c of CORNERS) {
      const hp = corners[c];
      if (Math.hypot(point.x - hp.x, point.y - hp.y) <= HANDLE_HIT) return c;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const point = toNet(e.clientX, e.clientY);
    if (!point) return;

    // 0) 파이핑 그리기 모드: 드래그로 런을 그린다(선택/이동 대신).
    if (pendingPiping) {
      drawStartRef.current = point;
      setDrawEnd(point);
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

    // 2) 요소 본체 picking(위에 있는 것 우선).
    const pickables: Pickable[] = elements.map((el) => ({
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
    // 파이핑 드래그 중: 끝점만 갱신(미리보기 재렌더).
    if (drawStartRef.current) {
      const point = toNet(e.clientX, e.clientY);
      if (point) setDrawEnd(point);
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

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    // 파이핑 드래그 종료 → 런 길이만큼의 파이핑 요소 생성.
    const start = drawStartRef.current;
    if (start && pendingPiping) {
      const end = toNet(e.clientX, e.clientY) ?? drawEnd ?? start;
      const run = runFromPoints(start, end);
      const id = addElement({
        type: 'piping',
        variant: pendingPiping.variant,
        color: pendingPiping.color,
        length: Math.max(MIN_PIPING_LENGTH, run.length),
        transform: { x: run.center.x, y: run.center.y, scale: 1, rotation: run.rotation },
      });
      select(id);
      drawStartRef.current = null;
      setDrawEnd(null);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
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
    drawStartRef.current = null;
    setDrawEnd(null);
    activeRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const labelStyle = {
    fontFamily: fontStack,
    fontSize: 3,
    fontWeight: 600,
    fill: palette.textMuted,
  } as const;

  // 파이핑 드래그 미리보기(진행 중일 때만).
  const previewRun =
    pendingPiping && drawStartRef.current && drawEnd
      ? runFromPoints(drawStartRef.current, drawEnd)
      : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`${-PAD} ${-PAD} ${viewW.toFixed(2)} ${viewH.toFixed(2)}`}
      role="img"
      aria-label={`전개도 편집기 (${shape})`}
      data-shape={shape}
      data-element-count={elements.length}
      data-piping-mode={pendingPiping ? pendingPiping.variant : undefined}
      style={{
        width: '100%',
        height: '100%',
        maxHeight: 600,
        touchAction: 'none',
        cursor: pendingPiping ? 'crosshair' : 'default',
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
        윗면 · TOP
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
        옆면 · SIDE (전개)
      </text>
      <rect
        x={net.side.x}
        y={net.side.y}
        width={net.side.width}
        height={net.side.height}
        fill={creamColor}
        filter="url(#net-edit-shadow)"
      />

      {/* 요소(zIndex 오름차순) */}
      {sorted.map((el) => (
        <ElementView key={el.id} element={el} />
      ))}

      {/* 파이핑 드래그 미리보기 */}
      {previewRun && pendingPiping && (
        <g
          transform={`translate(${previewRun.center.x} ${previewRun.center.y}) rotate(${(previewRun.rotation * 180) / Math.PI})`}
          opacity={0.75}
          pointerEvents="none"
        >
          <PipingRun
            variant={pendingPiping.variant}
            color={pendingPiping.color}
            length={Math.max(MIN_PIPING_LENGTH, previewRun.length)}
          />
        </g>
      )}

      {/* 선택 핸들 (파이핑 모드에선 숨김) */}
      {selected && !pendingPiping && <SelectionOverlay element={selected} />}
    </svg>
  );
}

/** 선택 요소의 바운딩 박스·코너 핸들·회전 핸들(View 전용). */
function SelectionOverlay({ element }: { element: Parameters<typeof ElementView>[0]['element'] }) {
  const size = elementLocalSize(element);
  const { corners, rotate } = handlePositions(element.transform, size);
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
        strokeWidth={0.6}
        strokeDasharray="2 1.5"
      />
      {/* 회전 핸들 연결선 + 핸들 */}
      <line
        x1={topMid.x}
        y1={topMid.y}
        x2={rotate.x}
        y2={rotate.y}
        stroke={palette.primary}
        strokeWidth={0.6}
      />
      <circle cx={rotate.x} cy={rotate.y} r={HANDLE_R} fill={palette.surface} stroke={palette.primaryDeep} strokeWidth={0.6} />
      {/* 코너 스케일 핸들 */}
      {order.map((c) => (
        <rect
          key={c}
          x={corners[c].x - HANDLE_R}
          y={corners[c].y - HANDLE_R}
          width={HANDLE_R * 2}
          height={HANDLE_R * 2}
          fill={palette.surface}
          stroke={palette.primaryDeep}
          strokeWidth={0.6}
        />
      ))}
    </g>
  );
}
