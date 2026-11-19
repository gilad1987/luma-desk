import { FloatType, HalfFloatType } from 'three';
import { describe, expect, it } from 'vitest';
import type { AccumFormat } from '../../../../src/render/still/floatCaps';
import { checkStillSize, estimateStillBytes, STILL_GPU_CAP_BYTES } from '../../../../src/render/still/memoryBudget';
import { planTiles } from '../../../../src/render/still/tilePlan';

const SUM: AccumFormat = { mode: 'sum', type: FloatType };
const MEAN: AccumFormat = { mode: 'mean', type: HalfFloatType };

describe('still memory guard', () => {
  it('estimates the HDR image plus the larger of the tile targets and the output', () => {
    const px8k = 7680 * 4320;
    expect(estimateStillBytes(planTiles(7680, 4320), SUM)).toBe(px8k * 8 + px8k * 4);
    const tile = 1920 * 1080;
    // one 1080p tile: the sum (16 or 8 B) and the sample with depth (12 B) outweigh the RGBA8 output (4 B)
    expect(estimateStillBytes(planTiles(1920, 1080), SUM)).toBe(tile * 8 + tile * (16 + 8 + 4));
    expect(estimateStillBytes(planTiles(1920, 1080), MEAN)).toBe(tile * 8 + tile * (8 + 8 + 4));
  });

  it('lets 8K through and refuses 16K with the size and the cap in the message', () => {
    expect(() => checkStillSize(planTiles(7680, 4320), SUM, 16384)).not.toThrow();
    expect(STILL_GPU_CAP_BYTES).toBe(1.5e9);
    expect(() => checkStillSize(planTiles(16384, 16384), MEAN, 16384)).toThrow(
      'a 16384 x 16384 still needs about 3221 MB of GPU memory; the limit is 1500 MB',
    );
  });

  it('still refuses a side over the texture limit first', () => {
    expect(() => checkStillSize(planTiles(7680, 4320), SUM, 4096)).toThrow(
      'this GPU allows 4096 px a side; 7680 x 4320 is larger',
    );
  });
});
