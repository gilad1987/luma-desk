import type { MvrDesignInfo, MvrFixtureInfo } from '../../domain/stage/mvr';
import type { Vec3 } from '../../domain/stage/types';
import { pointToThree } from '../math/axes';
import { transformPoint } from '../math/Mat4';
import type { MvrScene } from '../scene/MvrScene';
import type { ResolvedFixture } from './DesignInput';

/** The world position of a fixture's focus point after the fit, or `undefined` when it has none or it is unknown. */
function focusOf(fixture: ResolvedFixture, scene: MvrScene, offset: Vec3): Vec3 | undefined {
  const matrix = fixture.record.focus === undefined ? undefined : scene.focusPoints.get(fixture.record.focus);
  if (!matrix) return undefined;
  const [x, y, z] = pointToThree(transformPoint(matrix, [0, 0, 0]));
  return [x + offset[0], y + offset[1], z + offset[2]];
}

/**
 * The MVR facts of the design, keyed by the assigned desk ids. `hiddenLayers` is empty here: the file's own
 * visibility is not read, and `toStageDesign` fills in the venue-hall layers it hides at the start.
 */
export function mvrInfo(
  fixtures: readonly ResolvedFixture[],
  ids: readonly number[],
  scene: MvrScene,
  offset: Vec3,
): MvrDesignInfo {
  const byId: Record<string, MvrFixtureInfo> = {};
  fixtures.forEach((fixture, index) => {
    const { uuid, layer } = fixture.record;
    const focus = focusOf(fixture, scene, offset);
    const { footprint } = fixture;
    const info = { uuid, layer, gdtfName: fixture.gdtfName, gdtfMode: fixture.mode, type: fixture.type };
    byId[String(ids[index])] = {
      ...info,
      ...(focus ? { focus } : {}),
      ...(footprint === undefined ? {} : { footprint }),
    };
  });
  const layers = scene.layers.map(({ uuid, name }) => ({ uuid, name }));
  return { fixtures: byId, layers, hiddenLayers: [], offset };
}
