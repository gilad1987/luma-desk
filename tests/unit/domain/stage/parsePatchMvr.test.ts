import { describe, expect, it } from 'vitest';
import { parseMvrInfo } from '../../../../src/domain/stage/parse/parseMvrInfo.ts';
import { parsePatch } from '../../../../src/domain/stage/parse/parsePatch.ts';
import { Reader } from '../../../../src/domain/stage/parse/readers.ts';

const INFO = { uuid: 'U', layer: 'L', gdtfName: 'G', gdtfMode: 'M', type: 'spot', focus: [1, 2, 3] };
const MVR = { fixtures: { '7': INFO }, layers: [{ uuid: 'L', name: 'Rig' }], hiddenLayers: ['L'], offset: [0, 1, 0] };

describe('parsePatch', () => {
  it('reads a valid patch', () => {
    const patch = { universe: 63999, address: 512, mode: 'Mode 1' };
    expect(parsePatch(new Reader(), patch, 'patch')).toEqual(patch);
  });

  it.each([
    [{ universe: 0, address: 1, mode: 'x' }, 'patch.universe'],
    [{ universe: 64000, address: 1, mode: 'x' }, 'patch.universe'],
    [{ universe: 1, address: 513, mode: 'x' }, 'patch.address'],
    [{ universe: 1, address: 1.5, mode: 'x' }, 'patch.address'],
    [{ universe: 1, address: 1, mode: 3 }, 'patch.mode'],
  ])('rejects %o at %s', (raw, path) => {
    const r = new Reader();
    expect([parsePatch(r, raw, 'patch'), r.errors[0]?.startsWith(path)]).toEqual([undefined, true]);
  });
});

describe('parseMvrInfo', () => {
  it('reads a stored mvr block deep-equal', () => {
    expect(parseMvrInfo(new Reader(), JSON.parse(JSON.stringify(MVR)), 'mvr')).toEqual(MVR);
  });

  it.each([
    [{ ...MVR, offset: [0, 'a', 0] }, 'mvr.offset[1]'],
    [{ ...MVR, fixtures: { x: INFO } }, 'mvr.fixtures.x'],
    [{ ...MVR, fixtures: { '7': { ...INFO, type: 'laser' } } }, 'mvr.fixtures.7.type'],
    [{ ...MVR, layers: [{ uuid: 1 }] }, 'mvr.layers[0].uuid'],
  ])('rejects %o at %s', (raw, path) => {
    const r = new Reader();
    parseMvrInfo(r, raw, 'mvr');
    expect(r.errors[0]?.startsWith(path), 'the parser fails a design with any recorded error').toBe(true);
  });

  it('skips a __proto__ key without touching the prototype', () => {
    const r = new Reader();
    const raw: unknown = JSON.parse(`{"__proto__":${JSON.stringify(INFO)},"7":${JSON.stringify(INFO)}}`);
    const fixtures = parseMvrInfo(r, { ...MVR, fixtures: raw }, 'mvr')?.fixtures;
    expect(r.errors).toHaveLength(1);
    expect([fixtures && Object.getPrototypeOf(fixtures), fixtures && Object.keys(fixtures)]).toEqual([
      Object.prototype,
      ['7'],
    ]);
  });
});
