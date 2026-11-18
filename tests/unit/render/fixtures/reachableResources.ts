import { Mesh, Sprite, Texture, type BufferGeometry, type Material, type Object3D } from 'three';
import type { FixtureVisual } from '../../../../src/render/fixtures';

/** A GPU-backed resource a fixture visual can reach. */
export type Resource = Material | Texture | BufferGeometry;

type Drawable = Mesh<BufferGeometry, Material | Material[]> | Sprite;

const isDrawable = (o: Object3D): o is Drawable => o instanceof Mesh || o instanceof Sprite;

/**
 * Every geometry, material, material map and cloned pool texture the visuals' objects reach. Comparing two builds
 * tells owned resources (only one build reaches them) from shared ones, without a renderer.
 */
export function reachableResources(visuals: readonly FixtureVisual[]): Set<Resource> {
  const out = new Set<Resource>();
  const visit = (o: Object3D): void => {
    if (!isDrawable(o)) return;
    out.add(o.geometry);
    const materials: readonly Material[] = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of materials) {
      out.add(m);
      if ('map' in m && m.map instanceof Texture) out.add(m.map);
    }
  };
  for (const v of visuals) {
    if (v.kind !== 'light') continue;
    for (const root of [v.g, v.beam, v.pool, v.glow, v.pix]) root?.traverse(visit);
    for (const t of v.poolTex) if (t) out.add(t);
  }
  return out;
}
