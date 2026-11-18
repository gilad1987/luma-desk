import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MeshShape } from '../../../mvr/index';
import { boxSpan } from './boxGeometry';
import { trussBoxes } from './trussBoxes';

/** Depth of an LED wall or side screen behind its face; the design gives none, and a cabinet is about this deep. */
const SCREEN_DEPTH = 0.1;

/** All boxes of a truss as one geometry, so its file holds one mesh; the parts are freed after the merge. */
function trussGeometry(shape: Extract<MeshShape, { kind: 'truss' }>): BufferGeometry {
  const boxes = trussBoxes(shape.params);
  const merged = mergeGeometries(boxes);
  boxes.forEach((box) => box.dispose());
  if (!merged) throw new Error(`shapeGeometry: the ${shape.params.kind} truss boxes could not be merged`);
  return merged;
}

/**
 * The geometry of one exported body in its object frame (metres, Y up), by the anchors `MeshShape` states, so the
 * import's object matrix puts it back where the design has it. A screen's face lies on its anchor and the cabinet
 * depth goes back, away from the audience, so beams still land on the face the design names.
 */
export function shapeGeometry(shape: MeshShape): BufferGeometry {
  switch (shape.kind) {
    case 'truss':
      return trussGeometry(shape);
    case 'deck': {
      const [x, y, z] = shape.size;
      return boxSpan([-x / 2, 0, -z / 2], [x / 2, y, z / 2]);
    }
    case 'riser': {
      const [x, y, z] = shape.size;
      return boxSpan([-x / 2, -y, -z / 2], [x / 2, 0, z / 2]);
    }
    case 'screen':
      return boxSpan([-shape.width / 2, -shape.height / 2, -SCREEN_DEPTH], [shape.width / 2, shape.height / 2, 0]);
  }
}
