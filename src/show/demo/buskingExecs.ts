import type { SavedExec } from '../ShowFile';
import type { DemoKit } from './demoKit';

/** Executors 2-7 of the demo: one-cue looks to busk over the song (blinders, strobes, chases, key light). */
export function buskingExecs(kit: DemoKit): Partial<SavedExec>[] {
  return [...effectExecs(kit), ...colourExecs(kit)];
}

/** Executors 2-5: blinder hit, strobes, the floor chase and the truss-2 swipe. */
function effectExecs({ vals, group, color, aimed, phaser }: DemoKit): Partial<SavedExec>[] {
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
  ];
}

/** Executors 6-7: the red alert wash and the singer's key light. */
function colourExecs({ vals, group, color, aimed }: DemoKit): Partial<SavedExec>[] {
  return [
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
            [middleIds(group(1), 6), aimed('singer', { dim: 100, ...color('White'), gobo: 0, zoom: 8, grot: 0 })],
          ]),
          fx: [],
        },
      ],
    },
  ];
}

/** The middle `count` ids of a group: the singer's key light is the centre of the FOH spots (108-113 of 101-120). */
function middleIds(ids: readonly number[], count: number): number[] {
  const first = Math.max(0, Math.floor((ids.length - count) / 2));
  return ids.slice(first, first + count);
}
