import { Vector4 } from 'three';
import type { WebGLRenderer } from 'three';
import type { TileRect } from '../tilePlan';
import { decode, runToEnd } from './harnessRun';

/** The renderer state the still render must give back, as plain JSON. */
export interface RendererSnapshot {
  readonly target: string | null;
  readonly viewport: number[];
  readonly scissor: number[];
  readonly flags: (boolean | number)[];
}

export function rendererSnapshot(renderer: WebGLRenderer): RendererSnapshot {
  const target = renderer.getRenderTarget();
  return {
    target: target === null ? null : target.texture.uuid,
    viewport: renderer.getViewport(new Vector4()).toArray(),
    scissor: renderer.getScissor(new Vector4()).toArray(),
    flags: [
      renderer.getScissorTest(),
      renderer.getPixelRatio(),
      renderer.toneMapping,
      renderer.toneMappingExposure,
      renderer.autoClear,
    ],
  };
}

/** Mean absolute error per channel in 8-bit steps: R against the ramp (x + 0.5) / width, G against `green`, B 127.5. */
export function meanErrors(pixels: Uint8ClampedArray, width: number, green: number): number[] {
  const sums = [0, 0, 0];
  for (let i = 0; i < pixels.length; i += 4) {
    const refs = [((((i / 4) % width) + 0.5) / width) * 255, green, 127.5];
    for (let c = 0; c < 3; c++) sums[c] = (sums[c] ?? 0) + Math.abs((pixels[i + c] ?? 0) - (refs[c] ?? 0));
  }
  return sums.map((sum) => sum / (pixels.length / 4));
}

export interface SeamResult {
  readonly maxDiff: number;
  readonly tiledParts: number;
  readonly compared: number;
}

/**
 * The largest byte difference between an 8K render through its 16-tile plan and one single pass (one tile) over a
 * 960 x 540 window centred on the corner of four tiles, so the window crosses both a vertical and a horizontal seam.
 */
export async function seamCheck(renderer: WebGLRenderer): Promise<SeamResult> {
  const [width, height, x, y, w, h] = [7680, 4320, 1440, 810, 960, 540];
  const window: TileRect = { index: 0, x, y, width: w, height: h, glY: height - y - h };
  const tiled = await runToEnd(renderer, { width, height, quality: 'draft' });
  const a = await decode(tiled.output, window);
  const single = await runToEnd(renderer, {
    width,
    height,
    quality: 'draft',
    plan: { width, height, tiles: [window] },
  });
  const b = await decode(single.output, window);
  let maxDiff = 0;
  a.forEach((value, i) => (maxDiff = Math.max(maxDiff, Math.abs(value - (b[i] ?? -1)))));
  return { maxDiff, tiledParts: tiled.output.parts.length, compared: a.length / 4 };
}

export interface Measurement {
  readonly msPerSample: number;
  readonly readBackMs: number;
  readonly encodeMs: number;
  readonly pngBytes: number;
  readonly heapMB: number | null;
}

/** Times one draft render: per sample, read-back and PNG encode, plus the JS heap if the browser reports it. */
export async function measure(renderer: WebGLRenderer, width: number, height: number): Promise<Measurement> {
  const { output, times } = await runToEnd(renderer, { width, height, quality: 'draft' });
  const memory: unknown = Reflect.get(performance, 'memory');
  const heap: unknown = typeof memory === 'object' && memory !== null ? Reflect.get(memory, 'usedJSHeapSize') : null;
  return {
    msPerSample: times.firstStrip / times.samples,
    readBackMs: times.strips - times.firstStrip,
    encodeMs: times.encoded - times.strips,
    pngBytes: output.parts.reduce((sum, part) => sum + part.blob.size, 0),
    heapMB: typeof heap === 'number' ? Math.round(heap / 1e6) : null,
  };
}
