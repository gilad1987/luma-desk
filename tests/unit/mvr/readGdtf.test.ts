// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readGdtf } from '../../../src/mvr/gdtf/readGdtf.ts';
import { gdtfMode, makeGdtf, makeZip } from '../../shared/index.ts';

const BODY = '<Geometry Name="Body"><Beam Name="Beam" BeamType="Spot" BeamAngle="14.5"/></Geometry>';

function expectBadGdtf(bytes: Uint8Array): void {
  const { info, warnings } = readGdtf(bytes, 'Acme@Stub.gdtf');
  expect(info).toBeUndefined();
  expect(warnings).toEqual([expect.objectContaining({ code: 'bad-gdtf', ref: 'Acme@Stub.gdtf' })]);
}

describe('readGdtf', () => {
  it('reads name, manufacturer, modes and the beam', () => {
    const modes = gdtfMode('Std', [['Dimmer', 'Offset="1" Geometry="Body"']]) + gdtfMode('Ext', []);
    const { info, warnings } = readGdtf(makeGdtf({ geometries: BODY, modes }), 'a.gdtf');
    expect(warnings).toEqual([]);
    expect(info).toMatchObject({ fileName: 'a.gdtf', name: 'Test Spot', manufacturer: 'Acme' });
    expect(info?.modes.map((mode) => mode.name)).toEqual(['Std', 'Ext']);
    expect(info?.modes[0]?.channels).toEqual([
      { attribute: 'Dimmer', attr: 'dim', geometry: 'Body', dmxBreak: 1, offset: [1] },
    ]);
    expect(info).toMatchObject({ hasBeam: true, beamType: 'Spot', beamAngle: 14.5 });
  });

  it('finds a beam that only a GeometryReference template holds', () => {
    const geometries =
      '<Geometry Name="Bar"><GeometryReference Name="P1" Geometry="Pixel"><Break DMXOffset="1"/></GeometryReference>' +
      '</Geometry><Geometry Name="Pixel"><Beam Name="B" BeamType="Wash" BeamAngle="20"/></Geometry>';
    const { info } = readGdtf(makeGdtf({ geometries }), 'bar.gdtf');
    expect(info).toMatchObject({ hasBeam: true, beamType: 'Wash', beamAngle: 20 });
    expect(info?.references).toEqual([{ root: 'Bar', geometry: 'Pixel', breaks: [{ dmxBreak: 1, dmxOffset: 1 }] }]);
  });

  it('applies the GDTF beam defaults and reports no beam without a Beam geometry', () => {
    const plain = readGdtf(
      makeGdtf({ geometries: '<Geometry Name="Body"><Beam Name="B" BeamAngle=""/></Geometry>' }),
      'p',
    );
    expect(plain.info).toMatchObject({ hasBeam: true, beamType: 'Wash', beamAngle: 25 });
    const speaker = readGdtf(makeGdtf({ geometries: '<Geometry Name="Box"/>' }), 's');
    expect(speaker.info?.hasBeam).toBe(false);
    expect(speaker.info).not.toHaveProperty('beamType');
  });
});

describe('readGdtf references and stubs', () => {
  it('reads a dotted Universe.Address break offset', () => {
    const geometries =
      '<Geometry Name="Bar"><GeometryReference Geometry="Pixel"><Break DMXBreak="2" DMXOffset="2.5"/>' +
      '</GeometryReference></Geometry>';
    const { info } = readGdtf(makeGdtf({ geometries }), 'bar.gdtf');
    expect(info?.references[0]?.breaks).toEqual([{ dmxBreak: 2, dmxOffset: 517 }]);
  });

  it('warns bad-gdtf for an empty stub file', () => {
    expectBadGdtf(new Uint8Array(0));
  });

  it('warns bad-gdtf for bytes that are not a ZIP', () => {
    expectBadGdtf(new TextEncoder().encode('not a zip'));
  });

  it('warns bad-gdtf for a ZIP without description.xml', () => {
    expectBadGdtf(makeZip({ 'thumbnail.png': new Uint8Array([1, 2]) }));
  });

  it('warns bad-gdtf for broken XML', () => {
    expectBadGdtf(makeZip({ 'description.xml': '<GDTF><FixtureType Name="x"></GDTF>' }));
  });

  it('warns bad-gdtf when the XML has no FixtureType', () => {
    expectBadGdtf(makeZip({ 'description.xml': '<GDTF DataVersion="1.2"/>' }));
  });
});
