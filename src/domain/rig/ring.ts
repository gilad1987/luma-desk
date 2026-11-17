import { Vector3 } from 'three';
import { RING } from '../venue';
import type { RigBuilder } from './RigBuilder';

/**
 * The circular truss: 24 outer beams (1201-1224) and 12 inner washes (1301-1312), each with a pixel strip segment on
 * the outside of its ring. The inner ring is offset half a step so its units sit between the outer ones.
 */
export function addRing(rig: RigBuilder): void {
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2,
      sa = Math.sin(a),
      ca = Math.cos(a);
    const f = rig.add(1201 + i, 'beam', RING.x + RING.R * sa, RING.y - 0.72, RING.z + RING.R * ca, 'hang');
    f.pix = {
      p: new Vector3(RING.x + (RING.R + 0.3) * sa, RING.y - 0.05, RING.z + (RING.R + 0.3) * ca),
      tan: new Vector3(ca, 0, -sa),
      len: ((RING.R * Math.PI * 2) / 24) * 1.02,
    };
  }
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * Math.PI * 2,
      sa = Math.sin(a),
      ca = Math.cos(a);
    const f = rig.add(1301 + i, 'wash', RING.x + RING.r2 * sa, RING.y2 - 0.78, RING.z + RING.r2 * ca, 'hang');
    f.pix = {
      p: new Vector3(RING.x + (RING.r2 + 0.28) * sa, RING.y2 - 0.05, RING.z + (RING.r2 + 0.28) * ca),
      tan: new Vector3(ca, 0, -sa),
      len: ((RING.r2 * Math.PI * 2) / 12) * 1.02,
    };
  }
}
