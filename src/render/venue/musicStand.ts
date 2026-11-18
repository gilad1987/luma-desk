import { BoxGeometry, CylinderGeometry, type Group } from 'three';
import { addMesh } from '../shared';
import type { BandMaterials } from './bandMaterials';

/** Adds a music stand with a sheet desk and a reading lamp in front of the player (closer for a seated one). */
export function addMusicStand(body: Group, m: BandMaterials, seated: boolean): void {
  const sz = seated ? 0.7 : 0.75;
  addMesh(body, new CylinderGeometry(0.01, 0.01, 1.05, 5), m.kit, { position: [0, 0.52, sz] });
  addMesh(body, new BoxGeometry(0.46, 0.32, 0.015), m.black, {
    position: [0, 1.12, sz - 0.03],
    rotation: [-0.5, 0, 0],
  });
  addMesh(body, new BoxGeometry(0.08, 0.025, 0.05), m.lamp, { position: [0, 1.3, sz - 0.1] });
}
