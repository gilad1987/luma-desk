import type { StageDesign } from '../../domain/stage/StageDesign';
import { stageBox } from '../design/stageBox';
import { emptyBox, isFiniteBox, pointBox, union, type Aabb, type Point3 } from '../math/Aabb';
import { fromThree } from '../math/axes';
import { identity } from '../math/Mat4';
import type { MvrGeometry } from '../MvrImport';
import type { MvrWarning } from '../MvrWarning';
import { classifyProxies } from '../scene/proxyClassify';
import type { ProxyPlacement } from '../scene/ProxyPlacement';
import { proxyWarnings } from '../scene/proxyWarnings';
import { FAR, farLayers, outside } from './farLine';

export { FAR, outside };

/** The centre of a box in the fitted three frame as an MVR point (millimetres, Z up, before the fit). */
function toMvr(box: Aabb, offset: Point3): Point3 {
  const shift = identity();
  for (const i of [0, 1, 2]) shift[12 + i] = ((box.min[i] ?? 0) + (box.max[i] ?? 0)) / 2 - (offset[i] ?? 0);
  const m = fromThree(shift);
  return [m[12] ?? 0, m[13] ?? 0, m[14] ?? 0];
}

/**
 * Every mesh and fixture of the file, the box the far rule measures from; empty for a file without a mesh, as fixtures
 * alone do not say where the venue ends. The camera box (`proxyPoints`) drops the far layers by the same rule.
 */
export function fileBox(layers: MvrGeometry['layers'], fixtures: readonly Point3[]): Aabb {
  const meshes = layers.map((layer) => layer.box).reduce(union, emptyBox());
  return isFiniteBox(meshes) ? fixtures.map(pointBox).reduce(union, meshes) : meshes;
}

/**
 * The import's proxy step: classifies the empty-Symdef placements, with seats facing the centre of the stage box
 * (`stageBox`, as the camera uses it), and words the summary lines. The geometry gets the proxies only when the file
 * has some, so a file without them keeps the geometry object it had. `hidden` are the layers that lie far outside the
 * other geometry as a whole and start hidden; none with `hideOutside` off, which a file that brings the user's own
 * layer choice asks for.
 */
export function importProxies(
  placements: readonly ProxyPlacement[],
  design: StageDesign,
  geometry: MvrGeometry,
  hideOutside = true,
): { readonly geometry: MvrGeometry; readonly warnings: readonly MvrWarning[]; readonly hidden: readonly string[] } {
  if (placements.length === 0) return { geometry, warnings: [], hidden: [] };
  const fixtures = design.fixtures.map((fixture) => fixture.position);
  const stage = stageBox(geometry.layers, fixtures, [...(design.mvr?.hiddenLayers ?? []), ...geometry.hallLayers]);
  const proxies = classifyProxies(placements, isFiniteBox(stage) ? toMvr(stage, geometry.offset) : undefined);
  const fixtureLayers = new Set(Object.values(design.mvr?.fixtures ?? {}).map((fixture) => fixture.layer));
  const rule = { all: fileBox(geometry.layers, fixtures), hide: hideOutside, fixtureLayers };
  const far = farLayers(proxies, geometry, rule);
  return {
    geometry: { ...geometry, proxies },
    warnings: [...proxyWarnings(proxies), ...far.warnings],
    hidden: far.hidden,
  };
}
