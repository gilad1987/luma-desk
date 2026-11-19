import { Matrix4, MeshPhongMaterial, type BufferGeometry, type Material, type Object3D } from 'three';
import { groupGeometry } from './groupGeometry';
import { isMesh } from './isMesh';
import type { MeshPart } from './MeshPart';
import { repairGeometry } from './repairGeometry';

/** Gives the stand-in material of faces the file names no material for; one per file, made on first need. */
type Plain = () => Material;

/**
 * The parts of one mesh node, before the frame is baked in: the whole geometry with its material, or, for a mesh with
 * a material array (a 3DS mesh with several material groups), one part per `geometry.groups` entry with the material
 * that group names. Faces whose material the file does not define are real geometry (a 3DS written without a
 * material table still holds the whole fixture housing or truss), so they are kept with the `plain` material; three.js
 * alone would draw nothing for them. The same holds for faces after the last group.
 */
function nodeParts(geometry: BufferGeometry, material: Material | Material[], plain: Plain): MeshPart[] {
  if (!Array.isArray(material)) return [{ geometry: geometry.clone(), material }];
  if (geometry.groups.length === 0) return [{ geometry: geometry.clone(), material: material[0] ?? plain() }];
  const parts = geometry.groups.map(({ start, count, materialIndex }) => ({
    geometry: groupGeometry(geometry, start, count),
    material: material[materialIndex ?? 0] ?? plain(),
  }));
  const drawn = Math.max(...geometry.groups.map(({ start, count }) => start + count));
  const total = geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0;
  if (drawn < total) parts.push({ geometry: groupGeometry(geometry, drawn, total - drawn), material: plain() });
  return parts;
}

/**
 * The meshes of a loaded file as flat parts: each geometry is copied with its node's world matrix and `frame` baked
 * in, so a placement needs only its own matrix and a glTF that reuses one geometry under two nodes stays correct.
 * Known limit: the matrix is applied to the attribute values, so a glTF with quantized positions
 * (KHR_mesh_quantization, normalized integers) loses precision or clamps; no MVR sample seen so far uses it.
 */
export function meshPartsOf(root: Object3D, frame: Matrix4): MeshPart[] {
  root.updateMatrixWorld(true);
  const parts: MeshPart[] = [];
  let fallback: Material | undefined;
  // the neutral grey of the 3DS loader's own default material: scenery gets its class look from it, a GDTF body
  // replaces it with the body material
  const plain: Plain = () => (fallback ??= new MeshPhongMaterial());
  root.traverse((node) => {
    if (!isMesh(node)) return;
    const toFile = new Matrix4().multiplyMatrices(frame, node.matrixWorld);
    for (const part of nodeParts(node.geometry, node.material, plain)) {
      const geometry = part.geometry.applyMatrix4(toFile);
      // after the matrix, so a normal the matrix flattened to zero is repaired too; the count is for a warning
      const { triangles } = repairGeometry(geometry);
      if (triangles > 0) geometry.userData['droppedTriangles'] = triangles;
      parts.push({ geometry, material: part.material });
    }
  });
  return parts;
}
