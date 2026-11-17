/**
 * The per-frame light totals: audience zone split, stage sum product order and reset.
 */
import { describe, expect, it } from 'vitest';
import { LightFrame } from '../../../../src/render/SceneLightsFrame';

describe('LightFrame', () => {
  it('splits audience hits into zones at x = -13 and 13 (boundaries go to the centre)', () => {
    const frame = new LightFrame();
    for (const x of [-13.01, -13, 13, 13.01]) frame.addAudience(x, [1, 0, 0], 1);
    expect(frame.zones.map((zone) => zone.r)).toEqual([1, 2, 1]);
  });

  it('accumulates stage hits as colour x intensity x power, the legacy product order', () => {
    const frame = new LightFrame();
    frame.addStage([0.1, 0.2, 0.3], 0.7, 1.3);
    expect(frame.stage).toEqual({ r: 0.1 * 0.7 * 1.3, g: 0.2 * 0.7 * 1.3, b: 0.3 * 0.7 * 1.3 });
  });

  it('starts a clean frame on reset', () => {
    const frame = new LightFrame();
    frame.addStage([1, 1, 1], 1, 1);
    frame.addAudience(0, [1, 1, 1], 2);
    frame.addBlinder(0.4);
    frame.reset();
    expect(frame.stage).toEqual({ r: 0, g: 0, b: 0 });
    expect(frame.zones[1]).toEqual({ r: 0, g: 0, b: 0 });
    expect([frame.blinders, frame.keyCandidates.length]).toEqual([0, 0]);
  });
});
