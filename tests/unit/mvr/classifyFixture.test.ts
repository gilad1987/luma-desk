import { describe, expect, it } from 'vitest';
import type { GdtfChannel, GdtfInfo } from '../../../src/mvr/gdtf/GdtfInfo.ts';
import { attributeToAttr } from '../../../src/mvr/gdtf/attributeMap.ts';
import { classifyFixture } from '../../../src/mvr/import/classifyFixture.ts';
import { fallbackType } from '../../../src/mvr/import/fallbackType.ts';

const GENERIC_WASH: GdtfInfo = {
  fileName: 'Custom@Acme Thing.gdtf',
  name: 'Acme Thing',
  manufacturer: 'Custom',
  modes: [],
  references: [],
  hasBeam: true,
  beamType: 'Wash',
  beamAngle: 25,
};

/** Channels by their GDTF attribute names, mapped to desk attributes as the importer maps them. */
function channels(...attributes: string[]): GdtfChannel[] {
  return attributes.map((attribute, index) => {
    const attr = attributeToAttr(attribute);
    return { attribute, ...(attr === undefined ? {} : { attr }), dmxBreak: 1, offset: [index + 1] };
  });
}

const GENERIC_MOVER = channels('Dimmer', 'Pan', 'Tilt', 'Zoom', 'NoFeature');
const REAL_SPOT = channels('Dimmer', 'Pan', 'Tilt', 'ColorAdd_R', 'Gobo1', 'Zoom');

describe('classifyFixture', () => {
  it('takes the name over a generic moving GDTF: a profile is a spot', () => {
    expect(classifyFixture(GENERIC_WASH, GENERIC_MOVER, ['Custom@Acme Profile 600'])).toEqual({
      type: 'spot',
      fromName: true,
    });
  });

  it('keeps the channel type of a generic GDTF when no name word is known', () => {
    expect(classifyFixture(GENERIC_WASH, GENERIC_MOVER, ['Custom@Acme AirFX', 'Thing 1'])).toEqual({
      type: 'wash',
      fromName: false,
    });
  });

  it('gives strobe and blinder from the name of a dimmer-only GDTF', () => {
    const dimmer = channels('Dimmer');
    expect(classifyFixture(GENERIC_WASH, dimmer, ['Acme Thunder Strobe']).type).toBe('strobe');
    expect(classifyFixture(GENERIC_WASH, channels('Dimmer', 'Pan'), ['', 'Acme Blinder 4']).type).toBe('blinder');
  });

  it('gives a static body from the name of a generic pan and tilt GDTF', () => {
    expect(classifyFixture(GENERIC_WASH, GENERIC_MOVER, ['Custom@Acme Strobe Panel'])).toEqual({
      type: 'strobe',
      fromName: true,
    });
  });

  it('never gives a moving head body to a fixture without pan and tilt', () => {
    expect(classifyFixture(GENERIC_WASH, channels('Dimmer', 'Zoom'), ['Acme Profile 600']).type).toBe('par');
    expect(classifyFixture(GENERIC_WASH, channels('Dimmer', 'ColorAdd_R'), ['Acme Wash']).type).toBe('par');
  });

  it('keeps a real GDTF spot a spot, even when its name says wash', () => {
    const spot = { ...GENERIC_WASH, beamType: 'Spot', beamAngle: 18 };
    expect(classifyFixture(spot, REAL_SPOT, ['Acme Wash 1000'])).toEqual({ type: 'spot', fromName: false });
  });

  it('lets the name refine the body of a real static GDTF', () => {
    const real = channels('Dimmer', 'ColorAdd_R', 'ColorAdd_G', 'ColorAdd_B');
    expect(classifyFixture(GENERIC_WASH, real, ['Acme Pixel Batten'])).toEqual({ type: 'bar', fromName: true });
    expect(classifyFixture(GENERIC_WASH, real, ['Acme Par 7'])).toEqual({ type: 'par', fromName: false });
  });

  it('gives beam for a narrow moving head and object for a non-light', () => {
    const narrow = { ...GENERIC_WASH, beamType: 'Spot', beamAngle: 4 };
    expect(classifyFixture(narrow, REAL_SPOT, ['Acme Thing']).type).toBe('beam');
    const speaker = { ...GENERIC_WASH, hasBeam: false };
    expect(classifyFixture(speaker, channels('Pan'), ['Acme Strobe']).type).toBe('object');
  });
});

describe('fallbackType without a GDTF', () => {
  it('gives a bar to battens and a moving type to hybrids', () => {
    expect(fallbackType('Acme@Pixel Batten')).toBe('bar');
    expect(fallbackType('Acme@Mover Hybrid')).toBe('spot');
  });
});
