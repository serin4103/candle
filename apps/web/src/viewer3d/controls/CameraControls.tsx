// viewer3d/controls/CameraControls — 카메라 조작(View + ViewModel).
// 360° 회전·확대축소(PRD-M4). 디자인 문서는 바꾸지 않는다(표현 상태일 뿐).
// 3D 직접배치(PRD-S2)는 이후 phase에서 이 폴더에 추가된다.
import { OrbitControls } from '@react-three/drei';

export interface CameraControlsProps {
  /** 회전·줌의 중심(케이크 중심). */
  target?: [number, number, number];
  /** 줌 한계(카메라-타깃 거리). */
  minDistance?: number;
  maxDistance?: number;
}

export function CameraControls({ target = [0, 0, 0], minDistance, maxDistance }: CameraControlsProps) {
  return (
    <OrbitControls
      makeDefault
      target={target}
      enablePan={false}
      // 360° 수평 회전 + 위/아래 자유 회전(상하 약간 여유만 둠).
      minPolarAngle={0.05}
      maxPolarAngle={Math.PI - 0.05}
      minDistance={minDistance}
      maxDistance={maxDistance}
      enableDamping
      dampingFactor={0.08}
    />
  );
}
