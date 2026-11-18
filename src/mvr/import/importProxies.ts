import type { StageDesign } from '../../domain/stage/StageDesign';
import { stageBox } from '../design/stageBox';
import { emptyBox, isFiniteBox, pointBox, union, type Aabb, type Point3 } from '../math/Aabb';
import { fromThree, pointToThree } from '../math/axes';
import { identity } from '../math/Mat4';
import type { MvrGeometry } from '../MvrImport';
import type { MvrWarning } from '../MvrWarning';
import { classifyProxies } from '../scene/proxyClassify';
import type { MvrProxy, ProxyPlacement } from '../scene/ProxyPlacement';
import { proxyWarnings } from '../scene/proxyWarnings';

/** A drawn proxy further than this (metres) outside all other geometry is reported, as nothing explains it there. */
const FAR = 10;

/** The centre of a box in the fitted three frame as an MVR point (millimetres, Z up, before the fit). */
function toMvr(box: Aabb, offset: Point3): Point3 {
  const shift = identity();
  for (const i of [0, 1, 2]) shift[12 + i] = ((box.min[i] ?? 0) + (box.max[i] ?? 0)) / 2 - (offset[i] ?? 0);
  const m = fromThree(shift);
  return [m[12] ?? 0, m[13] ?? 0, m[14] ?? 0];
}

/** How far a point lies outside a box on its worst axis; 0 inside. */
function outside(box: Aabb, p: Point3): number {
  return Math.max(
    0,
    ...[0, 1, 2].map((i) => Math.max((box.min[i] ?? 0) - (p[i] ?? 0), (p[i] ?? 0) - (box.max[i] ?? 0))),
  );
}

/**
 * One line per layer whose drawn proxies stand far from every mesh and fixture, so the user can hide that layer.
 * `all` is not finite for a file without a mesh: fixtures alone do not say where the venue ends, so nothing is far.
 */
function farWarnings(proxies: readonly MvrProxy[], all: Aabb, offset: Point3): MvrWarning[] {
  if (!isFiniteBox(all)) return [];
  const far = new Map<string, number>();
  for (const { kind, matrix: m, layerName } of proxies) {
    const [x, y, z] = pointToThree([m[12] ?? 0, m[13] ?? 0, m[14] ?? 0]);
    const at: Point3 = [x + offset[0], y + offset[1], z + offset[2]];
    if (kind !== 'unknown' && outside(all, at) > FAR) far.set(layerName, (far.get(layerName) ?? 0) + 1);
  }
  return [...far].map(([layer, n]) => ({
    code: 'empty-symdef',
    message: `${n.toLocaleString('en-US')} proxies of layer "${layer}" are more than ${FAR} m outside the other geometry of the file; hide the layer if it is not part of the show.`,
    ref: layer,
  }));
}

/**
 * The import's proxy step: classifies the empty-Symdef placements, with seats facing the centre of the stage box
 * (`stageBox`, as the camera uses it), and words the summary lines. The geometry gets the proxies only when the file
 * has some, so a file without them keeps the geometry object it had.
 */
export function importProxies(
  placements: readonly ProxyPlacement[],
  design: StageDesign,
  geometry: MvrGeometry,
): { readonly geometry: MvrGeometry; readonly warnings: readonly MvrWarning[] } {
  if (placements.length === 0) return { geometry, warnings: [] };
  const fixtures = design.fixtures.map((fixture) => fixture.position);
  const stage = stageBox(geometry.layers, fixtures, [...(design.mvr?.hiddenLayers ?? []), ...geometry.hallLayers]);
  const proxies = classifyProxies(placements, isFiniteBox(stage) ? toMvr(stage, geometry.offset) : undefined);
  const meshes = geometry.layers.map((layer) => layer.box).reduce(union, emptyBox());
  const all = isFiniteBox(meshes) ? fixtures.map(pointBox).reduce(union, meshes) : meshes;
  const warnings = [...proxyWarnings(proxies), ...farWarnings(proxies, all, geometry.offset)];
  return { geometry: { ...geometry, proxies }, warnings };
}
