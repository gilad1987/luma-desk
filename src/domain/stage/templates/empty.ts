import { STAGE_DESIGN_VERSION, type StageDesign } from '../StageDesign';

/**
 * The empty start: a 12 x 8 m deck, 1.2 m high, in a black box with no trusses, fixtures or screen. The builder
 * starts from it, and it proves that groups, presets and Auto Show work on a rig with no fixtures.
 */
export function emptyStage(): StageDesign {
  return {
    v: STAGE_DESIGN_VERSION,
    source: { kind: 'template', name: 'empty' },
    venue: { kind: 'black-box', gridY: 8 },
    scenery: { deck: true, trusses: true, band: false, ledWall: false, crowd: false },
    deck: { x0: -6, x1: 6, z0: -8, z1: 0, height: 1.2 },
    screens: [],
    risers: [],
    trusses: [],
    fixtures: [],
  };
}
