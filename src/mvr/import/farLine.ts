import type { StageDesign } from '../../domain/stage/StageDesign';
import { isFiniteBox, type Aabb, type Point3 } from '../math/Aabb';
import { pointToThree } from '../math/axes';
import type { MvrGeometry } from '../MvrImport';
import type { MvrWarning } from '../MvrWarning';
import type { MvrProxy } from '../scene/ProxyPlacement';

/** A drawn proxy further than this (metres) outside all other geometry is reported, as nothing explains it there. */
export const FAR = 10;

/** The layers that lie far outside the other geometry and start hidden, and one line per layer with a far proxy. */
export interface FarLayers {
  readonly hidden: readonly string[];
  readonly warnings: readonly MvrWarning[];
}

/** What the far rule measures against: the file box, whether it may hide, and the layers a fixture stands on. */
export interface FarRule {
  readonly all: Aabb;
  readonly hide: boolean;
  readonly fixtureLayers: ReadonlySet<string>;
}

/** The drawn proxies of one layer: how many, how many are panels, and how many stand far outside the file box. */
interface LayerCount {
  readonly name: string;
  readonly panels: number;
  readonly total: number;
  readonly far: number;
}

/** How far a point lies outside a box on its worst axis; 0 inside. */
export function outside(box: Aabb, p: Point3): number {
  return Math.max(
    0,
    ...[0, 1, 2].map((i) => Math.max((box.min[i] ?? 0) - (p[i] ?? 0), (p[i] ?? 0) - (box.max[i] ?? 0))),
  );
}

/**
 * The summary line of a layer with far proxies. A parked layer is hidden, and the line says what it holds, that it
 * is hidden and where to turn it on; any other far layer is shown, and the line leaves the choice to the user.
 */
function farLine(count: LayerCount, parked: boolean): MvrWarning {
  const { name, panels, total, far } = count;
  const kind = panels === 0 ? 'seats' : 'proxies';
  const what = panels === total ? 'LED panels' : kind;
  const message = parked
    ? `${total.toLocaleString('en-US')} ${what} on layer "${name}" lie more than ${FAR} m outside the other geometry of the file; the layer is hidden (turn it on in the layer list).`
    : `${far.toLocaleString('en-US')} proxies of layer "${name}" are more than ${FAR} m outside the other geometry of the file; hide the layer if it is not part of the show.`;
  return { code: 'empty-symdef', message, ref: name };
}

/**
 * The layers with a drawn proxy far from every mesh and fixture. A layer is a parked block (a spare wall beside the
 * show) only when every drawn proxy of it is far, it holds no mesh and no fixture stands on it (`fixtureLayers`):
 * with `hide` it starts hidden and its line says so. One near proxy is evidence that the layer belongs to the show
 * (a main wall behind the rig with a side screen far off, seat rows in front of an open-air stage), so any other far
 * layer stays shown and gets a line that leaves the choice to the user.
 * `all` is not finite for a file without a mesh: fixtures alone do not say where the show ends, so nothing is far.
 */
export function farLayers(proxies: readonly MvrProxy[], geometry: MvrGeometry, rule: FarRule): FarLayers {
  const { all, hide, fixtureLayers } = rule;
  if (!isFiniteBox(all)) return { hidden: [], warnings: [] };
  const counts = new Map<string, LayerCount>();
  for (const { kind, matrix: m, layer, layerName: name } of proxies) {
    if (kind === 'unknown') continue;
    const [x, y, z] = pointToThree([m[12] ?? 0, m[13] ?? 0, m[14] ?? 0]);
    const away = outside(all, [x + geometry.offset[0], y + geometry.offset[1], z + geometry.offset[2]]);
    const c = counts.get(layer) ?? { name, panels: 0, total: 0, far: 0 };
    const [panels, far] = [c.panels + Number(kind === 'panel'), c.far + Number(away > FAR)];
    counts.set(layer, { name, panels, total: c.total + 1, far });
  }
  const far = [...counts].filter(([, c]) => c.far > 0);
  const lone = (layer: string): boolean => !geometry.layers.some((l) => l.layer === layer) && !fixtureLayers.has(layer);
  const parked = far.filter(([layer, c]) => hide && c.far === c.total && lone(layer));
  const lines = far.map(([layer, c]) =>
    farLine(
      c,
      parked.some(([uuid]) => uuid === layer),
    ),
  );
  return { hidden: parked.map(([layer]) => layer), warnings: lines };
}

/** `design` with `uuids` added to the layers it hides at the start; the same design when there is nothing to add. */
export function withHiddenLayers(design: StageDesign, uuids: readonly string[]): StageDesign {
  if (!design.mvr || uuids.length === 0) return design;
  const hiddenLayers = [...new Set([...design.mvr.hiddenLayers, ...uuids])];
  return { ...design, mvr: { ...design.mvr, hiddenLayers } };
}
