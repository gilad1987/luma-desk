import type { Cue } from '../../engine/CueList';
import type { DemoKit } from './demoKit';

/** Cue 5.5 "Ring Tornado", built after the layers so it holds only its own values; it plays between 5 and 6. */
export function tornadoCue({ vals, group, color, aimed, phaser, screen }: DemoKit): Cue {
  const ringBeams = group(24),
    ringWashes = group(25),
    angledBeams = group(26);
  return {
    num: 5.5,
    name: 'Ring Tornado',
    fade: 0.8,
    vals: vals([
      [ringBeams, aimed('ringTwist', { dim: 100, ...color('Magenta'), zoom: 2 })],
      [ringWashes, aimed('ringCone', { dim: 80, ...color('Cyan'), zoom: 18 })],
      [angledBeams, aimed('converge', { dim: 85, ...color('Cyan'), zoom: 2 })],
      [group(31), aimed('ringCone', { dim: 100, ...color('White'), zoom: 2 })],
      [group(32), { dim: 60, ...color('Magenta') }],
      [group(33), { dim: 70, ...color('Magenta') }],
      [[...group(2), ...group(5), ...group(7), ...group(1), ...group(8), ...group(4)], { dim: 0 }],
      [group(3), { dim: 35, ...color('Congo') }],
      [screen, { dim: 45, r: 100, g: 0, b: 100, gobo: 4, grot: 50 }],
    ]),
    fx: [
      phaser('circle', ringBeams, { size: 16, rate: 1, spread: 360 }),
      phaser('dimChase', angledBeams, { rate: 2, spread: 360 }),
    ],
  };
}
