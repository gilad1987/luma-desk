import type { StageFixture } from '../../domain/stage/StageDesign';
import type { MvrSummary } from '../MvrImport';
import type { MvrScene } from '../scene/MvrScene';
import type { BodyLine } from './bodyWarnings';
import type { ResolvedRig } from './resolveFixtures';

/**
 * Counts scene objects once each: every element that owns mesh placements (a truss, a speaker, a set piece). A
 * `<Fixture>` element is never an object, whatever its GDTF says: it is counted as a fixture and keeps its patch.
 */
function countObjects(scene: MvrScene): number {
  const owners = scene.placements.filter((placement) => placement.kind !== 'Fixture').map((p) => p.uuid);
  return new Set(owners).size;
}

/** Whether the file had no geometry, and the lines about fixture bodies. */
interface GeometryFacts {
  readonly noGeometry: boolean;
  readonly bodyLines: readonly BodyLine[];
}

/**
 * Builds the import summary from the steps' results, so the UI shows counts without walking the design again. The
 * unpatched count comes from the final `design`: a later step (`keepUnpatched`) takes patches off the rig's fixtures.
 */
export function summarize(
  scene: MvrScene,
  rig: ResolvedRig,
  design: { readonly fixtures: readonly StageFixture[] },
  { noGeometry, bodyLines }: GeometryFacts,
): MvrSummary {
  return {
    bodyLines,
    fixtureCount: rig.fixtures.length,
    unpatchedCount: design.fixtures.filter((fixture) => fixture.patch === undefined).length,
    missingGdtfCount: rig.missingGdtfCount,
    objectCount: countObjects(scene),
    placementCount: scene.placements.length,
    layerCount: scene.layers.length,
    noGeometry,
  };
}
