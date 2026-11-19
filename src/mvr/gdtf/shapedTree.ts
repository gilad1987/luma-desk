import type { GdtfNode } from './GdtfBody';
import { primitiveShape } from './primitiveShapes';

interface Tally {
  meshes: number;
  bare: number;
}

function count(node: GdtfNode, tally: Tally): Tally {
  const { model } = node;
  const sized = model !== undefined && model.size[0] + model.size[1] + model.size[2] > 0;
  if (model && sized && node.tag !== 'WiringObject' && model.primitiveType !== 'Pigtail') {
    const shape = primitiveShape(model);
    if (shape?.mesh !== undefined) tally.meshes++;
    // the desk draws its own lens at a beam origin, so a lens model that draws nothing leaves no hole
    else if (!shape && !node.beam) tally.bare++;
  }
  for (const child of node.children) count(child, tally);
  return tally;
}

/**
 * Whether the default shapes of GDTF (`primitiveShape`) draw the whole body of a tree without mesh files: one part at
 * least has a default mesh, and no sized part of the housing is left without a shape. A part of type `Undefined`
 * without a file draws nothing, so a tree with such a part would be drawn with a hole (a yoke without its head); it
 * keeps the desk model. So does a tree of plain solids alone (a matrix cell that is one `Cube`): a raw box reads as a
 * slab, not as a light, and the desk model at the GDTF size shows more of the unit. The pigtail and the wiring objects
 * are not the body.
 */
export function isShapedTree(root: GdtfNode): boolean {
  const { meshes, bare } = count(root, { meshes: 0, bare: 0 });
  return meshes > 0 && bare === 0;
}
