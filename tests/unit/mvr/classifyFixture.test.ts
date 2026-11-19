import { describe, expect, it } from 'vitest';
import type { GdtfChannel, GdtfInfo } from '../../../src/mvr/gdtf/GdtfInfo.ts';
import { attributeToAttr } from '../../../src/mvr/gdtf/attributeMap.ts';
import { classifyFixture } from '../../../src/mvr/import/classifyFixture.ts';

const WASH_BEAM = { hasBeam: true, beamType: 'Wash', beamAngle: 25, hasDisplay: false, sizes: [], bodies: [] };
const GENERIC_WASH: GdtfInfo = {
  fileName: 'Custom@Acme Thing.gdtf',
  name: 'Acme Thing',
  manufacturer: 'Custom',
  modes: [],
  references: [],
  ...WASH_BEAM,
};

/** Channels by their GDTF attribute names, mapped to desk attributes as the importer maps them. */
function channels(...attributes: string[]): GdtfChannel[] {
  return attributes.map((attribute, index) => {
    const attr = attributeToAttr(attribute);
    return { attribute, ...(attr === undefined ? {} : { attr }), dmxBreak: 1, offset: [index + 1] };
  });
}

/** The type of a fixture with the generic wash GDTF, `list` channels and one name. */
const typeOf = (list: readonly GdtfChannel[], name: string): string => classifyFixture(GENERIC_WASH, list, [name]).type;

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

  it('never gives a moving head body to a real GDTF without pan and tilt', () => {
    const real = channels('Dimmer', 'ColorAdd_R');
    expect(['Acme Wash', 'Acme Beam', 'Acme Spot', 'Acme Hybrid'].map((name) => typeOf(real, name))).toEqual(
      Array(4).fill('par'),
    );
  });

  it('gives a dimmer-only stub the moving type its name says, as the stub cannot prove it is static', () => {
    const stub = channels('Dimmer', 'Zoom');
    const names = ['Acme Beam 7', 'Acme Hybrid', 'Acme Spot', 'Acme Wash 19'];
    expect(names.map((name) => typeOf(stub, name))).toEqual(['beam', 'spot', 'spot', 'wash']);
    expect(classifyFixture(GENERIC_WASH, stub, ['Acme Wash'])).toEqual({ type: 'wash', fromName: true });
  });

  it('gives a profile without pan and tilt the static profile body, and a profile with them the spot body', () => {
    expect(typeOf(channels('Dimmer'), 'Acme Profile 26')).toBe('profile');
    expect(typeOf(channels('Dimmer', 'ColorAdd_R', 'Gobo1'), 'Acme Profile 26')).toBe('profile');
    expect(typeOf(GENERIC_MOVER, 'Acme Profile')).toBe('spot');
  });

  it('keeps a real moving head with a single-pixel name ("MagicDot") a moving head, not a bar', () => {
    expect(classifyFixture(GENERIC_WASH, REAL_SPOT, ['Acme@MagicDot-R'])).toEqual({ type: 'wash', fromName: false });
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

  it('gives beam for a narrow moving head and keeps a beamless stand-in with a Dimmer a fixture (R2-12)', () => {
    const narrow = { ...GENERIC_WASH, beamType: 'Spot', beamAngle: 4 };
    expect(classifyFixture(narrow, REAL_SPOT, ['Acme Thing']).type).toBe('beam');
    const beamless = { ...GENERIC_WASH, hasBeam: false };
    const stub = { type: 'strobe', fromName: true, standIn: 'placeholder' };
    expect(classifyFixture(beamless, channels('Dimmer'), ['Acme Strobe'])).toEqual(stub);
  });
});
