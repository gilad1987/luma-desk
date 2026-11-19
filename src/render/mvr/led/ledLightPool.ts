import type { Object3D } from 'three';
import { MAX_WALL_LIGHTS, makeLightSet, nodesOf, rootOf, type LightSet } from './ledLightSet';
import type { V3 } from './ledPose';
import { isShown } from './ledShown';
import { wallColour, type WallLight } from './ledWallColour';

/** A point source overstates a wall close to it, and nothing shadows this light, so it gives half the wall's flux. */
const LIGHT_GAIN = 0.5;

/** One LED wall as a source of light on the stage: a panel wall or a marked mesh. Stage frame, metres. */
export interface WallSource extends Omit<WallLight, 'colour'> {
  readonly seed: number;
  /** Wall coordinates of the lower left corner, for a mesh, whose content is mapped by its place on the stage. */
  readonly origin?: readonly [number, number];
  /** Area, less for a wall outside the venue box: the order in which walls get a light. */
  readonly weight: number;
  /** The object whose visibility says that the wall is on screen; undefined while its layer is not built. */
  readonly anchor: () => Object3D | undefined;
}

const sources = new Set<WallSource>();
let lit: WallSource[] = [];
let pool: LightSet | undefined;

const near = (a: V3, b: V3, reach: number): boolean => a.every((value, i) => Math.abs(value - (b[i] ?? 0)) <= reach);
/** Two sources that are one wall on two layers (layers are often alternatives of one wall): one light for both. */
const same = (a: WallSource, b: WallSource): boolean =>
  near(a.position, b.position, 0.5) &&
  near(a.normal, b.normal, 0.1) &&
  near([a.width, a.height, 0], [b.width, b.height, 0], 0.3);

/**
 * Gives the walls on screen their lights for this frame, in content colour and level: of the shown sources the four
 * with the most weight, one per wall. A wall that is off, hidden or gone leaves its light dark. Runs once per frame
 * from the set's mesh (`makeLightSet`); a caller with a frame loop of its own may call it too.
 */
export function syncWallLights(): void {
  const shown = [...sources].filter((source) => isShown(source.anchor())).sort((a, b) => b.weight - a.weight);
  lit = [];
  for (const source of shown) {
    if (lit.length < MAX_WALL_LIGHTS && !lit.some((other) => same(other, source))) lit.push(source);
  }
  // A wall that is hidden now still brings the set: its frame mesh is what sees the wall come on screen later.
  const first = lit[0] ?? [...sources].find((source) => source.anchor());
  const anchor = first?.anchor();
  if (first && anchor) {
    pool ??= makeLightSet(syncWallLights);
    const root = rootOf(anchor);
    if (pool.beacon.parent !== root) root.add(...nodesOf(pool));
    // The mesh stands at a wall, so a box around the scenery does not grow to the origin for it.
    pool.beacon.position.fromArray(first.position);
  }
  // The pool stays while every wall is hidden, its lights at intensity 0: taking four lights out of the scene and
  // putting them back changes the light count, which makes three.js compile every lit material again on each toggle.
  pool?.lights.forEach((light, index) => {
    const source = lit[index];
    const colour = source ? wallColour(source) : [0, 0, 0];
    const peak = Math.max(colour[0] ?? 0, colour[1] ?? 0, colour[2] ?? 0);
    light.intensity = source ? peak * source.width * source.height * LIGHT_GAIN : 0;
    if (!source) return;
    const [p, n] = [source.position, source.normal];
    light.position.set(p[0], p[1], p[2]);
    light.target.position.set(p[0] + n[0], p[1] + n[1], p[2] + n[2]);
    if (peak > 0) light.color.setRGB((colour[0] ?? 0) / peak, (colour[1] ?? 0) / peak, (colour[2] ?? 0) / peak);
  });
}

/** Adds walls as light sources; the returned call takes them out again. The lights leave with the last source. */
export function addWallSources(list: readonly WallSource[]): () => void {
  for (const source of list) sources.add(source);
  return () => {
    for (const source of list) sources.delete(source);
    lit = lit.filter((source) => sources.has(source));
    if (sources.size > 0 || !pool) return;
    for (const node of nodesOf(pool)) node.removeFromParent();
    for (const light of pool.lights) light.intensity = 0;
  };
}

/** The wall lights now lit, as data; a surface-lighting pass can take them in place of the spots. */
export function wallLights(): WallLight[] {
  return lit.map(({ position, normal, width, height, ...source }) => {
    return { position, normal, width, height, colour: wallColour({ width, height, ...source }) };
  });
}
