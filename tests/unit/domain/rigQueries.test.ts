import { describe, expect, it } from 'vitest';
import { FEAT_ATTRS, ATTR } from '../../../src/domain/attributes.ts';
import { TYPES } from '../../../src/domain/fixtureTypes/index.ts';
import { buildRig } from '../../../src/domain/rig/index.ts';

const rig = buildRig();

describe('Rig queries', () => {
  it('range keeps only ids that exist, in build order', () => {
    expect(rig.range(1201, 1299)).toHaveLength(24);
    expect(rig.range(1201, 1299)[0]).toBe(1201);
    expect(rig.range(1813, 1818)).toEqual([1813, 1814, 1815, 1816, 1817, 1818]);
    expect(rig.range(100, 999).slice(19, 22)).toEqual([120, 801, 802]);
    expect(rig.range(3000, 3999)).toEqual([]);
  });

  it('idsOfType lists one type in build order', () => {
    expect(rig.idsOfType('spot').slice(19, 22)).toEqual([120, 401, 402]);
    expect(rig.idsOfType('follow')).toEqual([1901, 1902, 1903, 1904]);
    expect(rig.idsOfType('screen')).toEqual([2001]);
  });

  it('lightIds is every fixture but the screen and a new array each call', () => {
    const ids = rig.lightIds();
    expect(ids).toHaveLength(404);
    expect(ids).not.toContain(2001);
    expect(ids).toEqual(rig.fixtures.filter((f) => f.type !== 'screen').map((f) => f.id));
    expect(rig.lightIds()).not.toBe(ids);
  });

  it('get finds a fixture by id and returns undefined for an unknown id', () => {
    expect(rig.get(2201)?.type).toBe('profile');
    expect(rig.get(9999)).toBeUndefined();
  });
});

describe('Fixture.has', () => {
  it('follows the type attribute list', () => {
    expect(rig.get(2101)?.has('tilt')).toBe(true);
    expect(rig.get(2101)?.has('pan')).toBe(false);
    expect(rig.get(2001)?.has('gobo')).toBe(true);
  });
});

describe('type and attribute tables', () => {
  it('keep the original type order and shared mover channel list', () => {
    expect(Object.keys(TYPES)).toEqual([
      'spot',
      'beam',
      'wash',
      'par',
      'blinder',
      'strobe',
      'bar',
      'follow',
      'profile',
      'screen',
      'device',
    ]);
    expect(TYPES.spot.attrs).toBe(TYPES.follow.attrs);
  });

  it('list every attribute under its own feature', () => {
    for (const [feature, attrs] of Object.entries(FEAT_ATTRS))
      for (const a of attrs) expect(ATTR[a].feat).toBe(feature);
  });
});
