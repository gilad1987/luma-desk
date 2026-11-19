/**
 * No value of a file may hold the import: a pan of `1e300` once kept a loop that subtracts 360 running for ever,
 * because `1e300 - 360 === 1e300`. GDTF: "FLOAT_VALUE_PHYSICAL is the physical value that the fixture should adopt",
 * so a value past the trusted range stops at its end, and without a range a value beyond 3600 degrees is not used.
 */
import { describe, expect, it } from 'vitest';
import { deskAimOf, fileAngle, readFileAngle } from '../../../src/domain/stage/mvrRestAim.ts';

describe('deskAimOf on any number', () => {
  it('wraps by a computed turn count, the same at both ends of the desk range', () => {
    expect([270, -270, 271, -271, 630, -630, -300].map((pan) => deskAimOf(pan, 0, false).pan)).toEqual([
      270, -270, -89, 89, 270, -270, 60,
    ]);
  });

  it.each([1e300, -1e300, 3.6e9, 1e-300, Infinity])('ends at once on the angle %d', (angle) => {
    const aim = deskAimOf(angle, angle, false);
    expect(Math.abs(aim.pan)).toBeLessThanOrEqual(270);
    expect(Math.abs(aim.tilt)).toBeLessThanOrEqual(135);
  });
});

describe('a file value no head can adopt', () => {
  const range = { from: -270, to: 270 };

  it.each(['1e300', '-1e300', '3.6e9', '3601'])('is not used without a trusted range: %s', (value) => {
    expect(readFileAngle([`Body_Pan,f ${value}`], 'pan', {})).toEqual({ limit: 'rejected' });
  });

  it('stops at the end of the trusted range', () => {
    expect(readFileAngle(['Body_Pan,f 1e300'], 'pan', { range })).toEqual({ angle: 270, limit: 'capped' });
    expect(readFileAngle(['Body_Pan,f -3.6e9'], 'pan', { range })).toEqual({ angle: -270, limit: 'capped' });
    expect(readFileAngle(['Body_Pan/percent,f 1e300'], 'pan', { range })).toEqual({ angle: 270, limit: 'capped' });
    expect(readFileAngle(['Body_Pan,f 270'], 'pan', { range })).toEqual({ angle: 270 });
  });

  it('reads no angle from the text Infinity and keeps a tiny value and the bound itself', () => {
    expect(readFileAngle(['Body_Pan,f Infinity'], 'pan', { range })).toEqual({});
    expect(fileAngle(['Body_Pan,f 1e-300'], 'pan', {})).toBe(1e-300);
    expect(fileAngle(['Body_Pan,f -3600'], 'pan', {})).toBe(-3600);
  });
});
