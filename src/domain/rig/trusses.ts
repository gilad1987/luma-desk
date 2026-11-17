import { TR } from '../venue';
import type { RigBuilder } from './RigBuilder';

/** The rows on the five straight trusses: spots, blinders, beams, washes and strobes, front truss first. */
export function addTrussRows(rig: RigBuilder): void {
  const front = TR.front.y - 0.75;
  rig.row({ firstId: 101, count: 20, type: 'spot', x: [-20, 20], y: front, z: TR.front.z, mount: 'hang' });
  rig.row({
    firstId: 801,
    count: 16,
    type: 'blinder',
    x: [-22, 22],
    y: TR.front.y - 0.6,
    z: TR.front.z + 0.5,
    mount: 'hang',
    fixed: { pan: 0, tilt: 64 },
  });
  rig.row({ firstId: 201, count: 30, type: 'beam', x: [-21.5, 21.5], y: TR.t2.y - 0.7, z: TR.t2.z, mount: 'hang' });
  rig.row({ firstId: 301, count: 30, type: 'wash', x: [-21.5, 21.5], y: TR.t3.y - 0.75, z: TR.t3.z, mount: 'hang' });
  rig.row({
    firstId: 901,
    count: 20,
    type: 'strobe',
    x: [-20, 20],
    y: TR.t3.y - 0.55,
    z: TR.t3.z + 0.5,
    mount: 'hang',
    fixed: { pan: 0, tilt: 34 },
  });
  rig.row({ firstId: 401, count: 20, type: 'spot', x: [-20, 20], y: TR.t4.y - 0.75, z: TR.t4.z, mount: 'hang' });
  rig.row({ firstId: 501, count: 30, type: 'beam', x: [-21.5, 21.5], y: TR.back.y - 0.7, z: TR.back.z, mount: 'hang' });
}
