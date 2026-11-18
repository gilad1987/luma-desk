import type { AccumFormat } from './floatCaps';
import type { TilePlan } from './tilePlan';

/**
 * GPU and CPU memory of a still render, in MB (10^6 bytes). RGBA16F is 8 B/px, RGBA32F 16 B/px, RGBA8 4 B/px.
 *
 * | buffer                                   | 4K (3840x2160) | 8K (7680x4320) |
 * | ---------------------------------------- | -------------- | -------------- |
 * | `full` HDR image, RGBA16F                | 66             | 265            |
 * | accumulation tile 1920x1080, RGBA32F     | 33             | 33             |
 * | sample tile 1920x1080, RGBA16F + depth   | 25             | 25             |
 * | output image, RGBA8 (GPU)                | 33             | 133            |
 * | PNG canvas, RGBA8 (CPU)                  | 33             | 133            |
 * | one read-back strip of 256 rows, RGBA8   | 4              | 8              |
 *
 * The tile targets are freed before the post chain runs. A 16384 x 16384 output needs 2.1 GB for `full` alone,
 * so such a size is only planned; whether it renders depends on the GPU's limits and memory.
 */
export const STILL_MEMORY_MB = {
  full: { '4k': 66, '8k': 265 },
  accumulationTile: 33,
  sampleTile: 25,
  output: { '4k': 33, '8k': 133 },
  canvas: { '4k': 33, '8k': 133 },
} as const;

/**
 * The most GPU memory a still render may ask for, in bytes. A context that allocates past what the GPU (or the
 * browser's share of it) can give is not refused: it is lost, and the render ends black with no message.
 * Integrated and mobile GPUs share 2-4 GB with the whole system, so 1.5 GB leaves the page and the live view room
 * on such a device, keeps 8K (about 0.4 GB) well inside, and refuses 16K, whose HDR image alone needs 2.1 GB.
 */
export const STILL_GPU_CAP_BYTES = 1.5e9;

/** Bytes per pixel of the formats the still render allocates. */
const BYTES_PER_PIXEL = { rgba32f: 16, rgba16f: 8, rgba8: 4, depth: 4 } as const;

/**
 * The peak GPU bytes of a still render. `full` (RGBA16F) lives from `prepare` to the post chain; beside it come
 * first the largest tile's sum (RGBA32F for a sum, RGBA16F for a mean) and sample target (RGBA16F and depth), then
 * the RGBA8 output, never both (the tiles are freed first). The post chain's own targets come on top.
 */
export function estimateStillBytes(plan: TilePlan, format: AccumFormat): number {
  const { rgba32f, rgba16f, rgba8, depth } = BYTES_PER_PIXEL;
  const pixels = plan.width * plan.height;
  const tilePixels = Math.max(0, ...plan.tiles.map((tile) => tile.width * tile.height));
  const tileBytes = tilePixels * ((format.mode === 'sum' ? rgba32f : rgba16f) + rgba16f + depth);
  return pixels * rgba16f + Math.max(tileBytes, pixels * rgba8);
}

const mb = (bytes: number): number => Math.round(bytes / 1e6);

/** Throws, before anything is allocated, when this GPU cannot hold a still of the plan's size. */
export function checkStillSize(plan: TilePlan, format: AccumFormat, maxTextureSize: number): void {
  const { width, height } = plan;
  if (width > maxTextureSize || height > maxTextureSize)
    throw new Error(`this GPU allows ${maxTextureSize} px a side; ${width} x ${height} is larger`);
  const bytes = estimateStillBytes(plan, format);
  if (bytes > STILL_GPU_CAP_BYTES) {
    const cap = mb(STILL_GPU_CAP_BYTES);
    throw new Error(`a ${width} x ${height} still needs about ${mb(bytes)} MB of GPU memory; the limit is ${cap} MB`);
  }
}
