import type { Fixture } from '../../../Fixture';
import { buildRig } from '../../../rig';
import { STAGE_DESIGN_VERSION, type StageDesign, type StageFixture } from '../../StageDesign';
import { placeOf } from './fixtureRoles';
import { sultansPoolScenery } from './scenery';
import { mainTrusses } from './trussesMain';
import { ringTrusses } from './trussesRing';

/**
 * One rig fixture as design data. The position, aim and pixel strip are copied from the built fixture, so the rig
 * derived from the design keeps the exact floats; keys that the fixture lacks stay absent (no `fixed: undefined`).
 */
function toStageFixture(f: Fixture): StageFixture {
  const { role, trussId } = placeOf(f.id);
  return {
    id: f.id,
    type: f.type,
    role,
    trussId,
    position: f.pos.toArray(),
    mount: f.mount,
    ...(f.fixed ? { fixed: f.fixed } : {}),
    ...(f.pix ? { pixel: { p: f.pix.p.toArray(), tan: f.pix.tan.toArray(), len: f.pix.len } } : {}),
  };
}

/**
 * The built-in Sultan's Pool stage as a design: the default rig of the app. The fixtures come from `buildRig()`, so
 * the rig areas stay the one source of the 405 fixtures and their build order; no fixture gets a `rotation` (parity).
 */
export function sultansPool(): StageDesign {
  return {
    v: STAGE_DESIGN_VERSION,
    source: { kind: 'template', name: 'sultans-pool' },
    ...sultansPoolScenery(),
    trusses: [...mainTrusses(), ...ringTrusses()],
    fixtures: buildRig().fixtures.map(toStageFixture),
  };
}
