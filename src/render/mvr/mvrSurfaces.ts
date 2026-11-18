import { surfacesOf } from '../../domain/stage/surfaces';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { SurfaceBox } from '../../domain/stage/types';
import type { MvrGeometry } from '../../mvr/index';

/**
 * Every box beams land on for an imported stage: the design's own deck, risers and screens, then the tops of the MVR
 * meshes. The beam renderer takes all of them in its one `setSurfaces` call per rebuild (contract section 9), so the
 * two sources are joined here and never set one after the other.
 */
export function mvrSurfaces(design: StageDesign, geometry: MvrGeometry): SurfaceBox[] {
  return [...surfacesOf(design), ...geometry.surfaces];
}
