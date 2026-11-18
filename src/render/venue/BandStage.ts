import { Mesh, type Object3D } from 'three';
import { SXZ } from '../../domain/venue';
import { buildBand } from './Band';
import { createBandMaterials } from './bandMaterials';
import type { VenueMaterials } from './materials';
import { buildOrchestra } from './Orchestra';
import type { Performer } from './performerSpec';

/**
 * Spreads the band area to the stage size: every object the band builders added moves by `SXZ` in x and z; risers
 * also stretch by it and take shadows. Only the band area is scaled, so the crowd and everything later stay put.
 */
function spreadBandLayout(added: readonly Object3D[]): void {
  for (const o of added) {
    o.position.x *= SXZ[0];
    o.position.z *= SXZ[1];
    if (o.userData['riser']) {
      o.scale.x *= SXZ[0];
      o.scale.z *= SXZ[1];
      o.receiveShadow = true;
    }
  }
}

/**
 * Builds the backline, band and orchestra, spreads them with the band layout scale and makes every performer mesh
 * cast shadows. Returns all 28 performers (band first) for the beat animation.
 */
export function buildBandStage(scene: Object3D, venue: VenueMaterials): Performer[] {
  const firstAdded = scene.children.length;
  const materials = createBandMaterials();
  const performers = [...buildBand(scene, venue, materials), ...buildOrchestra(scene, materials)];
  spreadBandLayout(scene.children.slice(firstAdded));
  for (const p of performers)
    p.body.traverse((o) => {
      if (o instanceof Mesh) o.castShadow = true;
    });
  return performers;
}
