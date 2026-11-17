import { ATTR } from '../../../../src/domain/attributes';
import type { Fixture } from '../../../../src/domain/Fixture';
import type { Cue, FixtureValues } from '../../../../src/engine/CueList';
import { PHASER_TYPES, type PhaserInstance, type PhaserType } from '../../../../src/engine/shared';

/** Picks one element; `rnd` is a seeded stream so a failing scenario reproduces from its seed. */
export function pick<T>(rnd: () => number, list: readonly T[]): T {
  const i = Math.floor(rnd() * list.length);
  if (i >= list.length) throw new Error('pick from an empty list');
  return list[i] as T;
}

const PHASERS = Object.keys(PHASER_TYPES) as PhaserType[];

/** Random values, rounded to 2 dp like the programmer, for a few attributes each fixture type has. */
export function randomValues(rnd: () => number, fixtures: readonly Fixture[]): FixtureValues {
  const vals: FixtureValues = {};
  for (const f of fixtures) {
    const v: FixtureValues[string] = {};
    for (const a of f.T.attrs) if (rnd() < 0.6) v[a] = +(ATTR[a].min + rnd() * (ATTR[a].max - ATTR[a].min)).toFixed(2);
    if (Object.keys(v).length > 0) vals[f.id] = v;
  }
  return vals;
}

/** A phaser instance of any type over `fixtures` (the original does not filter cue phasers by capability). */
export function randomPhaser(rnd: () => number, fixtures: readonly Fixture[]): PhaserInstance {
  const type = pick(rnd, PHASERS);
  const ids = fixtures.filter(() => rnd() < 0.7).map((f) => f.id);
  return {
    type,
    rate: pick(rnd, [0.25, 0.5, 1, 2, 3]),
    size: Math.round(rnd() * 100),
    spread: pick(rnd, [0, 180, 360, 720]),
    ids,
  };
}

/** A tracking cue list over a slice of the rig: fractional numbers, missing fades and cue-local phasers included. */
export function randomCues(rnd: () => number, rig: readonly Fixture[]): Cue[] {
  const start = Math.floor(rnd() * (rig.length - 60));
  const pool = rig.slice(start, start + 20 + Math.floor(rnd() * 40));
  const count = 2 + Math.floor(rnd() * 5);
  const cues: Cue[] = [];
  for (let i = 0; i < count; i++) {
    const part = pool.filter(() => rnd() < 0.5);
    const fx = rnd() < 0.5 ? [randomPhaser(rnd, part)] : [];
    const cue: Cue = {
      num: i + 1 + (rnd() < 0.2 ? 0.5 : 0),
      name: `C${i}`,
      fade: pick(rnd, [0, 0.4, 1.5, 2, 3]),
      vals: randomValues(rnd, part),
      fx,
    };
    if (rnd() < 0.2) Reflect.deleteProperty(cue, 'fade');
    if (rnd() < 0.1) Reflect.deleteProperty(cue, 'fx');
    cues.push(cue);
  }
  return cues;
}
