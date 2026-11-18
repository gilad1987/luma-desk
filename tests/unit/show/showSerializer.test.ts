import { describe, expect, it } from 'vitest';
import { NEW_GROUPS } from '../../../src/engine/defaultGroups';
import { readGolden, readSavedShow, showWorld, type SavedShow } from '../../shared';

const DEMO_GROUPS = (readGolden('demo-show') as SavedShow).groups;

// the same expectations as tests/e2e/old-show.spec.ts, on the loader alone
describe.each([
  { file: 'old-show-v1.json', addedGroups: [] as string[] },
  { file: 'old-show-38efd21.json', addedGroups: [...NEW_GROUPS] },
])('loading a show saved by an older app: $file', ({ file, addedGroups }) => {
  const raw = readSavedShow(file);
  const old = JSON.parse(raw) as SavedShow;

  it('serialises back to the saved show, plus only the newer default groups in empty slots', () => {
    const world = showWorld();
    world.serializer.load(JSON.parse(raw));
    const now = JSON.parse(world.json()) as SavedShow;
    const newSlots = Object.keys(now.groups).filter((slot) => !(slot in old.groups));
    expect(newSlots.map((slot) => now.groups[slot]?.name)).toEqual(addedGroups);
    const added = Object.fromEntries(newSlots.map((slot) => [slot, DEMO_GROUPS[slot]]));
    expect(now).toStrictEqual({ ...old, groups: { ...old.groups, ...added } });
    if (!addedGroups.length) expect(world.json()).toBe(raw.trimEnd());
  });
});

describe('ShowSerializer', () => {
  it('round trip: load(serialize()) gives the same file', () => {
    const world = showWorld();
    world.demo.load();
    const first = world.json();
    world.serializer.load(JSON.parse(first));
    expect(world.json()).toBe(first);
  });

  it('keeps the loader defaults: bpm 0 -> 120, haze 0 stays, missing haze -> 0.62, missing execs emptied', () => {
    const world = showWorld();
    world.demo.load();
    world.serializer.load({ bpm: 0, haze: 0, execs: [{ name: 'Only' }] });
    expect([world.tempo.bpm, world.state.haze]).toEqual([120, 0]);
    expect(world.execs.map((e) => [e.name, e.cues.length, e.level, e.on])[1]).toEqual(['', 0, 0, false]);
    expect(world.execs[0]?.name).toBe('Only');
    world.serializer.load({});
    expect(world.state.haze).toBe(0.62);
  });

  it('never saves computed presets and restores them from the defaults; saved presets override', () => {
    const world = showWorld();
    world.serializer.load({ presets: { 4: { 1: { name: 'Mine', kind: 'global', vals: { r: 1 } } } } });
    const file = world.serializer.serialize();
    expect(Object.keys(file.presets)).toEqual(['1', '2', '3', '4', '5']);
    expect(Object.values(file.presets).flatMap((pool) => Object.values(pool).map((p) => p.kind))).not.toContain('fn');
    expect(world.presets.all[2][1]?.kind).toBe('fn');
    expect(world.presets.all[4][1]?.name).toBe('Mine');
  });

  it('throws on a preset pool the desk lacks, after the groups were replaced (callers catch it)', () => {
    const world = showWorld();
    const groups = { 1: { name: 'Solo', ids: [101] } };
    expect(() =>
      world.serializer.load({ groups, presets: { 9: { 1: { name: 'x', kind: 'fn', fn: 'zMin' } } } }),
    ).toThrow();
    expect(world.groups.all[1]?.name).toBe('Solo');
  });

  it('clears the programmer and the selection on load', () => {
    const world = showWorld();
    world.selection.set([101]);
    world.programmer.set(101, 'dim', 50);
    world.serializer.load({});
    expect([world.selection.ids, world.programmer.hasContent()]).toEqual([[], false]);
  });
});
