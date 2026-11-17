import { rng } from '../../../../src/core';
import type { Fixture } from '../../../../src/domain/Fixture';
import type { Action } from './actions';
import { pick, randomCues, randomPhaser, randomValues } from './cueData';

/** One frame: the frame time, the executor clock (a second time source) and the actions taken before the frame. */
export interface Step {
  readonly t: number;
  readonly clock: number;
  readonly actions: readonly Action[];
}

const EXECS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function randomAction(rnd: () => number, fixtures: readonly Fixture[], t: number): Action {
  const exec = pick(rnd, EXECS);
  const slice = fixtures.slice(Math.floor(rnd() * 380)).slice(0, 25);
  switch (
    pick(rnd, [
      'go',
      'go',
      'go',
      'goto',
      'pause',
      'off',
      'flash',
      'level',
      'level',
      'edit',
      'prog',
      'master',
      'tempo',
      'mod',
    ] as const)
  ) {
    case 'go':
      return { kind: 'go', exec, dir: rnd() < 0.8 ? 1 : -1 };
    case 'goto':
      return { kind: 'goto', exec, index: Math.floor(rnd() * 8) - 1, fade: pick(rnd, [undefined, 0, 0.7]) };
    case 'pause':
      return { kind: 'pause', exec };
    case 'off':
      return { kind: 'off', exec };
    case 'flash':
      return { kind: rnd() < 0.5 ? 'flashPress' : 'flashRelease', exec };
    case 'level':
      return { kind: 'level', exec, level: pick(rnd, [0, 0, 0.25, 0.6, 1]) };
    case 'edit':
      return { kind: 'editCue', exec, index: Math.floor(rnd() * 4), cue: randomCues(rnd, fixtures)[0] ?? edit(t) };
    case 'prog':
      return rnd() < 0.3
        ? { kind: 'programmer', vals: {}, fxList: [] }
        : { kind: 'programmer', vals: randomValues(rnd, slice), fxList: rnd() < 0.6 ? [randomPhaser(rnd, slice)] : [] };
    case 'master': {
      const selected = fixtures.filter(() => rnd() < 0.2).map((f) => f.id);
      return {
        kind: 'master',
        gm: pick(rnd, [1, 1, 0.7, 0.33]),
        blackout: rnd() < 0.15,
        highlight: rnd() < 0.3,
        selected,
      };
    }
    case 'tempo':
      return { kind: 'tempo', bpm: pick(rnd, [120, 128, 93, 174]), beatOrigin: t - rnd() * 3 };
    case 'mod':
      return { kind: 'modulation', pump: pick(rnd, [1, 0.4, 1.3]), hitUntil: rnd() < 0.5 ? t + 0.5 : 0 };
  }
}

function edit(t: number): never {
  throw new Error(`randomCues returned no cue at t=${t}`);
}

/** The actions of one later frame: a random action in a quarter of the frames, none in the rest. */
function randomActions(rnd: () => number, fixtures: readonly Fixture[], t: number): Action[] {
  return rnd() < 0.25 ? [randomAction(rnd, fixtures, t)] : [];
}

/** A reproducible run: every executor loaded and raised, then `frames` frames of random operator actions. */
export function randomScenario(seed: number, fixtures: readonly Fixture[], frames: number): Step[] {
  const rnd = rng(seed);
  const setup: Action[] = EXECS.flatMap((exec): Action[] => [
    { kind: 'load', exec, cues: randomCues(rnd, fixtures) },
    { kind: 'level', exec, level: pick(rnd, [0, 0.5, 1]) },
  ]);
  const steps: Step[] = [];
  let t = 3 + rnd() * 10;
  for (let i = 0; i < frames; i++) {
    const actions = i === 0 ? setup : randomActions(rnd, fixtures, t);
    steps.push({ t, clock: t + (rnd() - 0.5) * 0.05, actions });
    t += pick(rnd, [0.008, 0.016, 0.017, 0.05, 0.3]);
  }
  return steps;
}
