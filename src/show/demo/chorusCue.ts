import type { Cue } from '../../engine/CueList';
import type { DemoKit } from './demoKit';

/** Cue 5 of the demo song: the full-white chorus with red washes and three mover phasers. */
export function chorusCue({ vals, group, color, aimed, phaser, screen }: DemoKit): Cue {
  return {
    num: 5,
    name: 'Chorus',
    fade: 0.3,
    vals: vals([
      [group(2), { dim: 100, ...color('White') }],
      [group(5), aimed('fanAud', { dim: 100, ...color('White'), zoom: 2 })],
      [group(7), { dim: 100, ...color('White') }],
      [group(3), { dim: 95, ...color('Red'), zoom: 22 }],
      [group(6), { dim: 90, ...color('Red') }],
      [group(9), { dim: 100, ...color('Red') }],
      [group(1), aimed('audience', { dim: 85, ...color('White'), gobo: 3, zoom: 14, grot: 35 })],
      [group(8), aimed('vOut', { dim: 80, ...color('Red'), zoom: 18 })],
      [screen, { dim: 90, r: 100, g: 0, b: 0, gobo: 2, grot: 60 }],
    ]),
    fx: [
      phaser('bally', group(2), { size: 30, rate: 1 }),
      phaser('circle', group(5), { size: 16, rate: 1, spread: 360 }),
      phaser('tilt', group(7), { size: 22, rate: 2, spread: 360 }),
    ],
  };
}
