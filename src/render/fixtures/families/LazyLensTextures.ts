import type { CanvasTexture } from 'three';
import type { CanvasPainter } from '../../shared';
import { lensTexture } from '../LensTextures';

/**
 * The lens faces of the catalogue products, painted on first use. They cannot join `createLensTextures`, which runs at
 * boot: a canvas texture draws `Math.random` (its uuid, after the painter), so an eager product face would move
 * `random-calls.json` and the fixture-scene golden. One texture per product id, shared by every fixture of that
 * product; never disposed, like the native lens set, because it lives as long as its model table.
 */
export class LazyLensTextures {
  readonly #textures = new Map<string, CanvasTexture>();

  /** The face of product `id`, created by `painter` on the first call at `w` x `h` pixels, then shared. */
  get(id: string, painter: CanvasPainter, w = 128, h = 128): CanvasTexture {
    const cached = this.#textures.get(id);
    if (cached !== undefined) return cached;
    const texture = lensTexture(painter, w, h);
    this.#textures.set(id, texture);
    return texture;
  }
}
