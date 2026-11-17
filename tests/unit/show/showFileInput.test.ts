import { describe, expect, it } from 'vitest';
import { defaultGroups, NEW_GROUPS } from '../../../src/engine/defaultGroups';
import { showWorld } from './showWorld';

const groupNames = (world: ReturnType<typeof showWorld>): string[] =>
  Object.values(world.groups.all).map((g) => g.name);

/** Loads `data` into a world that holds the demo, so every replaced or kept field is visible. */
function loadIntoDemo(data: unknown): ReturnType<typeof showWorld> {
  const world = showWorld();
  world.demo.load();
  world.serializer.load(data);
  return world;
}

// The original loader read fields straight off the parsed JSON; these cases give the result it gave.
describe('ShowSerializer.load on corrupt or partial JSON', () => {
  it('throws on JSON null before anything changes', () => {
    const world = showWorld();
    world.demo.load();
    const before = world.json();
    expect(() => world.serializer.load(null)).toThrow(TypeError);
    expect(world.json()).toBe(before);
  });

  it.each([
    ['a number', 5],
    ['a string', 'show'],
    ['an array', []],
    ['an empty object', {}],
  ])('reads %s as an empty show: default groups, bpm 120, haze 0.62, executors emptied', (_case, data) => {
    const world = loadIntoDemo(data);
    expect(world.groups.all).toStrictEqual(defaultGroups(world.rig));
    expect([world.tempo.bpm, world.state.haze]).toEqual([120, 0.62]);
    expect(world.execs.every((e) => e.name === '' && !e.cues.length && e.level === 0)).toBe(true);
  });

  it('fills an empty pool with only the newer default groups when groups is a truthy non-object', () => {
    expect(groupNames(loadIntoDemo({ groups: 7 }))).toEqual([...NEW_GROUPS]);
  });

  it('ignores presets that are not objects, and preset slots that are not objects', () => {
    expect(() => loadIntoDemo({ presets: 3 })).not.toThrow();
    expect(() => loadIntoDemo({ presets: { 9: null } })).not.toThrow();
  });

  it('empties every executor when execs is not an array, and one whose entry is not an object', () => {
    const world = loadIntoDemo({ execs: 'abc' });
    expect(world.execs.map((e) => e.name).filter(Boolean)).toEqual([]);
    const mixed = loadIntoDemo({ execs: [null, 4, { name: 'Kept', cues: [], level: 0.5 }] });
    expect(mixed.execs.slice(0, 3).map((e) => [e.name, e.level])).toEqual([
      ['', 0],
      ['', 0],
      ['Kept', 0.5],
    ]);
  });

  // Narrowing: the original stored a wrong-typed value as it was (a text bpm made the beat grid NaN); now it counts
  // as missing and the default applies.
  it('reads wrong-typed scalars as missing, so the defaults apply', () => {
    const world = loadIntoDemo({ bpm: 'fast', haze: '0.3', execs: [{ name: 3, cues: {}, level: '1' }] });
    expect([world.tempo.bpm, world.state.haze]).toEqual([120, 0.62]);
    expect([world.execs[0]?.name, world.execs[0]?.cues, world.execs[0]?.level]).toEqual(['', [], 0]);
  });
});
