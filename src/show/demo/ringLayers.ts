import type { Cue } from '../../engine/CueList';
import type { DemoKit } from './demoKit';
import { addRingChorusLayers } from './ringChorusLayers';
import { addRingEndLayers } from './ringEndLayers';

/** The halo ring and angled-truss groups the ring layers address; phasers share these id lists with the groups. */
export interface RingGroups {
  readonly ringBeams: number[];
  readonly ringWashes: number[];
  readonly angledBeams: number[];
  readonly angledSpots: number[];
}

/** Adds the halo ring and the angled trusses (groups 24-27) to cues 1-9 of the demo song. */
export function addRingLayers(cues: Cue[], kit: DemoKit): void {
  const { group } = kit;
  const ring = { ringBeams: group(24), ringWashes: group(25), angledBeams: group(26), angledSpots: group(27) };
  addRingOpeningLayers(cues, kit, ring);
  addRingChorusLayers(cues, kit, ring);
  addRingEndLayers(cues, kit, ring);
}

/** Cues 1-4: the ring glows low, flares for the intro and chases on the pre-chorus. */
function addRingOpeningLayers(cues: Cue[], { color, aimed, phaser, layer }: DemoKit, ring: RingGroups): void {
  const { ringBeams, ringWashes, angledBeams, angledSpots } = ring;
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
}
