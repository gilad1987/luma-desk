/**
 * The stored `optics` of a fixture's MVR facts: a show saved before the field existed parses unchanged, a stored
 * optics block comes back deep-equal, and a bad value is reported with its path.
 */
import { describe, expect, it } from 'vitest';
import type { FixtureOptics } from '../../../../src/domain/stage/optics/FixtureOptics.ts';
import { parseMvrInfo } from '../../../../src/domain/stage/parse/parseMvrInfo.ts';
import { Reader } from '../../../../src/domain/stage/parse/readers.ts';

const INFO = { uuid: 'U', layer: 'L', gdtfName: 'G', gdtfMode: 'M', type: 'spot', bodySize: 0.5 };
const fn = (attribute: string, offset: number[]): FixtureOptics['dimmer'] & object => ({
  attribute,
  drives: [{ dmxBreak: 1, offset }],
  dmxFrom: 0,
  dmxTo: 256 ** offset.length - 1,
});
const wheel = {
  ...fn('Gobo1', [9]),
  name: 'Gobos',
  rotating: true,
  slots: [{ name: 'Open' }, { name: 'Star', image: 'star.png' }],
};
const OPTICS: FixtureOptics = {
  dimmer: fn('Dimmer', [1]),
  pan: { ...fn('Pan', [2, 3]), from: 270, to: -270, home: 0 },
  tilt: { ...fn('Tilt', [4]), from: -135, to: 135 },
  zoom: { ...fn('Zoom', [5]), from: 48, to: 8 },
  zoomModes: [{ ...fn('Zoom', [5]), from: 42, to: 3, label: 'Spot', when: { ...fn('Gobo2', [9]), dmxFrom: 1 } }],
  beam: { beamType: 'Spot', beamAngle: 45, fieldAngle: 47, beamRadius: 0.05 },
  output: { luminousFlux: 12000, colorTemperature: 6700, cri: 90, lampType: 'LED', beamCount: 1, pixelControl: false },
  color: {
    emitters: [{ ...fn('ColorAdd_R', [6]), name: 'Red', xyY: [0.64, 0.33, 21.26], rgb: [1, 0, 0] }],
    filters: [{ ...fn('ColorSub_C', [7]) }],
    wheels: [
      { ...fn('Color1', [8]), name: 'Colors', slots: [{ name: 'Fire', rgb: [1, 0, 0], dmxFrom: 10, dmxTo: 19 }] },
    ],
    correction: [{ ...fn('CTO', [10]), from: 6700, to: 2700 }],
  },
  gobos: [wheel],
  shaping: {
    prisms: [{ ...fn('Prism1', [11]), name: 'Prisms', slots: [{ name: 'Three', facets: 3 }] }],
    iris: fn('Iris', [12]),
    frost: [fn('Frost1', [13])],
    blades: [fn('Blade1A', [14])],
    shutter: fn('Shutter1', [15]),
    strobe: { ...fn('Shutter1Strobe', [15]), from: 1, to: 25 },
  },
};

/** Parses a stored `mvr` block whose one fixture has the given info; gives the parsed info and the errors. */
function parse(info: object): { readonly info: unknown; readonly errors: readonly string[] } {
  const stored = { fixtures: { '7': info }, layers: [], hiddenLayers: [], offset: [0, 0, 0] };
  const r = new Reader();
  const parsed = parseMvrInfo(r, { mvr: JSON.parse(JSON.stringify(stored)) }, 'mvr', '');
  return { info: parsed?.fixtures['7'], errors: r.errors };
}

describe('parseMvrInfo with optics', () => {
  it('parses a show saved before the optics field unchanged', () => {
    expect(parse(INFO)).toEqual({ info: INFO, errors: [] });
  });

  it('reads stored optics deep-equal', () => {
    expect(parse({ ...INFO, optics: OPTICS })).toEqual({ info: { ...INFO, optics: OPTICS }, errors: [] });
    expect(parse({ ...INFO, optics: {} })).toEqual({ info: { ...INFO, optics: {} }, errors: [] });
  });

  it.each([
    [{ pan: fn('Pan', [1]) }, 'mvr.fixtures.7.optics.pan'],
    [{ dimmer: fn('Dimmer', [0]) }, 'mvr.fixtures.7.optics.dimmer.drives[0].offset[0]'],
    [{ gobos: [{ ...wheel, slots: [{ image: 'star.png' }] }] }, 'mvr.fixtures.7.optics.gobos[0].slots[0].name'],
    [
      { color: { emitters: [{ ...fn('ColorAdd_R', [1]), rgb: [1, 0] }] } },
      'mvr.fixtures.7.optics.color.emitters[0].rgb',
    ],
    [{ output: { beamCount: 0, pixelControl: false } }, 'mvr.fixtures.7.optics.output.beamCount'],
    [{ beam: { beamAngle: -5 } }, 'mvr.fixtures.7.optics.beam.beamAngle'],
    ['optics', 'mvr.fixtures.7.optics'],
  ])('reports the bad optics %o at %s', (optics, path) => {
    const { errors } = parse({ ...INFO, optics });
    expect(errors[0]?.startsWith(`${path}:`)).toBe(true);
  });
});
