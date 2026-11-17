import { STAGE_DESIGN_VERSION, type StageDesign } from '../../../../src/domain/stage/StageDesign.ts';
import { DECK, RING, ROOF, SCREEN, STAGE } from '../../../../src/domain/venue.ts';

/**
 * A design built from the venue.ts constants: the built-in deck, LED wall and both rings, every scenery part on, no
 * fixtures. The frame, surface and bounds tests compare against it until the Sultan's Pool template exists, so they
 * prove that the built-in numbers come back exactly.
 */
export const VENUE_DESIGN: StageDesign = {
  v: STAGE_DESIGN_VERSION,
  source: { kind: 'template', name: 'venue-constants' },
  venue: { kind: 'sultans-pool', gridY: ROOF },
  scenery: { deck: true, trusses: true, band: true, ledWall: true, crowd: true },
  deck: { ...STAGE, height: DECK },
  screens: [{ id: 'main', fixtureId: 2001, ...SCREEN }],
  risers: [],
  trusses: [
    {
      id: 'outer-ring',
      name: 'Outer ring',
      role: 'ring',
      transform: { position: [RING.x, RING.y, RING.z] },
      params: { kind: 'circle', radius: RING.R, section: 0.5 },
    },
    {
      id: 'inner-ring',
      name: 'Inner ring',
      role: 'ring',
      transform: { position: [RING.x, RING.y2, RING.z] },
      params: { kind: 'circle', radius: RING.r2, section: 0.4 },
    },
  ],
  fixtures: [],
};
