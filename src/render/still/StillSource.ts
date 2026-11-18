import type { WebGLRenderTarget } from 'three';
import type { StillCamera } from './rendererState';
import type { TileRect } from './tilePlan';

/** The output a still render makes; the source sizes its post chain to it in `beginFrame`. */
export interface StillFrame {
  readonly width: number;
  readonly height: number;
}

/** One sample of one tile. */
export interface StillSampleContext {
  readonly tile: TileRect;
  /** 0-based; the source rotates its own random choices with it (march jitter, lens point, light batch). */
  readonly sample: number;
  /** The sub-pixel offset in output pixels, already applied to `camera` through `setViewOffset`. */
  readonly jitter: readonly [number, number];
  /** A tile-sized RGBA16F target (with a depth buffer). */
  readonly target: WebGLRenderTarget;
}

/**
 * What draws the picture of a still render: the live MVR chain in production, `FakeStillSource` in tests.
 *
 * `renderSample` REPLACES every pixel of `target` with one HDR sample (linear radiance, before bloom and tone
 * mapping); the core adds it to its own sum. Replace, not add: a scene draw clears, depth-tests and overwrites,
 * so a source cannot add into a shared sum, and the sum's format (RGBA32F or a 16F running mean) stays the core's
 * choice. `renderer.autoClear` is false during the call, so the source clears what it draws into.
 */
export interface StillSource {
  /** The camera the core moves per tile and sample (`setViewOffset`, output aspect); restored after every frame. */
  readonly camera: StillCamera;
  /** Freezes the look (time, cues, animation) for the whole render and sizes the source to the output. */
  beginFrame(frame: StillFrame): void;
  renderSample(context: StillSampleContext): void;
  /**
   * Runs bloom, tone mapping and the sRGB output ONCE over the whole resolved HDR image, so no tile shows a bloom
   * seam. `out` is an RGBA8 target of the output size; it must hold sRGB-encoded bytes with alpha 1.
   */
  resolvePost(hdrFull: WebGLRenderTarget, out: WebGLRenderTarget): void;
  /** Frees the source's own targets; the core frees the targets it passed in. */
  dispose(): void;
}
