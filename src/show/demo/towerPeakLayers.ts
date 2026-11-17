import type { Cue } from '../../engine/CueList';
import type { DemoKit } from './demoKit';
import type { TowerGroups } from './towerLayers';

/** Cues 5-9 of the tower layers: chorus to outro. */
export function addTowerPeakLayers(cues: Cue[], { color, aimed, phaser, layer }: DemoKit, towers: TowerGroups): void {
  const { towerBeams, towerWashes } = towers;
  layer(
    cues,
    5,
    [
      [towerBeams, aimed('audience', { dim: 100, ...color('White'), zoom: 2 })],
      [towerWashes, aimed('audience', { dim: 90, ...color('Red'), zoom: 40 })],
    ],
    [phaser('bally', towerBeams, { size: 25, rate: 1, spread: 180 })],
  );
  layer(
    cues,
    6,
    [
      [towerBeams, aimed('skyFan', { dim: 100, zoom: 2 })],
      [towerWashes, { dim: 70 }],
    ],
    [
      phaser('rainbow', [...towerBeams, ...towerWashes], { rate: 0.5, spread: 360 }),
      phaser('circle', towerBeams, { size: 14, rate: 0.5, spread: 360 }),
    ],
  );
  layer(cues, 7, [
    [towerBeams, { dim: 0 }],
    [towerWashes, { dim: 25, ...color('Blue') }],
  ]);
  layer(
    cues,
    8,
    [
      [towerBeams, aimed('vOut', { dim: 100, ...color('White'), zoom: 2 })],
      [towerWashes, { dim: 100, ...color('White'), strobe: 70 }],
    ],
    [phaser('flash', towerBeams, { rate: 1 })],
  );
  layer(cues, 9, [[[...towerBeams, ...towerWashes], { dim: 0, strobe: 0 }]]);
}
