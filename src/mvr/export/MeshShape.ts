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

/** The grid shape numbers are hashed on: 0.1 mm in metres, finer than any build tolerance and coarser than float noise. */
const HASH_STEP = 1e-4;

/**
 * `value` as JSON text with sorted keys, no undefined fields and numbers as whole steps of `HASH_STEP`, so two equal
 * shapes give the same text whatever their key order or the rounding error of the math that made them.
 */
function canonicalJson(value: unknown): string {
  if (typeof value === 'number') return JSON.stringify(Math.round(value / HASH_STEP));
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value !== 'object' || value === null) return JSON.stringify(value);
  const fields = Object.entries(value).filter(([, field]) => field !== undefined);
  fields.sort(([a], [b]) => (a < b ? -1 : 1));
  return `{${fields.map(([key, field]) => `${JSON.stringify(key)}:${canonicalJson(field)}`).join(',')}}`;
}

/**
 * The mesh file name of a shape: `luma_<kind>_<hash>.glb`, where the hash is taken over the canonical shape data.
 * Equal shapes, such as two identical trusses, get one name, so the archive holds the mesh once and a Symdef shares it. The name
 * holds only letters, digits and `_`, because MVR readers look files up by plain name in the archive root.
 */
export function meshFileOf(shape: MeshShape): string {
  const hash = stableUuid(canonicalJson(shape)).replace(/-/g, '').slice(0, 12).toLowerCase();
  return `${LUMA_MESH_PREFIX}${shape.kind}_${hash}.glb`;
}
