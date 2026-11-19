import {
  DepthTexture,
  LessEqualCompare,
  LinearFilter,
  RedFormat,
  UnsignedByteType,
  UnsignedShortType,
  WebGLRenderTarget,
  type Camera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { RECT, tileRects, type AtlasLayout } from './atlasLayout';
import { read } from './beamFrame';

/**
 * The atlas texture and the draw of one tile into it.
 *
 * The depth is a depth texture with a compare function, not a float colour texture. WebGL2 then filters the compare
 * of 2x2 texels in the sampler (`sampler2DShadow`), so a beam sample costs one fetch; a colour texture needs four
 * fetches and an extension to render to. The depth is linear (see `glsl/depth.frag.glsl`), so 16 bits are enough:
 * 4096 x 4096 takes 32 MB. three.js cannot make a target without a colour texture, so the target carries the
 * smallest one (one byte per texel, 16 MB) and the depth material never writes it.
 */
export class AtlasTarget {
  readonly target: WebGLRenderTarget;
  readonly texture: DepthTexture;
  /** The texel rectangle of every tile (see `tileRects`). */
  readonly rects: Uint16Array;

  constructor(layout: AtlasLayout) {
    this.rects = tileRects(layout);
    this.texture = new DepthTexture(layout.size, layout.size, UnsignedShortType);
    this.texture.compareFunction = LessEqualCompare;
    this.texture.magFilter = LinearFilter;
    this.texture.minFilter = LinearFilter;
    this.target = new WebGLRenderTarget(layout.size, layout.size, {
      format: RedFormat,
      type: UnsignedByteType,
      depthTexture: this.texture,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    this.target.scissorTest = true;
  }

  /**
   * Clears one tile and draws `scene` into it; returns the triangles drawn. The scissor keeps the clear inside the
   * tile, so the other tiles keep their depth. The renderer's target and clear flag are as before on return.
   */
  draw(renderer: WebGLRenderer, scene: Scene, camera: Camera, tile: number): number {
    const x = read(this.rects, tile * RECT);
    const y = read(this.rects, tile * RECT + 1);
    const side = read(this.rects, tile * RECT + 2);
    // before setRenderTarget: the renderer copies both rectangles when the target is set
    this.target.viewport.set(x, y, side, side);
    this.target.scissor.set(x, y, side, side);
    const previous = renderer.getRenderTarget();
    const autoClear = renderer.autoClear;
    const before = renderer.info.render.triangles;
    renderer.autoClear = false;
    renderer.setRenderTarget(this.target);
    renderer.clear(false, true, false);
    renderer.render(scene, camera);
    renderer.setRenderTarget(previous);
    renderer.autoClear = autoClear;
    // with `info.autoReset` on (the default) render() starts the count at 0, so it is the tile's own; the test hook
    // switches it off, and the count then runs on from `before`
    const after = renderer.info.render.triangles;
    return renderer.info.autoReset ? after : after - before;
  }

  /** Frees the target and both of its textures. */
  dispose(): void {
    this.target.dispose();
  }
}
