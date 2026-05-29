// cake/CakeControls — 모양·색상 선택을 묶는 좌측 패널(PRD-M1/M2).
import { Panel } from '../ui';
import { ShapeSelector } from './ShapeSelector';
import { ColorControls } from './ColorControls';

export function CakeControls() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 260 }}>
      <Panel title="모양">
        <ShapeSelector />
      </Panel>
      <Panel title="색상">
        <ColorControls />
      </Panel>
    </div>
  );
}
