import { bodyScale } from '../../domain/fixtureTypes/bodyScale';
import type { MvrDesignInfo } from '../../domain/stage/mvr';
import type { StageFixture } from '../../domain/stage/StageDesign';
import type { Vec3 } from '../../domain/stage/types';
import { mountShift, type MountDirection } from '../design/mountShift';

/**
 * `mountShift` for the body the desk really draws. A fixture whose GDTF gave its real size is drawn at `bodyScale`,
 * so its mounting point is that much nearer to (or farther from) the model origin; the shift is scaled by the same
 * factor, which keeps the clamp of a smaller body on its pipe and the base of a floor unit on the floor. The import
 * and the export both call it, so the MVR insertion point survives a round trip. A fixture at scale 1 gets the plain
 * `mountShift` result, with no arithmetic on it, so its position stays exact to the bit.
 */
export function bodyShift(fixture: StageFixture, mvr: MvrDesignInfo | undefined, direction: MountDirection): Vec3 {
  const shifted = mountShift(fixture, direction);
  const scale = bodyScale(fixture, mvr);
  if (scale === 1) return shifted;
  const [x, y, z] = fixture.position;
  return [x + (shifted[0] - x) * scale, y + (shifted[1] - y) * scale, z + (shifted[2] - z) * scale];
}
