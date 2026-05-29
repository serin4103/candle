// viewer3d/CakeViewer3D — 3D 케이크 뷰 조립(View, PRD-M4).
// document/store를 구독 → texture/가 전개도를 캔버스로 굽기 → three.CanvasTexture로 감싸
// meshes/CakeMesh에 입힌다. "동기화 = 재렌더링": 디자인이 바뀌면 SVG가 바뀌고 → 재굽기 →
// 텍스처 갱신. 전개도↔3D 전환 시 별도 변환 로직이 필요 없다.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CanvasTexture, NoToneMapping, SRGBColorSpace, type Texture } from 'three';
import { diameterForSize, getNet, totalHeight } from '@candle/shared/geometry';
import { useDesignStore } from '../document/store';
import { palette } from '../ui';
import { buildNetSvg, netTextureSize, rasterizeNetSvg } from './texture';
import { CakeMesh } from './meshes';
import { CameraControls } from './controls';

export function CakeViewer3D() {
  const design = useDesignStore((s) => s.design);
  // 디자인 전체를 전개도 SVG로 직렬화(순수·저렴). 이 문자열이 곧 "굽기 입력".
  const svg = useMemo(() => buildNetSvg(design), [design]);

  const [texture, setTexture] = useState<Texture | null>(null);
  const texRef = useRef<Texture | null>(null);

  // SVG(=디자인) 변경 시 디바운스 후 재굽기. 오래된 비동기 결과는 버린다.
  useEffect(() => {
    let alive = true;
    const handle = setTimeout(() => {
      const size = netTextureSize(getNet(design.shape, design.spec));
      rasterizeNetSvg(svg, size.width, size.height)
        .then((canvas) => {
          if (!alive) return;
          const tex = new CanvasTexture(canvas);
          tex.colorSpace = SRGBColorSpace;
          tex.anisotropy = 8;
          texRef.current?.dispose();
          texRef.current = tex;
          setTexture(tex);
        })
        .catch(() => {});
    }, 80);
    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [svg, design.shape, design.spec]);

  // 언마운트 시 마지막 텍스처 정리.
  useEffect(() => () => texRef.current?.dispose(), []);

  // 카메라 framing — 규격으로부터 대략적 크기 산정.
  const diameter = diameterForSize(design.spec.size);
  const height = totalHeight(design.spec);
  const distance = diameter * 1.9 + 18;
  const camY = height * 0.5 + diameter * 0.2;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 520, borderRadius: 18, overflow: 'hidden' }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, camY, distance], fov: 40 }}
        gl={{ toneMapping: NoToneMapping, outputColorSpace: SRGBColorSpace }}
        style={{ background: palette.canvas }}
      >
        {/* 톤매핑 끔(ACES가 핑크를 어둡게 누르는 것 방지). three의 물리 광량 스케일에선
            앰비언트를 크게 줘야 전개도 색이 그대로 보인다 + 약한 디렉셔널로 입체감만. */}
        <ambientLight intensity={2.6} />
        <directionalLight position={[diameter, diameter * 1.6, distance]} intensity={1.1} />
        <directionalLight position={[-diameter, diameter, -distance * 0.6]} intensity={0.5} />
        <CakeMesh
          shape={design.shape}
          spec={design.spec}
          texture={texture}
          fallbackColor={design.creamColor}
        />
        <CameraControls
          target={[0, 0, 0]}
          minDistance={diameter * 0.8}
          maxDistance={distance * 2.4}
        />
      </Canvas>
    </div>
  );
}
