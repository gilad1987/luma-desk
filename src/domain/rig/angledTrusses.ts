import { Vector3 } from 'three';
import type { PixelStrip } from '../Fixture';
import type { FixtureTypeId } from '../FixtureType';
import { ANG } from '../venue';
import type { RigBuilder } from './RigBuilder';

/** A unit's place on an angled truss, collected first so the units can be numbered in stage order. */
interface Slot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly pix: PixelStrip;
}

/**
 * Six units on each angled truss: beams (1401..) on the outer trusses and spots (1501..) on the middle pair (z -12).
 * The units of one truss share one `tan` vector, as the original build did.
 */
export function addAngledTrusses(rig: RigBuilder): void {
  const beams: Slot[] = [],
    spots: Slot[] = [];
  for (const t of ANG) {
    const d = t.b.clone().sub(t.a),
      L = d.length(),
      u = d.clone().normalize();
    for (let i = 0; i < 6; i++) {
      const q = (i + 0.5) / 6,
        p = t.a.clone().lerp(t.b, q);
      const pix = { p: p.clone().add(new Vector3(0, -0.27, 0.26)), tan: u, len: (L / 6) * 0.96 };
      (t.z === -12 ? spots : beams).push({ x: p.x, y: p.y - 0.78, z: p.z, pix });
    }
  }
  numberInStageOrder(rig, beams, 1401, 'beam');
  numberInStageOrder(rig, spots, 1501, 'spot');
}

/** Ids run left to right, and downstage first where two units share an x. */
function numberInStageOrder(rig: RigBuilder, slots: Slot[], firstId: number, type: FixtureTypeId): void {
  slots
    .sort((a, b) => a.x - b.x || b.z - a.z)
    .forEach((o, k) => {
      rig.add(firstId + k, type, o.x, o.y, o.z, 'hang').pix = o.pix;
    });
}
