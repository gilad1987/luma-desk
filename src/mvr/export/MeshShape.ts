import type { TrussParams } from '../../domain/stage/trussTypes';
import type { Vec3 } from '../../domain/stage/types';
import { LUMA_MESH_PREFIX } from '../luma/lumaData';
import { stableUuid } from './stableUuid';

/**
 * The body of one exported stage object in its own frame (metres, Y up), as plain data. The pure exporter names a
 * mesh file after it and render builds the mesh from it, so both sides agree on the file without three.js here.
 * Anchors follow the object poses of `objectSpecs`: a deck stands on the centre of its footprint, a riser hangs
 * from the centre of its top face, a screen is centred on its face and looks at the audience (+z), and a truss uses
 * the local points of its `params`.
 */
export type MeshShape =
  | { readonly kind: 'truss'; readonly params: TrussParams }
  | { readonly kind: 'deck'; readonly size: Vec3 }
  | { readonly kind: 'riser'; readonly size: Vec3 }
  | { readonly kind: 'screen'; readonly width: number; readonly height: number };

/**
 * The mesh file name of a shape: `luma_<kind>_<hash>.glb`, where the hash is taken over the shape data. Equal shapes,
 * such as two identical trusses, get one name, so the archive holds the mesh once and a Symdef shares it. The name
 * holds only letters, digits and `_`, because MVR readers look files up by plain name in the archive root.
 */
export function meshFileOf(shape: MeshShape): string {
  const hash = stableUuid(JSON.stringify(shape)).replace(/-/g, '').slice(0, 12).toLowerCase();
  return `${LUMA_MESH_PREFIX}${shape.kind}_${hash}.glb`;
}
