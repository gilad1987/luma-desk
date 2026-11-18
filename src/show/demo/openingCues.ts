import type { Cue } from '../../engine/CueList';
import { chorusCue } from './chorusCue';
import type { DemoKit } from './demoKit';

/** Cues 1-5 of the demo song, Walk-In to Chorus, on the main stage groups and the screen. */
export function openingCues(kit: DemoKit): Cue[] {
  return [...introCues(kit), ...verseCues(kit), chorusCue(kit)];
}

/** Cues 1-2: the dark walk-in on the movers, then the singer and the sky fan. */
function introCues({ vals, group, color, aimed, phaser, screen, rig }: DemoKit): Cue[] {
  const movers = rig.fixtures.filter((f) => f.T.moving).map((f) => f.id);
  return [
    {
      num: 1,
      name: 'Walk-In',
      fade: 3,
      vals: vals([
        [rig.lightIds(), { dim: 0, gobo: 0, grot: 0, strobe: 0 }],
        [movers, aimed('center', color('Blue'))],
        [group(3), { dim: 32, zoom: 40 }],
        [group(6), { dim: 22, ...color('Congo') }],
        [group(9), { dim: 70, ...color('Congo') }],
        [group(7), { pan: 0, tilt: 0, zoom: 2 }],
        [group(2), 'straight'],
        [group(5), 'straight'],
        [screen, { dim: 40, r: 10, g: 20, b: 100, gobo: 1, grot: 0 }],
      ]),
      fx: [],
    },
    {
      num: 2,
      name: 'Intro',
      fade: 4,
      vals: vals([
        [group(1), aimed('singer', { dim: 70, ...color('Warm'), gobo: 2, zoom: 12, grot: 6 })],
        [group(5), aimed('skyFan', { dim: 85, ...color('White'), zoom: 2 })],
        [group(3), { dim: 38, ...color('Congo') }],
        [screen, { dim: 55, r: 45, g: 0, b: 100, gobo: 3, grot: 10 }],
      ]),
      fx: [phaser('tilt', group(5), { size: 10, rate: 0.5 })],
    },
  ];
}

/** Cues 3-4: the amber verse and the cyan pre-chorus. */
function verseCues({ vals, group, color, aimed, phaser, screen }: DemoKit): Cue[] {
  return [
    {
      num: 3,
      name: 'Verse',
      fade: 2.5,
      vals: vals([
        [group(3), { dim: 70, ...color('Amber'), zoom: 30 }],
        [group(6), aimed('band', { dim: 60, ...color('Magenta') })],
        [group(9), { dim: 85, ...color('Magenta') }],
        [group(4), aimed('cross', { dim: 65, ...color('Lavender'), gobo: 1, zoom: 18, grot: -10 })],
        [group(7), aimed('straight', { dim: 45, ...color('Orange'), gobo: 0 })],
        [group(5), { dim: 0 }],
        [group(1), { dim: 60, ...color('Warm') }],
        [screen, { dim: 50, r: 100, g: 45, b: 0, gobo: 6, grot: 5 }],
      ]),
      fx: [phaser('dimSine', group(7), { size: 70, rate: 0.5, spread: 720 })],
    },
    {
      num: 4,
      name: 'Pre-Chorus',
      fade: 1.5,
      vals: vals([
        [group(7), aimed('skyFan', { dim: 80, ...color('Cyan'), zoom: 2 })],
        [group(2), aimed('fanAud', { dim: 75, ...color('White'), zoom: 2 })],
        [group(3), { dim: 55, ...color('Cyan') }],
        [group(9), { ...color('Blue') }],
        [group(4), { dim: 0 }],
        [screen, { dim: 70, r: 0, g: 80, b: 100, gobo: 2, grot: 30 }],
      ]),
      fx: [phaser('tilt', group(2), { size: 18, rate: 1, spread: 360 })],
    },
  ];
}
