import { describe, expect, it } from 'vitest';
import { parseMvrInfo } from '../../../../src/domain/stage/parse/parseMvrInfo.ts';
import { Reader } from '../../../../src/domain/stage/parse/readers.ts';

const INFO = { uuid: 'U', layer: 'L', gdtfName: 'G', gdtfMode: 'M', type: 'device' };
const block = (info: object): object => ({ fixtures: { '7': info }, layers: [], hiddenLayers: [], offset: [0, 0, 0] });
const read = (info: object): [unknown, readonly string[]] => {
  const r = new Reader();
  return [parseMvrInfo(r, { mvr: block(info) }, 'mvr', '')?.fixtures['7'], r.errors];
};

describe('parseMvrInfo stand-in marker and pool ids', () => {
  it('reads a fixture entry of an older show, which has none of them, unchanged', () => {
    expect(read({ ...INFO, type: 'spot' })).toEqual([{ ...INFO, type: 'spot' }, []]);
  });

  it('reads the device type, the marker and the three ids', () => {
    const info = { ...INFO, standIn: 'device', customId: 12, customIdType: 7, fixtureTypeId: 4 };
    expect(read(info)).toEqual([info, []]);
    expect(read({ ...INFO, standIn: 'placeholder' })[0]).toEqual({ ...INFO, standIn: 'placeholder' });
  });

  it.each([
    [{ standIn: 'scenery' }, 'mvr.fixtures.7.standIn'],
    [{ customId: 0 }, 'mvr.fixtures.7.customId'],
    [{ customIdType: 1.5 }, 'mvr.fixtures.7.customIdType'],
  ])('reports %o at %s', (extra, path) => {
    const [, errors] = read({ ...INFO, ...extra });
    expect(errors.some((error) => error.startsWith(path))).toBe(true);
  });
});
