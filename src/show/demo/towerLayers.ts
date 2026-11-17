import type { Cue } from '../../engine/CueList';
import type { DemoKit } from './demoKit';
import { addTowerPeakLayers } from './towerPeakLayers';

/** The delay-tower groups the tower layers address. */
export interface TowerGroups {
  readonly towerBeams: number[];
  readonly towerWashes: number[];
}

/** Adds the delay towers and the audience wash (groups 31-33) to cues 1-9 of the demo song. */
export function addTowerLayers(cues: Cue[], kit: DemoKit): void {
  const towers = { towerBeams: kit.group(31), towerWashes: kit.group(32) };
  addTowerOpeningLayers(cues, kit, towers);
  addTowerPeakLayers(cues, kit, towers);
  addAudienceWashLayers(cues, kit);
}

/** Cues 1-4 of the tower layers. */
function addTowerOpeningLayers(cues: Cue[], { color, aimed, phaser, layer }: DemoKit, towers: TowerGroups): void {
  const { towerBeams, towerWashes } = towers;
  layer(cues, 1, [
    [towerBeams, aimed('straight', { dim: 0, zoom: 2 })],
    [towerWashes, aimed('band', { dim: 30, ...color('Congo'), zoom: 30 })],
  ]);
  layer(
    cues,
    2,
    [
      [towerBeams, aimed('skyFan', { dim: 70, ...color('Lt Blue'), zoom: 2 })],
      [towerWashes, { dim: 20 }],
    ],
    [phaser('pan', towerBeams, { size: 15, rate: 0.25, spread: 360 })],
  );
  layer(cues, 3, [
    [towerBeams, { dim: 0 }],
    [towerWashes, aimed('band', { dim: 60, ...color('Amber'), zoom: 24 })],
  ]);
  layer(
    cues,
    4,
    [
      [towerBeams, aimed('ringCone', { dim: 90, ...color('Cyan'), zoom: 2 })],
      [towerWashes, { dim: 50, ...color('Blue') }],
    ],
    [phaser('dimChase', towerBeams, { rate: 2, spread: 360 })],
  );
}

/** The audience wash (group 33) through the whole song. */
function addAudienceWashLayers(cues: Cue[], { group, color, aimed, phaser, layer }: DemoKit): void {
  const audienceWash = group(33);
  layer(cues, 1, [[audienceWash, aimed('crowd', { dim: 40, ...color('CTO'), zoom: 50 })]]);
  layer(cues, 2, [[audienceWash, { dim: 22, ...color('Blue') }]]);
  layer(cues, 3, [[audienceWash, { dim: 30, ...color('Amber') }]]);
  layer(
    cues,
    4,
    [[audienceWash, { dim: 55, ...color('Cyan') }]],
    [phaser('dimSine', audienceWash, { size: 70, rate: 0.5, spread: 360 })],
  );
  layer(cues, 5, [[audienceWash, { dim: 100, ...color('White'), zoom: 50 }]]);
  layer(cues, 6, [[audienceWash, { dim: 85 }]], [phaser('rainbow', audienceWash, { rate: 0.5, spread: 360 })]);
  layer(cues, 7, [[audienceWash, { dim: 12, ...color('Blue') }]]);
  layer(cues, 8, [[audienceWash, { dim: 100, ...color('White'), strobe: 55 }]]);
  layer(cues, 9, [[audienceWash, { dim: 45, ...color('CTO'), strobe: 0 }]]);
}
