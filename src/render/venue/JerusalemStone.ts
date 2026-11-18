import { MeshBasicMaterial, MeshStandardMaterial, RepeatWrapping, type CanvasTexture } from 'three';
import { srgbCanvasTexture } from '../shared';
import { paintStone } from './stoneCanvas';

/** One stone tile texture; the materials clone it so each surface sets its own repeat. */
const stoneTexture = (lit: boolean): CanvasTexture => srgbCanvasTexture(256, 256, paintStone(lit), RepeatWrapping);

/**
 * The two Jerusalem-stone looks of the venue. Each material gets its own texture clone with a repeat of one tile per
 * 8 m, so the blocks keep their size on surfaces of any size (a known cost: one texture per surface).
 */
export class JerusalemStone {
  readonly #floodlit = stoneTexture(true);
  readonly #shaded = stoneTexture(false);

  /** The pool's retaining walls and terraces: a standard material, so the show lights them. */
  terrace(width: number, height: number): MeshStandardMaterial {
    return new MeshStandardMaterial({
      map: this.#tiled(this.#shaded, width, height),
      roughness: 0.95,
      color: 0xcfc3b0,
    });
  }

  /** The Old City walls and towers: a basic material, floodlit at night whatever the stage does. */
  floodlit(width: number, height: number): MeshBasicMaterial {
    return new MeshBasicMaterial({ map: this.#tiled(this.#floodlit, width, height), color: 0xb0a090, fog: true });
  }

  #tiled(texture: CanvasTexture, width: number, height: number): CanvasTexture {
    const tile = texture.clone();
    tile.needsUpdate = true;
    tile.repeat.set(width / 8, height / 8);
    return tile;
  }
}
