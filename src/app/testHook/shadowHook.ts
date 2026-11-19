import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';
import { countParts, type CasterCount } from '../../render/shadow/casterCount';
import { LazyShadow } from '../../render/shadow/LazyShadow';
import { SHADOW_DEFAULTS, type ShadowConfig } from '../../render/shadow/shadowConfig';
import { ShadowRig, type ShadowReport } from '../../render/shadow/ShadowRig';
import type { SurfaceHit } from '../../render/surface/SurfaceHit';
import { readDeskClock } from './deskClock';

/** The render parts the shadow hook reads; it changes none of them. */
export interface ShadowHookRender {
  readonly renderer: WebGLRenderer;
  readonly camera: Camera;
  readonly scene: Scene;
  readonly surfaceHit: Pick<SurfaceHit, 'sceneryHit'>;
  readonly fixtureVisuals: { readonly visuals: readonly { readonly kind: string; readonly g?: Object3D }[] };
}

/** `window.__deskShadow`: the shadow atlas for specs and measurements, while no sampler uses it. */
export interface ShadowTestApi {
  /** Switches the atlas on (with changes to the default config) or off. It is off until this is called. */
  enable(on: boolean, changes?: Partial<ShadowConfig>): void;
  /** One atlas update for the beams of the last drawn frame; null while off and for a stage without scenery. */
  frame(): ShadowReport | null;
  /** The tile of every lit beam after the last `frame`, -1 for none. */
  tileOf(): number[];
  /** The depth at `n` x `n` points of a tile. */
  tile(tile: number, n: number): number[];
  /** Draws the atlas over the canvas and returns the canvas as a PNG data URL. */
  show(): string;
  /** Triangles, objects and new buffer bytes of the scenery chunks, then the same of the fixture bodies. */
  casters(): (CasterCount & { bodies: CasterCount }) | null;
}

/** The scenery group of a stage: the object under `scene` that holds `node`. */
function rootOf(node: Object3D | undefined, scene: Object3D): Object3D | null {
  let at = node;
  while (at?.parent && at.parent !== scene) at = at.parent;
  return at?.parent === scene ? at : null;
}

/** The groups of the fixture bodies; the same array until the visuals are rebuilt, as `ShadowRigDeps.bodies` asks. */
function bodyReader({ fixtureVisuals }: ShadowHookRender): () => readonly Object3D[] {
  let visuals: unknown;
  let bodies: Object3D[] = [];
  return () => {
    if (visuals !== fixtureVisuals.visuals) bodies = fixtureVisuals.visuals.flatMap((v) => (v.g ? [v.g] : []));
    visuals = fixtureVisuals.visuals;
    return bodies;
  };
}

/** The rig of the scenery that the beam hit test has now: the lazy holder is told when that scenery changes. */
function rigReader(render: ShadowHookRender, lazy: LazyShadow<ShadowRig>): () => ShadowRig | undefined {
  let shown: unknown;
  return () => {
    const hit = render.surfaceHit.sceneryHit;
    if (hit !== shown) lazy.setScenery(rootOf(hit?.scenery.holders[0], render.scene));
    shown = hit;
    return lazy.current;
  };
}

/**
 * Publishes the shadow atlas to the page with `?test`. The atlas has no consumer yet, so this hook stands in for
 * the wiring: before each update it reads which scenery the beam hit test has now and tells the lazy holder, as
 * `MvrSceneryFit` will with one call. It only reads the render parts. Nothing is created here or before `enable`.
 */
export function installShadowHook(render: ShadowHookRender): void {
  if (!readDeskClock()) return;
  const { renderer, camera, surfaceHit } = render;
  const bodies = bodyReader(render);
  const lazy = new LazyShadow((root, config) => {
    const scenery = surfaceHit.sceneryHit?.scenery ?? null;
    return new ShadowRig({ renderer, root, config, scenery, bodies });
  });
  const current = rigReader(render, lazy);
  const api: ShadowTestApi = {
    enable: (on, changes = {}) => lazy.enable(on ? { ...SHADOW_DEFAULTS, ...changes } : undefined),
    frame: () => current()?.frame(camera) ?? null,
    tileOf: () => [...(current()?.atlas.tileOf ?? [])],
    tile: (tile, n) => current()?.readTile(tile, n) ?? [],
    show: () => {
      current()?.show();
      return renderer.domElement.toDataURL();
    },
    casters: () => {
      const { parts, bodies } = current()?.casters ?? {};
      if (!parts || !bodies) return null;
      return { ...countParts(parts), bodies: countParts(bodies.parts) };
    },
  };
  Object.assign(window, { __deskShadow: api });
}
