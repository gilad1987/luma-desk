import { BoxGeometry, CylinderGeometry, MeshStandardMaterial, type Group } from 'three';
import type { Vec3Tuple } from '../../core';
import { addMesh } from '../shared';
import type { BandMaterials } from './bandMaterials';
import type { InstrumentBuilder } from './performerSpec';

type StageInstrument = 'mic' | 'vox' | 'keys' | 'flute' | 'clarinet' | 'trumpet' | 'trombone' | 'timpani';

/** A mic on a round-base stand in front of the singer. */
function micStand(body: Group, m: BandMaterials): void {
  addMesh(body, new CylinderGeometry(0.012, 0.012, 1.45, 6), m.kit, { position: [0, 0.72, 0.42] });
  addMesh(body, new CylinderGeometry(0.3, 0.3, 0.02, 12), m.kit, { position: [0, 0.01, 0.42] });
  addMesh(body, new CylinderGeometry(0.025, 0.018, 0.14, 8), m.black, {
    position: [0, 1.47, 0.36],
    rotation: [0.5, 0, 0],
  });
}

/** The vocals, keyboard, winds, brass and timpani. */
export const STAGE_INSTRUMENTS: Readonly<Record<StageInstrument, InstrumentBuilder>> = {
  mic: micStand,
  vox: micStand,
  keys: (body, m) => {
    addMesh(body, new BoxGeometry(1.35, 0.09, 0.38), m.black, { position: [0, 1.0, 0.45] });
    addMesh(body, new BoxGeometry(1.2, 0.015, 0.14), new MeshStandardMaterial({ color: 0xe8e8e8 }), {
      position: [0, 1.05, 0.38],
    });
    for (const sx of [-0.45, 0.45])
      addMesh(body, new BoxGeometry(0.04, 1, 0.04), m.kit, {
        position: [sx, 0.5, 0.45],
        rotation: [0, 0, sx > 0 ? 0.4 : -0.4],
      });
  },
  flute: (body, m, hip) => {
    addMesh(body, new CylinderGeometry(0.012, 0.012, 0.62, 6), m.silver, {
      position: [0.25, hip + 0.8, 0.16],
      rotation: [0, 0, Math.PI / 2 - 0.1],
    });
  },
  clarinet: (body, m, hip) => {
    addMesh(body, new CylinderGeometry(0.025, 0.015, 0.62, 8), m.black, {
      position: [0, hip + 0.52, 0.28],
      rotation: [-0.55, 0, 0],
    });
  },
  trumpet: (body, m, hip) => {
    addMesh(body, new CylinderGeometry(0.06, 0.018, 0.45, 10), m.gold, {
      position: [0, hip + 0.76, 0.32],
      rotation: [Math.PI / 2 - 0.25, 0, 0],
    });
  },
  trombone: (body, m, hip) => {
    const raised: Vec3Tuple = [Math.PI / 2 - 0.2, 0, 0];
    addMesh(body, new CylinderGeometry(0.08, 0.02, 0.5, 10), m.gold, {
      position: [0.06, hip + 0.74, 0.35],
      rotation: raised,
    });
    addMesh(body, new CylinderGeometry(0.012, 0.012, 0.9, 5), m.gold, {
      position: [0.06, hip + 0.62, 0.62],
      rotation: raised,
    });
  },
  timpani: (body, m) => {
    for (const [tx, r] of [
      [-0.5, 0.36],
      [0.5, 0.32],
    ] as const) {
      addMesh(body, new CylinderGeometry(r, r * 0.6, 0.6, 20), m.copper, { position: [tx, 0.55, 0.55] });
      addMesh(body, new CylinderGeometry(r, r, 0.01, 20), new MeshStandardMaterial({ color: 0xd8d0c0 }), {
        position: [tx, 0.86, 0.55],
      });
    }
  },
};
