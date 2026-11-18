import { DECK, ROOF, SCREEN, STAGE } from '../../../venue';
import type { StageDesign } from '../../StageDesign';
import { sceneryFor } from '../../venueScenery';

/** The parts of a design that describe the venue around the rig rather than the trusses and fixtures. */
export type VenueParts = Pick<StageDesign, 'venue' | 'scenery' | 'deck' | 'screens' | 'risers'>;

/**
 * The Sultan's Pool venue, deck and LED wall, read from the same venue constants as the legacy scene so the default
 * design draws the stage exactly as before. The side screens use the legacy numbers of the side screen meshes.
 */
export function sultansPoolScenery(): VenueParts {
  return {
    venue: { kind: 'sultans-pool', gridY: ROOF },
    scenery: sceneryFor('sultans-pool'),
    deck: { x0: STAGE.x0, x1: STAGE.x1, z0: STAGE.z0, z1: STAGE.z1, height: DECK },
    screens: [
      {
        id: 'main',
        fixtureId: 2001,
        x0: SCREEN.x0,
        x1: SCREEN.x1,
        y0: SCREEN.y0,
        y1: SCREEN.y1,
        z: SCREEN.z,
        sides: [-1, 1].map((sx) => ({ at: [sx * 33.5, 15, 4], yaw: -sx * 0.38, width: 12, height: 6.75 })),
      },
    ],
    risers: [],
  };
}
