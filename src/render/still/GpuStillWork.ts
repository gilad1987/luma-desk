import { UnsignedByteType } from 'three';
import type { WebGLRenderer, WebGLRenderTarget } from 'three';
import { Accumulator } from './Accumulator';
import { chooseAccumFormat, readFloatCaps, type AccumFormat } from './floatCaps';
import { gaussianJitter } from './jitter';
import { checkStillSize } from './memoryBudget';
import { PngOutput, type StillOutput } from './pngOutput';
import { stillTarget } from './stillMaterials';
import type { StillSource } from './StillSource';
import type { StillWork } from './StillWork';
import { StopRule } from './stopRule';
import { StripReader } from './stripReader';
import { need, tileAt, type StillOptions } from './stillOptions';
import { planTiles, viewOffset, type TilePlan } from './tilePlan';

/**
 * The GPU work of one still render: it owns the source for that render and every target it makes. Nothing is
 * allocated before `prepare`, and `dispose` frees all of it in any phase.
 */
export class GpuStillWork implements StillWork<StillOutput> {
  readonly tiles: number;
  readonly maxSamples: number;
  readonly format: AccumFormat;
  private readonly plan: TilePlan;
  private readonly rule: StopRule;
  // made by the phases in order; null before their phase and after `dispose`
  private accumulator: Accumulator | null = null;
  private out: WebGLRenderTarget | null = null;
  private reader: StripReader | null = null;
  private png: PngOutput | null = null;
  private readonly renderer: WebGLRenderer;
  private readonly source: StillSource;

  constructor(renderer: WebGLRenderer, source: StillSource, options: StillOptions) {
    this.renderer = renderer;
    this.source = source;
    this.plan = options.plan ?? planTiles(options.width, options.height);
    this.rule = new StopRule(options.quality);
    this.tiles = this.plan.tiles.length;
    this.maxSamples = this.rule.maxSamples;
    this.format = chooseAccumFormat(readFloatCaps((name) => renderer.extensions.has(name)));
  }

  ready = (): boolean => this.accumulator?.ready() ?? true;

  prepare(): void {
    const { width, height } = this.plan;
    checkStillSize(this.plan, this.format, this.renderer.capabilities.maxTextureSize);
    this.accumulator = new Accumulator(this.renderer, width, height, this.format);
    this.source.beginFrame({ width, height });
  }

  renderSample(tileIndex: number, sample: number): boolean {
    const [accumulator, tile] = [need(this.accumulator), tileAt(this.plan, tileIndex)];
    if (sample === 0) accumulator.startTile(tile);
    const jitter = gaussianJitter(sample);
    const offset = viewOffset(this.plan, tile, jitter);
    const { camera } = this.source;
    camera.aspect = this.plan.width / this.plan.height;
    camera.setViewOffset(offset.fullWidth, offset.fullHeight, offset.x, offset.y, offset.width, offset.height);
    this.renderer.autoClear = false;
    this.source.renderSample({ tile, sample, jitter, target: accumulator.sample });
    accumulator.add(sample);
    return this.rule.wantsProbe(sample + 1) && this.rule.offer(accumulator.probe());
  }

  finishTile(tileIndex: number): void {
    need(this.accumulator).writeTile(tileAt(this.plan, tileIndex));
    this.rule.reset();
  }

  resolve(): void {
    const accumulator = need(this.accumulator);
    accumulator.disposeTileTargets();
    const out = stillTarget(this.plan.width, this.plan.height, UnsignedByteType);
    this.out = out;
    this.renderer.autoClear = false;
    this.source.resolvePost(accumulator.full, out);
    // nothing reads the HDR image again: free it before the canvas grows (265 MB at 8K)
    accumulator.full.dispose();
    const png = new PngOutput(this.plan);
    this.png = png;
    this.reader = new StripReader(this.renderer, out, (strip) => png.put(strip));
  }

  readStrip(): boolean {
    return need(this.reader).readNext();
  }

  encode(): Promise<StillOutput> {
    return need(this.png).encode();
  }

  dispose(): void {
    this.accumulator?.dispose();
    this.out?.dispose();
    [this.accumulator, this.out, this.reader, this.png] = [null, null, null, null];
    this.source.dispose();
  }
}
