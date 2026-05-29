// viewer3d/meshes/CakeMesh — shape별 케이크 메시(View).
// getNet으로 치수를 얻어 옆면 벽 + 윗/아랫 뚜껑을 만들고, 베이크된 텍스처를 입힌다.
// 형상만 담당 — 텍스처 생성은 texture/, 좌표 규칙은 shared/geometry가 단일 출처.
import { useEffect, useMemo } from 'react';
import { DoubleSide, MeshStandardMaterial, type Texture } from 'three';
import { getNet } from '@candle/shared/geometry';
import type { Shape, Spec } from '@candle/shared';
import { buildSideGeometry, buildCapGeometry } from './cakeGeometry';

export interface CakeMeshProps {
  shape: Shape;
  spec: Spec;
  /** 전개도를 구운 텍스처. 아직 없으면 fallbackColor로 채운다. */
  texture: Texture | null;
  /** 텍스처가 준비되기 전 기본 표면색(크림색). */
  fallbackColor: string;
}

export function CakeMesh({ shape, spec, texture, fallbackColor }: CakeMeshProps) {
  const net = useMemo(() => getNet(shape, spec), [shape, spec]);
  const side = useMemo(() => buildSideGeometry(net), [net]);
  const halfH = net.side.height / 2;
  const top = useMemo(() => buildCapGeometry(net, halfH), [net, halfH]);
  const bottom = useMemo(() => buildCapGeometry(net, -halfH), [net, halfH]);

  // 세 면이 공유하는 단일 머티리얼(텍스처가 없으면 기본색).
  const material = useMemo(
    () => new MeshStandardMaterial({ side: DoubleSide, roughness: 0.85, metalness: 0 }),
    [],
  );
  useEffect(() => {
    material.map = texture;
    material.color.set(texture ? '#ffffff' : fallbackColor);
    material.needsUpdate = true;
  }, [material, texture, fallbackColor]);

  // 아랫면 전용 머티리얼 — 텍스처 없이 크림색 단색. 윗면 요소가 아랫면에
  // 비치지 않도록 윗면(텍스처)과 분리한다.
  const bottomMaterial = useMemo(
    () => new MeshStandardMaterial({ side: DoubleSide, roughness: 0.85, metalness: 0 }),
    [],
  );
  useEffect(() => {
    bottomMaterial.color.set(fallbackColor);
    bottomMaterial.needsUpdate = true;
  }, [bottomMaterial, fallbackColor]);

  // 지오메트리·머티리얼 정리.
  useEffect(() => () => { side.dispose(); top.dispose(); bottom.dispose(); }, [side, top, bottom]);
  useEffect(() => () => { material.dispose(); bottomMaterial.dispose(); }, [material, bottomMaterial]);

  return (
    <group>
      <mesh geometry={side} material={material} />
      <mesh geometry={top} material={material} />
      <mesh geometry={bottom} material={bottomMaterial} />
    </group>
  );
}
