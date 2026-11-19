import { HalfFloatType, UnsignedByteType } from 'three';
import type { ShaderMaterial, WebGLRenderer, WebGLRenderTarget } from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import type { AccumFormat } from './floatCaps';
import { gpuGateFor, type GpuGate } from './gpuGate';
import { createStillMaterials, setAccumulateBlend, stillTarget as target } from './stillMaterials';
import { uniform, vector2 } from './uniforms';
import { PROBE_HEIGHT, PROBE_WIDTH } from './stopRule';
import type { TileRect } from './tilePlan';

/**
 * The targets and draws that turn tile samples into the full HDR image. Memory per target: `STILL_MEMORY_MB`.
 * The tile targets are freed before the post chain runs, so the peak is `full` + tiles while sampling and
 * `full` + output + canvas while encoding.
 */
export class Accumulator {
  readonly full: WebGLRenderTarget;
  readonly sample: WebGLRenderTarget;
  private readonly sum: WebGLRenderTarget;
  private readonly probeTarget = target(PROBE_WIDTH, PROBE_HEIGHT, UnsignedByteType);
  private readonly probePixels = new Uint8Array(PROBE_WIDTH * PROBE_HEIGHT * 4);
  private readonly quad = new FullScreenQuad();
  private readonly materials = createStillMaterials();
  private readonly renderer: WebGLRenderer;
  private readonly format: AccumFormat;
  private readonly gate: GpuGate;

  constructor(renderer: WebGLRenderer, width: number, height: number, format: AccumFormat) {
    this.renderer = renderer;
    this.format = format;
    this.full = target(width, height, HalfFloatType);
    this.sample = target(1, 1, HalfFloatType, true);
    this.sum = target(1, 1, format.type);
    this.gate = gpuGateFor(renderer);
  }

  /** Sizes the tile targets; three keeps a target whose size does not change. */
  startTile(tile: TileRect): void {
    this.sample.setSize(tile.width, tile.height);
    this.sum.setSize(tile.width, tile.height);
  }

  /** Adds `sample` (the content of the sample target) to the tile; sample 0 replaces, so no clear is needed. */
  add(sample: number): void {
    const { accumulate } = this.materials;
    const isMean = this.format.mode === 'mean';
    setAccumulateBlend(accumulate, sample, isMean);
    uniform(accumulate, 'map').value = this.sample.texture;
    this.draw(accumulate, this.sum);
    this.gate.mark();
  }

  /** False while the GPU still works on the last added sample (see `GpuGate`). */
  ready = (): boolean => this.gate.ready();

  /** The tone-mapped tile mean of the samples so far, at the probe size, as RGBA8 (reused buffer). */
  probe(): Uint8Array {
    const { probe } = this.materials;
    uniform(probe, 'map').value = this.sum.texture;
    vector2(probe, 'tileSize').set(this.sum.width, this.sum.height);
    this.draw(probe, this.probeTarget);
    this.renderer.readRenderTargetPixels(this.probeTarget, 0, 0, PROBE_WIDTH, PROBE_HEIGHT, this.probePixels);
    return this.probePixels;
  }

  /** Writes the tile's mean of its valid samples into its place in `full`; each texel divides by its own count. */
  writeTile(tile: TileRect): void {
    const { resolve } = this.materials;
    uniform(resolve, 'map').value = this.sum.texture;
    vector2(resolve, 'origin').set(tile.x, tile.glY);
    this.full.viewport.set(tile.x, tile.glY, tile.width, tile.height);
    this.draw(resolve, this.full);
    this.full.viewport.set(0, 0, this.full.width, this.full.height);
  }

  private draw(material: ShaderMaterial, to: WebGLRenderTarget): void {
    this.quad.material = material;
    this.renderer.autoClear = false;
    this.renderer.setRenderTarget(to);
    this.quad.render(this.renderer);
  }

  /** Frees the tile-sized targets early, before the post chain allocates its own. */
  disposeTileTargets = (): void => [this.sample, this.sum, this.probeTarget].forEach((t) => t.dispose());

  dispose(): void {
    this.disposeTileTargets();
    this.full.dispose();
    this.gate.dispose();
    this.quad.dispose();
    Object.values(this.materials).forEach((m) => m.dispose());
  }
}
