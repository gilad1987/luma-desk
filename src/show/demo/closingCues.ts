import type { Cue } from '../../engine/CueList';
import type { DemoKit } from './demoKit';

/** Cues 6-9 of the demo song, Rainbow Bridge to Outro. */
export function closingCues(kit: DemoKit): Cue[] {
  return [...bridgeCues(kit), ...dropCues(kit)];
}

/** Cues 6-7: the rainbow bridge and the blue breakdown. */
function bridgeCues({ vals, group, color, aimed, phaser, screen }: DemoKit): Cue[] {
  return [
    {
      num: 6,
      name: 'Rainbow Bridge',
      fade: 1,
      vals: vals([
        [screen, { dim: 80, r: 100, g: 100, b: 100, gobo: 3, grot: 40 }],
        [group(1), { dim: 0 }],
      ]),
      fx: [
        phaser('rainbow', [...group(2), ...group(5)], { rate: 0.5, spread: 360 }),
        phaser('rainbow', [...group(7)], { rate: 0.5, spread: 720 }),
        phaser('rainbow', [...group(3), ...group(6)], { rate: 0.25, spread: 360 }),
        phaser('circle', group(7), { size: 18, rate: 0.5, spread: 720 }),
      ],
    },
    {
      num: 7,
      name: 'Breakdown',
      fade: 3,
      vals: vals([
        [[...group(2), ...group(5), ...group(1), ...group(4), ...group(8)], { dim: 0 }],
        [group(3), aimed('center', { dim: 35, ...color('Blue') })],
        [group(6), { dim: 25, ...color('Blue') }],
        [group(9), { dim: 45, ...color('Blue') }],
        [group(7), aimed('skyFan', { dim: 60, ...color('Lt Blue') })],
        [screen, { dim: 20, r: 0, g: 20, b: 100, gobo: 4, grot: 0 }],
      ]),
      fx: [phaser('dimChase', group(7), { rate: 1, spread: 360 })],
    },
  ];
}

/** Cues 8-9: the strobing drop and the warm outro. */
function dropCues({ vals, group, color, aimed, phaser, screen }: DemoKit): Cue[] {
  return [
    {
      num: 8,
      name: 'DROP!',
      fade: 0,
      vals: vals([
        [group(11), { dim: 100, strobe: 88 }],
        [group(10), { dim: 55 }],
        [[...group(2), ...group(5), ...group(7)], { dim: 100, ...color('White'), zoom: 2 }],
        [group(2), 'fanAud'],
        [group(5), 'audience'],
        [group(7), 'skyFan'],
        [group(3), { dim: 100, ...color('White'), zoom: 50, strobe: 45 }],
        [group(6), { dim: 100, ...color('White') }],
        [screen, { dim: 100, r: 100, g: 100, b: 100, gobo: 7, grot: 80 }],
      ]),
      fx: [phaser('bally', [...group(2), ...group(5)], { size: 40, rate: 2 }), phaser('flash', group(7), { rate: 1 })],
    },
    {
      num: 9,
      name: 'Outro',
      fade: 5,
      vals: vals([
        [
          [...group(11), ...group(10), ...group(2), ...group(5), ...group(7), ...group(6), ...group(9)],
          { dim: 0, strobe: 0 },
        ],
        [group(3), aimed('center', { dim: 45, ...color('CTO'), strobe: 0 })],
        [group(1), aimed('singer', { dim: 75, ...color('Warm'), gobo: 0, zoom: 9, grot: 0 })],
        [screen, { dim: 30, r: 100, g: 50, b: 10, gobo: 1, grot: 0 }],
      ]),
      fx: [],
    },
  ];
}
