import { BoxGeometry, CylinderGeometry, Group, type Material } from 'three';
import { addMesh } from '../shared';
import type { BandMaterials } from './bandMaterials';
import type { InstrumentBuilder } from './performerSpec';

type StringInstrument = 'guitar' | 'bass' | 'violin' | 'viola' | 'cello' | 'dbass';

/** A guitar or bass slung across the body; `length` scales the body and neck. */
function slungGuitar(body: Group, m: BandMaterials, hip: number, length: number, finish: Material): void {
  const L = length;
  const guitar = new Group();
  guitar.position.set(0, hip + 0.22, 0.2);
  guitar.rotation.z = -0.95;
  addMesh(guitar, new BoxGeometry(0.36 * L, 0.42 * L, 0.08), finish, { position: [0, 0, 0] });
  addMesh(guitar, new BoxGeometry(0.05, 0.6 * L, 0.03), m.darkWood, { position: [0, 0.5 * L, 0] });
  body.add(guitar);
}

/** A violin or viola under the chin with its bow; `k` scales the body. */
function chinInstrument(body: Group, m: BandMaterials, hip: number, k: number): void {
  addMesh(body, new BoxGeometry(0.17 * k, 0.38 * k, 0.06), m.wood, {
    position: [-0.12, hip + 0.62, 0.2],
    rotation: [0.9, 0.2, 0.9],
  });
  addMesh(body, new CylinderGeometry(0.004, 0.004, 0.7, 4), m.black, {
    position: [0.15, hip + 0.62, 0.3],
    rotation: [0, 0, 1.2],
  });
}

/** The string section: guitars, the bowed strings and the double bass. */
export const STRING_INSTRUMENTS: Readonly<Record<StringInstrument, InstrumentBuilder>> = {
  guitar: (body, m, hip) => slungGuitar(body, m, hip, 1, m.wood),
  bass: (body, m, hip) => slungGuitar(body, m, hip, 1.25, m.black),
  violin: (body, m, hip) => chinInstrument(body, m, hip, 1),
  viola: (body, m, hip) => chinInstrument(body, m, hip, 1.12),
  cello: (body, m, hip) => {
    addMesh(body, new BoxGeometry(0.42, 0.72, 0.2), m.wood, {
      position: [0, hip + 0.02, 0.42],
      rotation: [-0.12, 0, 0],
    });
    addMesh(body, new BoxGeometry(0.06, 0.5, 0.04), m.darkWood, {
      position: [0, hip + 0.62, 0.36],
      rotation: [-0.12, 0, 0],
    });
    addMesh(body, new CylinderGeometry(0.005, 0.005, 0.8, 4), m.black, {
      position: [0.15, hip + 0.1, 0.55],
      rotation: [0, 0, 1.4],
    });
  },
  dbass: (body, m) => {
    addMesh(body, new BoxGeometry(0.6, 1.05, 0.28), m.wood, { position: [0.3, 0.75, 0.3], rotation: [-0.08, 0, 0.12] });
    addMesh(body, new BoxGeometry(0.07, 0.75, 0.05), m.darkWood, {
      position: [0.22, 1.62, 0.28],
      rotation: [-0.08, 0, 0.12],
    });
  },
};
