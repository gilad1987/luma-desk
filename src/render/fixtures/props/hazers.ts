import { Group, MeshStandardMaterial, Sprite, SpriteMaterial, type Object3D } from 'three';
import { DECK } from '../../../domain/venue';
import { addMesh, srgbCanvasTexture } from '../../shared';
import { merge, part } from '../modelGeometry';
import type { ModelKit } from '../models/ModelContext';

/** One haze puff sprite rising from hazer (x, z); `ph` staggers the 3 puffs of a hazer. */
export interface HazePuff {
  readonly sp: Sprite;
  readonly x: number;
  readonly z: number;
  readonly ph: number;
}

const HAZER_SPOTS = [
  [-20.6, -15.6],
  [20.6, -15.6],
  [-12.1, -19.3],
  [12.1, -19.3],
] as const;

// a soft cloud: 7 random blobs (consumes Math.random at boot, in the legacy order)
const paintPuff = (x: CanvasRenderingContext2D): void => {
  for (let k = 0; k < 7; k++) {
    const cx = 32 + (Math.random() - 0.5) * 18,
      cy = 32 + (Math.random() - 0.5) * 18,
      r = 14 + Math.random() * 12,
      g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
  }
};

/**
 * Antari HZ-500 hazers upstage (not patched): black road case with aluminium edges, ball corners, latches and
 * handle, nozzle and lid on top; each gets 3 hidden puff sprites. Returns the puffs for the frame update.
 */
export function buildHazers(scene: Object3D, { prims, materials }: ModelKit): HazePuff[] {
  const { box, sphereGeo } = prims;
  const caseMat = new MeshStandardMaterial({ color: 0x141417, roughness: 0.55, metalness: 0.2 });
  const body = merge([
    box([0, 0.18, 0], [0.5, 0.34, 0.36]),
    box([0, 0.365, -0.04], [0.16, 0.02, 0.1]),
    box([0, 0.4, -0.11], [0.17, 0.01, 0.12], [-0.6, 0, 0]),
  ]);
  const alu = merge([
    ...[0.01, 0.35, 0.28].flatMap((y) => [-1, 1].map((sz) => box([0, y, sz * 0.18], [0.52, 0.02, 0.02]))),
    ...[0.01, 0.35].flatMap((y) => [-1, 1].map((sx) => box([sx * 0.25, y, 0], [0.02, 0.02, 0.38]))),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box([sx * 0.25, 0.18, sz * 0.18], [0.02, 0.36, 0.02]))),
    ...[0.01, 0.35].flatMap((y) =>
      [-1, 1].flatMap((sx) => [-1, 1].map((sz) => part(sphereGeo, [sx * 0.25, y, sz * 0.18], [0.028, 0.028, 0.028]))),
    ),
    ...[-1, 1].map((sx) => box([sx * 0.14, 0.28, 0.186], [0.07, 0.07, 0.01])),
    box([0, 0.15, 0.186], [0.14, 0.07, 0.012]),
  ]);
  const puffTex = srgbCanvasTexture(64, 64, paintPuff);
  const puffs: HazePuff[] = [];
  for (const [x, z] of HAZER_SPOTS) {
    const g = new Group();
    g.position.set(x, DECK, z);
    addMesh(g, body, caseMat);
    addMesh(g, alu, materials.alu);
    scene.add(g);
    for (let k = 0; k < 3; k++) {
      const sp = new Sprite(
        new SpriteMaterial({ map: puffTex, color: 0xc4c8d2, transparent: true, depthWrite: false, opacity: 0 }),
      );
      sp.visible = false;
      scene.add(sp);
      puffs.push({ sp, x, z, ph: k / 3 });
    }
  }
  return puffs;
}
