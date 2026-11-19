import { describe, expect, it } from 'vitest';
import { MVR_EXPOSURE } from '../../../../src/render/post/mvrTone';
import {
  adaptStops,
  ADAPT_SECONDS,
  EXPOSURE_RANGE,
  exposureOf,
  exposureStops,
  isRunning,
  METER,
  meterConstants,
  meteredStops,
  SHOW_BAND,
} from '../../../../src/render/post/showExposure';
import { meterImage } from './meterRenderer';

describe('the exposure rule of the show camera', () => {
  it('keeps the base exposure inside the band of a show look', () => {
    for (const scene of [SHOW_BAND.low, (SHOW_BAND.low + SHOW_BAND.high) / 2, SHOW_BAND.high])
      expect(exposureOf(exposureStops(scene))).toBe(MVR_EXPOSURE);
  });

  it('closes by the stops the highlights are over the band, and never by more than one stop', () => {
    expect(exposureStops(SHOW_BAND.high + 0.5)).toBeCloseTo(-0.5, 9);
    expect(exposureStops(SHOW_BAND.high + 6)).toBe(-EXPOSURE_RANGE.down);
    expect(exposureOf(exposureStops(METER.high))).toBeCloseTo(MVR_EXPOSURE / 2, 9);
  });

  it('opens by at most half a stop, so a blackout stays black', () => {
    expect(exposureStops(SHOW_BAND.low - 0.25)).toBeCloseTo(0.25, 9);
    expect(exposureStops(SHOW_BAND.low - 3)).toBe(EXPOSURE_RANGE.up);
    expect(exposureOf(exposureStops(-100))).toBeCloseTo(MVR_EXPOSURE * Math.SQRT2, 9);
    expect(exposureStops(Number.NaN)).toBe(0);
  });

  it('moves with a time constant of one second while the show runs, and settles at once without history', () => {
    expect(adaptStops(undefined, -1, 0.016)).toBe(-1);
    expect(adaptStops(0, -1, 0)).toBe(-1);
    expect(adaptStops(0, -1, ADAPT_SECONDS)).toBeCloseTo(-(1 - Math.exp(-1)), 9);
    expect(adaptStops(0, -1, 0.1)).toBeGreaterThan(-0.1);
  });

  it('reads a still or stepped clock as no running show', () => {
    expect([isRunning(0.016), isRunning(0.05)]).toEqual([true, true]);
    expect([isRunning(0), isRunning(0.5), isRunning(-1), isRunning(Number.NaN)]).toEqual([false, false, false, false]);
  });

  it('decodes the meter image as the shader encodes it', () => {
    expect(meterConstants).toContain(`const float METER_LOW = ${METER.low.toFixed(1)};`);
    expect(meterConstants).toContain(`const vec2 METER_SIZE = vec2(${METER.width}.0, ${METER.height}.0);`);
    for (const stops of [METER.low, -5.25, 0, 3.5, METER.high])
      expect(meteredStops(meterImage(stops))).toBeCloseTo(stops, 3);
    expect(meteredStops(new Uint8Array(0))).toBe(METER.low);
  });

  it('meters the highlights: a lit quarter of a dark frame reads as the lit part, not as the dark house', () => {
    const frame = meterImage(-7);
    const quarter = (METER.width * METER.height) / 4;
    frame.set(meterImage(-1).subarray(0, quarter * 4), 40);
    expect(meteredStops(frame)).toBeCloseTo(-1, 3);
    frame.set(meterImage(-7).subarray(0, quarter * 2), 40);
    expect(meteredStops(frame)).toBeCloseTo(-4, 3);
  });
});
