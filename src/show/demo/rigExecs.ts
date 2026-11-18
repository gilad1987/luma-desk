import type { Cue } from '../../engine/CueList';
import type { SavedExec } from '../ShowFile';
import type { DemoKit } from './demoKit';

/** Executors 8-10 of the demo: the screen sparkle, then cue lists for the halo ring and the angled beams. */
export function rigExecs(kit: DemoKit): Partial<SavedExec>[] {
  return [sparkleExec(kit), { name: 'Ring FX', cues: ringFxCues(kit) }, wingsExec(kit)];
}

function sparkleExec({ vals, screen }: DemoKit): Partial<SavedExec> {
  return {
    name: 'Screen Sparkle',
    cues: [
      {
        num: 1,
        name: 'Sparkle',
        fade: 1,
        vals: vals([[screen, { dim: 100, r: 100, g: 100, b: 100, gobo: 7, grot: 40 }]]),
        fx: [],
      },
    ],
  };
}

/** The five ring looks, one per ring position, each with its own phaser. */
function ringFxCues({ vals, group, color, aimed, phaser }: DemoKit): Cue[] {
  return [
    {
      num: 1,
      name: 'Pillars',
      fade: 1,
      vals: vals([[group(24), aimed('ringDown', { dim: 100, ...color('White'), zoom: 2 })]]),
      fx: [phaser('dimChase', group(24), { rate: 1, spread: 360 })],
    },
    {
      num: 2,
      name: 'Cone',
      fade: 1,
      vals: vals([[group(24), aimed('ringCone', { dim: 100, ...color('Cyan'), zoom: 2 })]]),
      fx: [phaser('dimSine', group(24), { rate: 1, spread: 720 })],
    },
    {
      num: 3,
      name: 'Tornado',
      fade: 1,
      vals: vals([[group(24), aimed('ringTwist', { dim: 100, ...color('Magenta'), zoom: 2 })]]),
      fx: [phaser('circle', group(24), { size: 16, rate: 1, spread: 360 })],
    },
    {
      num: 4,
      name: 'Sunburst',
      fade: 1,
      vals: vals([[group(24), aimed('ringSun', { dim: 100, ...color('Amber'), zoom: 2 })]]),
      fx: [phaser('tilt', group(24), { size: 18, rate: 1, spread: 360 })],
    },
    {
      num: 5,
      name: 'Crown',
      fade: 1,
      vals: vals([[group(24), aimed('ringCrown', { dim: 100, ...color('Lt Blue'), zoom: 2 })]]),
      fx: [phaser('pan', group(24), { size: 20, rate: 0.5, spread: 360 })],
    },
  ];
}

function wingsExec({ vals, group, color, aimed, phaser }: DemoKit): Partial<SavedExec> {
  return {
    name: 'Wings',
    cues: [
      {
        num: 1,
        name: 'Wing Fan',
        fade: 1,
        vals: vals([[group(26), aimed('wingFan', { dim: 100, ...color('White'), zoom: 2 })]]),
        fx: [phaser('dimSaw', group(26), { rate: 1, spread: 360 })],
      },
      {
        num: 2,
        name: 'Converge',
        fade: 1,
        vals: vals([[group(26), aimed('converge', { dim: 100, ...color('Red'), zoom: 2 })]]),
        fx: [phaser('circle', group(26), { size: 8, rate: 1, spread: 360 })],
      },
    ],
  };
}
