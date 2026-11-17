import { describe, expect, it } from 'vitest';
import { buildRig } from '../../../src/domain/rig';
import { asRecorded, RECORDED_RIG as expected } from './recordedRig';

const rig = buildRig();

describe('buildRig', () => {
  it('builds 405 fixtures', () => {
    expect(rig.fixtures).toHaveLength(405);
    expect(expected.count).toBe(405);
  });

  it('keeps the original build order, not id order', () => {
    expect(rig.fixtures.map((f) => f.id)).toEqual(expected.fixtures.map((f) => f.id));
    expect(rig.fixtures.slice(0, 3).map((f) => f.id)).toEqual([101, 102, 103]);
    expect(rig.fixtures[20]?.id).toBe(801);
  });

  it('gives every fixture the original type, mount, position and rigged pan/tilt', () => {
    const actual = rig.fixtures.map((f) => ({
      id: f.id,
      type: f.type,
      mount: f.mount,
      pos: f.pos.toArray(),
      fixed: f.fixed,
    }));
    expect(actual).toEqual(
      expected.fixtures.map(({ id, type, mount, pos, fixed }) => ({ id, type, mount, pos, fixed })),
    );
  });

  it('places every pixel strip as the original did', () => {
    const actual = rig.fixtures.flatMap((f) =>
      f.pix ? [{ id: f.id, p: f.pix.p.toArray(), tan: f.pix.tan.toArray(), len: f.pix.len }] : [],
    );
    const strips = expected.fixtures.flatMap((f) => ('pix' in f ? [{ id: f.id, ...f.pix }] : []));
    expect(asRecorded(actual)).toEqual(strips);
    expect(actual).toHaveLength(24 + 12 + 10 + 36);
  });

  it('gives each fixture of a row its own rigged pan/tilt object', () => {
    const blinders = rig.fixtures.filter((f) => f.type === 'blinder');
    expect(new Set(blinders.map((f) => f.fixed)).size).toBe(blinders.length);
  });

  it('starts every fixture with empty output and links its type record', () => {
    for (const f of rig.fixtures) {
      expect(f.out).toEqual({});
      expect(f.base).toEqual({});
      expect(f.T.attrs.length).toBeGreaterThan(0);
    }
  });

  it('leaves fixtures extensible, because the legacy script still adds render and UI fields', () => {
    expect(rig.fixtures.every((f) => Object.isExtensible(f))).toBe(true);
  });
});
