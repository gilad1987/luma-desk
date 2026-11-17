import type { Cue } from '../../engine/CueList';
import type { DemoKit } from './demoKit';

/** Adds the halo ring and the angled trusses (groups 24-27) to cues 1-9 of the demo song. */
export function addRingLayers(cues: Cue[], { group, color, aimed, phaser, layer }: DemoKit): void {
  const ringBeams = group(24),
    ringWashes = group(25),
    angledBeams = group(26),
    angledSpots = group(27);
  layer(
    cues,
    1,
    [
      [ringBeams, aimed('ringDown', { dim: 22, ...color('Congo'), zoom: 2 })],
      [ringWashes, aimed('ringCone', { dim: 25, ...color('Blue'), zoom: 30 })],
      [[...angledBeams, ...angledSpots], { dim: 0 }],
    ],
    [phaser('dimSine', ringBeams, { size: 60, rate: 0.25, spread: 360 })],
  );
  layer(
    cues,
    2,
    [
      [ringBeams, aimed('ringDown', { dim: 90, ...color('White'), zoom: 2 })],
      [ringWashes, { dim: 40, ...color('Congo') }],
      [angledBeams, aimed('ringCrown', { dim: 45, ...color('Lt Blue'), zoom: 2 })],
    ],
    [phaser('circle', ringBeams, { size: 6, rate: 0.5, spread: 360 })],
  );
  layer(cues, 3, [
    [ringBeams, { dim: 0 }],
    [ringWashes, aimed('band', { dim: 65, ...color('Amber'), zoom: 26 })],
    [angledSpots, aimed('cross', { dim: 70, ...color('Lavender'), gobo: 3, zoom: 15, grot: 14 })],
    [angledBeams, { dim: 0 }],
  ]);
  layer(
    cues,
    4,
    [
      [ringBeams, aimed('ringCone', { dim: 95, ...color('Cyan'), zoom: 2 })],
      [angledBeams, aimed('wingFan', { dim: 70, ...color('White'), zoom: 2 })],
      [angledSpots, { dim: 0 }],
    ],
    [phaser('dimChase', ringBeams, { rate: 1, spread: 360 })],
  );
  layer(
    cues,
    5,
    [
      [ringBeams, aimed('ringSun', { dim: 100, ...color('White'), zoom: 2 })],
      [ringWashes, aimed('center', { dim: 90, ...color('Red'), zoom: 30 })],
      [angledBeams, aimed('converge', { dim: 100, ...color('Red'), zoom: 2 })],
      [angledSpots, aimed('audience', { dim: 80, ...color('White'), gobo: 7, zoom: 12, grot: 40 })],
    ],
    [
      phaser('tilt', ringBeams, { size: 14, rate: 1, spread: 360 }),
      phaser('circle', angledBeams, { size: 10, rate: 1, spread: 360 }),
    ],
  );
  layer(
    cues,
    6,
    [
      [ringBeams, aimed('ringTwist', { dim: 100, zoom: 2 })],
      [angledBeams, aimed('ringCrown', { dim: 90, zoom: 2 })],
      [ringWashes, { dim: 70 }],
      [angledSpots, { dim: 0 }],
    ],
    [
      phaser('rainbow', ringBeams, { rate: 0.5, spread: 360 }),
      phaser('circle', ringBeams, { size: 8, rate: 0.5, spread: 360 }),
      phaser('rainbow', [...angledBeams, ...ringWashes], { rate: 0.25, spread: 720 }),
    ],
  );
  layer(
    cues,
    7,
    [
      [ringBeams, aimed('ringCrown', { dim: 70, ...color('Lt Blue'), zoom: 2 })],
      [ringWashes, { dim: 20, ...color('Blue') }],
      [angledBeams, { dim: 0 }],
    ],
    [phaser('dimSine', ringBeams, { size: 80, rate: 0.5, spread: 720 })],
  );
  layer(
    cues,
    8,
    [
      [ringBeams, aimed('ringSun', { dim: 100, ...color('White'), zoom: 2 })],
      [angledBeams, aimed('wingFan', { dim: 100, ...color('White'), zoom: 2 })],
      [angledSpots, aimed('audience', { dim: 100, ...color('White'), gobo: 3, zoom: 14, grot: 60 })],
      [ringWashes, { dim: 100, ...color('White'), strobe: 60 }],
    ],
    [phaser('flash', ringBeams, { rate: 1 }), phaser('bally', angledBeams, { size: 36, rate: 2 })],
  );
  layer(cues, 9, [
    [[...ringBeams, ...angledBeams, ...angledSpots], { dim: 0 }],
    [ringWashes, aimed('singer', { dim: 50, ...color('CTO'), zoom: 18, strobe: 0 })],
  ]);
}
