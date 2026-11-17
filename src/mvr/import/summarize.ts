import type { MvrSummary } from '../MvrImport';
import type { MvrScene } from '../scene/MvrScene';
import type { ResolvedRig } from './resolveFixtures';

/**
 * Counts scene objects once each: every element that owns mesh placements (a truss, a speaker, a set piece) plus the
 * `<Fixture>` elements that turned out not to be lights. Fixture bodies with their own meshes are not objects.
 */
function countObjects(scene: MvrScene, rig: ResolvedRig): number {
  const owners = scene.placements.filter((placement) => placement.kind !== 'Fixture').map((p) => p.uuid);
  return new Set([...owners, ...rig.objectUuids]).size;
}

/** Builds the import summary from the steps' results, so the UI shows counts without walking the design again. */
export function summarize(scene: MvrScene, rig: ResolvedRig, noGeometry: boolean): MvrSummary {
  return {
    fixtureCount: rig.fixtures.length,
    unpatchedCount: rig.fixtures.filter((fixture) => fixture.patch === undefined).length,
    missingGdtfCount: rig.missingGdtfCount,
    objectCount: countObjects(scene, rig),
    placementCount: scene.placements.length,
    layerCount: scene.layers.length,
    noGeometry,
  };
}
