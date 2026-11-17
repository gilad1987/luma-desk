import type { SavedExec } from '../ShowFile';
import type { DemoKit } from './demoKit';

/** Executors 2-7 of the demo: one-cue looks to busk over the song (blinders, strobes, chases, key light). */
export function buskingExecs({ vals, group, color, aimed, phaser, rig }: DemoKit): Partial<SavedExec>[] {
  return [
    { name: 'Blinders', cues: [{ num: 1, name: 'Hit', fade: 0, vals: vals([[group(10), { dim: 100 }]]), fx: [] }] },
    {
      name: 'Strobes',
      cues: [{ num: 1, name: 'Strobe', fade: 0, vals: vals([[group(11), { dim: 100, strobe: 92 }]]), fx: [] }],
    },
    {
      name: 'Floor Chase',
      cues: [
        {
          num: 1,
          name: 'Chase',
          fade: 0.5,
          vals: vals([[group(7), aimed('skyFan', { ...color('White'), zoom: 2 })]]),
          fx: [phaser('dimChase', group(7), { rate: 2, spread: 360 })],
        },
      ],
    },
    {
      name: 'Swipe T2',
      cues: [
        {
          num: 1,
          name: 'Swipe',
          fade: 0.5,
          vals: vals([[group(2), aimed('fanAud', { ...color('Cyan'), zoom: 2 })]]),
          fx: [phaser('dimSaw', group(2), { rate: 1, spread: 360 })],
        },
      ],
    },
    {
      name: 'Red Alert',
      cues: [
        {
          num: 1,
          name: 'Red',
          fade: 1,
          vals: vals([[[...group(15), ...group(9)], { dim: 100, ...color('Red') }]]),
          fx: [],
        },
      ],
    },
    {
      name: 'Key Light',
      cues: [
        {
          num: 1,
          name: 'Singer',
          fade: 2,
          vals: vals([
            [rig.range(108, 113), aimed('singer', { dim: 100, ...color('White'), gobo: 0, zoom: 8, grot: 0 })],
          ]),
          fx: [],
        },
      ],
    },
  ];
}
