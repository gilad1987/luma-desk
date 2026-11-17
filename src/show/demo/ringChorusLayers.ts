import type { Cue } from '../../engine/CueList';
import type { DemoKit } from './demoKit';
import type { RingGroups } from './ringLayers';

/** Cues 5-6 of the ring layers: the full chorus and the rainbow bridge. */
export function addRingChorusLayers(cues: Cue[], { color, aimed, phaser, layer }: DemoKit, ring: RingGroups): void {
  const { ringBeams, ringWashes, angledBeams, angledSpots } = ring;
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
}
