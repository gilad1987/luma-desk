import type { Object3D } from 'three';
import { ANG, RING, TR } from '../../domain/venue';
import type { VenueMaterials } from './materials';
import { buildPaHangs } from './PaHangs';
import { buildRingTruss } from './RingTruss';
import { buildRoofGrid } from './RoofGrid';
import { TrussKit } from './TrussKit';
import { buildTrussTowers } from './TrussTowers';

/** The x of the four chain points under each straight lighting truss. */
const TRUSS_CHAIN_X = [-16, -5.5, 5.5, 16] as const;

/**
 * Builds all rig steel in the legacy order: roof grid, the two ring trusses, delay and light towers, the angled
 * trusses with their chains, the chains of the straight trusses, then the PA.
 */
export function buildTrusses(scene: Object3D, materials: VenueMaterials): void {
  const kit = new TrussKit(materials.truss);
  buildRoofGrid(scene, kit);
  buildRingTruss(scene, kit, RING.R, RING.y, 0.5);
  buildRingTruss(scene, kit, RING.r2, RING.y2, 0.4);
  buildTrussTowers(scene, kit, materials.dark);
  for (const t of ANG) {
    kit.addSection(scene, [t.a.x, t.a.y, t.a.z], [t.b.x, t.b.y, t.b.z], 0.44);
    for (const p of [t.a, t.b]) kit.addChain(scene, p.x, p.y, p.z);
  }
  for (const beam of Object.values(TR)) for (const x of TRUSS_CHAIN_X) kit.addChain(scene, x, beam.y, beam.z);
  buildPaHangs(scene, materials.dark);
}
