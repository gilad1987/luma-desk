import { Color } from 'three';
import type { Scene, WebGLRenderer } from 'three';

/**
 * The renderer and scene settings that a draw of the bare surfaces changes, kept and put back around it. A pixel
 * with no mesh must stay 0 in every buffer, so the clear is transparent black and the scene has no background; and
 * three's own shadow maps must not be drawn again from a scene whose materials are swapped. The scene pass of the
 * same frame already updated every world matrix, so these draws do not walk the tree for it again.
 */
export class DrawState {
  readonly #clear = new Color();
  #alpha = 1;
  #autoClear = true;
  #shadows = true;
  #matrices = true;
  #background: Scene['background'] = null;

  open(renderer: WebGLRenderer, scene: Scene): void {
    this.#autoClear = renderer.autoClear;
    this.#shadows = renderer.shadowMap.autoUpdate;
    this.#background = scene.background;
    this.#matrices = scene.matrixWorldAutoUpdate;
    this.#alpha = renderer.getClearAlpha();
    renderer.getClearColor(this.#clear);
    renderer.autoClear = true;
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.autoUpdate = false;
    scene.background = null;
    scene.matrixWorldAutoUpdate = false;
  }

  close(renderer: WebGLRenderer, scene: Scene): void {
    scene.matrixWorldAutoUpdate = this.#matrices;
    scene.background = this.#background;
    renderer.shadowMap.autoUpdate = this.#shadows;
    renderer.setClearColor(this.#clear, this.#alpha);
    renderer.autoClear = this.#autoClear;
  }
}
