import type { Matrix4, Scene, Texture, WebGLRenderer } from 'three';
import { KeyShadows } from './KeyShadows';
import { ShadowAtlas } from './ShadowAtlas';
import type { ShadowLayers, ShadowSource } from './ShadowSource';

/** Shadow maps drawn per frame at most: a map costs a draw of the scenery, so several moving keys take turns. */
export const REFRESHES = 1;

/**
 * The cached shadow maps of the strongest front key lights, so figures cast shadows on the deck. The light shader
 * reads the maps itself: a key light stays one row of the surface light with a shadow term, so its light is counted
 * once, in one photometric scale, with no light added to the scene materials. With no key moving it draws nothing.
 */
export class KeyShadowMaps implements ShadowSource, ShadowLayers {
  readonly #keys = new KeyShadows();
  readonly #atlas = new ShadowAtlas();

  get texture(): Texture {
    return this.#atlas.texture;
  }

  get matrices(): readonly Matrix4[] {
    return this.#atlas.matrices;
  }

  layerOf(fixtureId: number): number {
    return this.#keys.layerOf(fixtureId);
  }

  offer(fixtureId: number, index: number, row: Float32Array): void {
    this.#keys.offer(fixtureId, index, row);
  }

  /** Call once per frame after the rows are packed: picks the keys. Returns whether a map is out of date. */
  update(rows: Float32Array, extras: Float32Array, stamp: number): boolean {
    this.#keys.update(rows, extras, stamp);
    return this.#keys.next(true) >= 0;
  }

  /** Call before the lights are drawn: the texture of the maps then exists, all lit, also before the first map. */
  prepare(renderer: WebGLRenderer): void {
    this.#atlas.prepare(renderer);
  }

  /** Draws the maps that are out of date, a few per frame, while `scene` holds only its opaque surfaces. */
  draw(renderer: WebGLRenderer, scene: Scene): number {
    for (let drawn = 0; drawn < REFRESHES; drawn++) {
      const slot = this.#keys.next();
      if (slot < 0) return drawn;
      this.#atlas.draw(renderer, scene, slot, this.#keys.poses);
      this.#keys.drawn(slot);
    }
    return REFRESHES;
  }

  dispose(): void {
    this.#atlas.dispose();
  }
}
