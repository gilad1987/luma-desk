import type { Cue } from '../../engine/CueList';
import type { DemoKit } from './demoKit';
import type { RingGroups } from './ringLayers';

/** Cues 7-9 of the ring layers: the breakdown, the drop and the outro. */
export function addRingEndLayers(cues: Cue[], { color, aimed, phaser, layer }: DemoKit, ring: RingGroups): void {
  const { ringBeams, ringWashes, angledBeams, angledSpots } = ring;
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
