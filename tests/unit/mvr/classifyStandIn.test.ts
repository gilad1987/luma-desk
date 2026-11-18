import { describe, expect, it } from 'vitest';
import type { GdtfChannel, GdtfInfo } from '../../../src/mvr/gdtf/GdtfInfo.ts';
import { attributeToAttr } from '../../../src/mvr/gdtf/attributeMap.ts';
import { classifyFixture } from '../../../src/mvr/import/classifyFixture.ts';

/** A GDTF with no `Beam` geometry: a stand-in, or a real device that is no light. */
const BEAMLESS: GdtfInfo = {
  fileName: 'Acme@Thing.gdtf',
  name: 'Thing',
  manufacturer: 'Acme',
  modes: [],
  references: [],
  hasBeam: false,
  hasDisplay: false,
  sizes: [],
  bodies: [],
};

function channels(...attributes: string[]): GdtfChannel[] {
  return attributes.map((attribute, index) => {
    const attr = attributeToAttr(attribute);
    return { attribute, ...(attr === undefined ? {} : { attr }), dmxBreak: 1, offset: [index + 1] };
  });
}

describe('classifyFixture without a beam', () => {
  it('reads numbered dimmers as dimmers and the file as a placeholder', () => {
    expect(attributeToAttr('Dimmer3')).toBe('dim');
    expect(attributeToAttr('DimmerCurve')).toBeUndefined();
    const generic = { type: 'par', fromName: false, standIn: 'placeholder' };
    expect(classifyFixture(BEAMLESS, channels('Dimmer1', 'Dimmer2'), ['Acme Thing'])).toEqual(generic);
    expect(classifyFixture(BEAMLESS, [], ['Acme Thing'])).toEqual(generic);
  });

  it('lets the name type a placeholder, the fixture name included', () => {
    const named = classifyFixture(BEAMLESS, channels('Dimmer1', 'Dimmer2'), ['Acme@Thing', 'Thing', 'Back Blinder']);
    expect(named).toEqual({ type: 'blinder', fromName: true, standIn: 'placeholder' });
  });

  it('keeps a real device that is no light a fixture, whatever its name says', () => {
    const device = { type: 'device', fromName: false, standIn: 'device', deviceBy: 'gdtf' };
    expect(classifyFixture(BEAMLESS, channels('Fog1', 'Fan1'), ['Acme Strobe'])).toEqual(device);
  });

  it('reads a real one-channel device as a device, not as a placeholder', () => {
    const device = { type: 'device', fromName: false, standIn: 'device', deviceBy: 'gdtf' };
    expect(classifyFixture(BEAMLESS, channels('Fog1'), ['Acme Wash'])).toEqual(device);
    const named = { type: 'device', fromName: true, standIn: 'device', deviceBy: 'name' };
    expect(classifyFixture(BEAMLESS, channels('Dimmer1'), ['Acme@Chain Hoist'])).toEqual(named);
    const real = channels('Dimmer', 'ColorAdd_R');
    expect(classifyFixture({ ...BEAMLESS, hasBeam: true }, real, ['Acme Fan Par']).type).toBe('par');
  });

  it('keeps a light without beam geometry and dimmer a light, by its colour or shutter channels', () => {
    const rgb = channels('ColorAdd_R', 'ColorAdd_G', 'ColorAdd_B');
    expect(classifyFixture(BEAMLESS, rgb, ['Acme Thing'])).toEqual({ type: 'par', fromName: false });
    expect(classifyFixture(BEAMLESS, channels('Color1', 'Iris'), ['Acme Thing']).standIn).toBeUndefined();
  });

  it('trusts a real light GDTF that only lacks the beam geometry', () => {
    const real = channels('Dimmer', 'ColorAdd_R', 'ColorAdd_G', 'ColorAdd_B');
    expect(classifyFixture(BEAMLESS, real, ['Acme Thing'])).toEqual({ type: 'par', fromName: false });
  });
});
