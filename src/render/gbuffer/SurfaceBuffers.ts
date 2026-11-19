import type { Camera, Scene, Texture, WebGLRenderer } from 'three';

/**
 * The surface buffers of a scene: what a pass that lights or shades the scenery reads next to the scene depth (the
 * surface light and its bounce; the ambient occlusion reads the scene depth alone). Both are 8 bits per channel and
 * read with `texelFetch`.
 */
export interface SurfaceBuffers {
  /** rgb world normal * 0.5 + 0.5 (see `normalCode`); a is 0 where no mesh was drawn, else (1 + 254 m) / 255. */
  readonly normal: Texture;
  /** rgb base colour, linear; a roughness, and 0 where no mesh was drawn. */
  readonly surface: Texture;
  readonly width: number;
  readonly height: number;
  /**
   * The "scene moved" signal: a value that changes in the frame a surface mesh moves, appears or leaves, or a layer
   * is switched (`SceneWatch`). It is computed on the call, from what the last draw saw: call it once per frame.
   */
  stamp(): number;
  setSize(width: number, height: number): void;
  /** Draws the opaque meshes that `camera` sees: one draw of the scenery. */
  render(renderer: WebGLRenderer, scene: Scene, camera: Camera): void;
  /**
   * Runs `draw` while the scene holds only the surfaces that cast a shadow, without a draw of the buffers: the last
   * one stays. `camera` is the render camera: its layers choose the meshes.
   */
  casters(renderer: WebGLRenderer, scene: Scene, camera: Camera, draw: () => void): void;
  dispose(): void;
}
