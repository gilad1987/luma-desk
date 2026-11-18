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

/** Builds the import summary from the steps' results, so the UI shows counts without walking the design again. */
export function summarize(
  scene: MvrScene,
  rig: ResolvedRig,
  noGeometry: boolean,
  bodyLines: readonly BodyLine[],
): MvrSummary {
  return {
    bodyLines,
    fixtureCount: rig.fixtures.length,
    unpatchedCount: rig.fixtures.filter((fixture) => fixture.patch === undefined).length,
    missingGdtfCount: rig.missingGdtfCount,
    objectCount: countObjects(scene),
    placementCount: scene.placements.length,
    layerCount: scene.layers.length,
    noGeometry,
  };
}
