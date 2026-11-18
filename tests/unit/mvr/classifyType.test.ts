import { describe, expect, it } from 'vitest';
import type { AttrName } from '../../../src/domain/attributes.ts';
import { classifyType } from '../../../src/mvr/gdtf/classifyType.ts';
import type { GdtfChannel, GdtfInfo } from '../../../src/mvr/gdtf/GdtfInfo.ts';

const SHAPE = { hasBeam: false, hasDisplay: false, sizes: [], bodies: [] };
const BASE: GdtfInfo = { fileName: 'f.gdtf', name: 'F', manufacturer: 'M', modes: [], references: [], ...SHAPE };

function beam(beamType: string, beamAngle: number): GdtfInfo {
  return { ...BASE, hasBeam: true, beamType, beamAngle };
}

function channels(...attrs: AttrName[]): GdtfChannel[] {
  return attrs.map((attr, index) => ({ attribute: attr, attr, dmxBreak: 1, offset: [index + 1] }));
}

describe('classifyType', () => {
  it('gives par for a missing GDTF', () => {
    expect(classifyType(undefined, [])).toBe('par');
  });

  it('gives object without beam and dimmer (a speaker)', () => {
    expect(classifyType(BASE, channels('pan', 'tilt'))).toBe('object');
  });

  it('keeps a dimmer-only GDTF without beam a light', () => {
    expect(classifyType(BASE, channels('dim'))).toBe('par');
  });

  it('gives spot for a moving head with a Spot beam', () => {
    expect(classifyType(beam('Spot', 15), channels('dim', 'pan', 'tilt'))).toBe('spot');
  });

  it.each(['Wash', 'PC', 'Fresnel'])('gives wash for a moving head with a %s beam', (beamType) => {
    expect(classifyType(beam(beamType, 20), channels('pan', 'tilt'))).toBe('wash');
  });

  it('gives beam for a narrow Spot, as the angle rule runs before the type rule', () => {
    expect(classifyType(beam('Spot', 2), channels('pan', 'tilt'))).toBe('beam');
    expect(classifyType(beam('Spot', 6), channels('pan', 'tilt'))).toBe('beam');
    expect(classifyType(beam('Spot', 6.5), channels('pan', 'tilt'))).toBe('spot');
  });

  it('gives spot for a moving head with another beam type', () => {
    expect(classifyType(beam('Rectangle', 30), channels('pan', 'tilt'))).toBe('spot');
  });

  it('gives bar for tilt without pan (COLORado)', () => {
    expect(classifyType(beam('Wash', 20), channels('tilt', 'r', 'g', 'b'))).toBe('bar');
  });

  it('gives par without pan and tilt, and for pan alone', () => {
    expect(classifyType(beam('Wash', 2), channels('dim', 'r', 'g', 'b'))).toBe('par');
    expect(classifyType(beam('Wash', 20), channels('pan'))).toBe('par');
  });
});
