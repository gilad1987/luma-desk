// @vitest-environment jsdom
/**
 * GDTF reading against quirky files: a `DMXOffset` that is not an address, namespace-prefixed geometry tags, a mode
 * name with a trailing space (official Basic_Festival sample) and `GDTFSpec` texts that match several files.
 */
import { describe, expect, it } from 'vitest';
import { findGdtfMatch } from '../../../src/mvr/gdtf/findGdtf.ts';
import { modeChannels } from '../../../src/mvr/gdtf/modeChannels.ts';
import { readGdtf } from '../../../src/mvr/gdtf/readGdtf.ts';
import { gdtfMode, makeGdtf } from '../../shared/index.ts';

const reference = (offset: string): string =>
  `<Geometry Name="Bar"><GeometryReference Name="P1" Geometry="Pixel"><Break DMXOffset="${offset}"/>` +
  '</GeometryReference></Geometry><Geometry Name="Pixel"/>';

describe('readGdtf edges', () => {
  it('drops a Break whose DMXOffset is not an address, with one bad-gdtf warning', () => {
    const { info, warnings } = readGdtf(makeGdtf({ geometries: reference('abc') }), 'bar.gdtf');
    expect(info?.references).toEqual([{ root: 'Bar', geometry: 'Pixel', breaks: [] }]);
    expect(warnings.map((w) => [w.code, w.ref])).toEqual([['bad-gdtf', 'bar.gdtf']]);
  });

  it('reads a universe.address DMXOffset with the shared decoder', () => {
    const { info, warnings } = readGdtf(makeGdtf({ geometries: reference('2.5') }), 'bar.gdtf');
    expect([info?.references[0]?.breaks, warnings]).toEqual([[{ dmxBreak: 1, dmxOffset: 517 }], []]);
  });

  it('finds namespace-prefixed GeometryReference and Beam tags by local name', () => {
    const geometries =
      '<g:Geometry xmlns:g="urn:x" Name="Bar"><g:GeometryReference Name="P1" Geometry="Pixel"/>' +
      '<g:Beam BeamType="Spot" BeamAngle="9"/></g:Geometry>';
    const { info } = readGdtf(makeGdtf({ geometries }), 'ns.gdtf');
    expect(info?.references.map((r) => r.geometry)).toEqual(['Pixel']);
    expect(info).toMatchObject({ hasBeam: true, beamType: 'Spot', beamAngle: 9 });
  });

  it('matches a mode name with a trailing space and keeps the GDTF name as written', () => {
    const { info } = readGdtf(makeGdtf({ geometries: '', modes: gdtfMode('Full Access Extended Mode ', []) }), 'f');
    if (!info) throw new Error('test GDTF did not parse');
    const result = modeChannels(info, 'Full Access Extended Mode', 'fx-327');
    expect([result.mode, result.warnings]).toEqual(['Full Access Extended Mode ', []]);
  });
});

describe('findGdtfMatch', () => {
  it('matches a Manufacturer@Model spec to the file Model.gdtf', () => {
    expect(findGdtfMatch(['Spot.gdtf'], 'Acme@Spot')).toEqual({ file: 'Spot.gdtf', ties: [] });
  });

  it('chooses the first name in code-unit order on a tie and returns the others', () => {
    const names = ['Zeta@Spot.gdtf', 'Acme@Spot.gdtf'];
    expect(findGdtfMatch(names, 'Spot')).toEqual({ file: 'Acme@Spot.gdtf', ties: ['Zeta@Spot.gdtf'] });
  });
});
