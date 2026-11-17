import { STAGE_DESIGN_VERSION, type StageDesign } from '../StageDesign';
import { sceneryFor } from '../venueScenery';

/**
 * The empty start: a 12 x 8 m deck, 1.2 m high, in a black box with no trusses, fixtures or screen. The builder
 * starts from it, and it proves that groups, presets and Auto Show work on a rig with no fixtures.
 */
export function emptyStage(): StageDesign {
  return {
    v: STAGE_DESIGN_VERSION,
    source: { kind: 'template', name: 'empty' },
    venue: { kind: 'black-box', gridY: 8 },
    // An empty stage has no band and no LED wall yet, so both parts start hidden.
    scenery: { ...sceneryFor('black-box'), band: false, ledWall: false },
    deck: { x0: -6, x1: 6, z0: -8, z1: 0, height: 1.2 },
    screens: [],
    risers: [],
    trusses: [],
    fixtures: [],
  };
}
