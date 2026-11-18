import type { Mesh, Object3D, PointLight } from 'three';
import type { VenueKind } from '../../domain/stage/types';
import type { SceneryRegistry } from '../stage/SceneryRegistry';
import type { StageSlots } from '../stage/StageSlots';
import type { BandFit } from './BandFit';
import { buildBlackBox } from './BlackBox';
import type { CrowdBounceUniforms } from './crowdBounce';
import type { VenueMaterials } from './materials';
import { buildMvrVenue } from './MvrVenue';
import { buildOpenField } from './OpenField';
import type { Performer } from './performerSpec';
import type { Sky } from './Sky';
import { buildSultansPool } from './SultansPool';

/** The venue handles that the camera views, fixture visuals and frame loop need after the build. */
export interface Venue {
  /** The sky dome and stars; a black box has none. */
  readonly sky: Sky | null;
  /** The FOH riser and desk in build order; the camera views' FOH rig hides them in the MA layout. */
  readonly fohRig: readonly Mesh[];
  /** Forced dark every frame by the scene lights (legacy quirk); only Sultan's Pool has the old-city floodlight. */
  readonly wallFloodlight: PointLight | null;
  readonly performers: readonly Performer[];
  readonly crowd: CrowdBounceUniforms;
  /** The band and crowd objects by scenery part; the frame loop skips a hidden part's per-frame work. */
  readonly scenery: SceneryRegistry;
}

/** A venue as one build returns it: the handles plus the fit that moves its band with the deck. */
export interface BuiltVenue extends Venue {
  readonly band: BandFit;
  /** The materials the venue lends the stage parts; the venue frees them, also when the design hides those parts. */
  readonly materials: VenueMaterials;
}

/**
 * Builds the venue of `kind` around the stage. Each kind builds in its own fixed order and calls the stage slots
 * once each, where its stage parts belong: three.js takes each uuid from the seeded `Math.random`, so the Sultan's
 * Pool order is render parity (decision 24).
 */
export function buildVenue(scene: Object3D, stage: StageSlots, kind: VenueKind): BuiltVenue {
  switch (kind) {
    case 'sultans-pool':
      return buildSultansPool(scene, stage);
    case 'black-box':
      return buildBlackBox(scene, stage);
    case 'open-field':
      return buildOpenField(scene, stage);
    case 'mvr':
      return buildMvrVenue(scene, stage);
  }
}
