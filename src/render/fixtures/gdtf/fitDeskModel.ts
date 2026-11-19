import { Matrix4, Vector3, type Group } from 'three';
import { bodyBox } from './bodyBox';

const ONE = new Vector3(1, 1, 1);
/** How far one axis may leave the whole-body scale before the model counts as deformed; the fit is exact either way. */
const MIN_RATIO = 0.5,
  MAX_RATIO = 2;

export interface DeskFit {
  /** World offset the group moved by, so the beam origin follows the body. */
  readonly axisAt: Vector3;
  /** The box is far from the shape of the model: an axis is stretched past the limit, or the box gives no scale. */
  readonly limited: boolean;
}

/**
 * Fits the desk model in `g` to `target`, the overall GDTF box in metres on the app X, Y and Z: one scale per axis,
 * so the drawn body has exactly the real size against the truss and keeps its base, yoke, head, lens and joints. The
 * size of the file wins over the shape of the model: no axis is held back. The whole-body scale is the one of the
 * largest dimension; when an axis leaves it by more than a factor of 0.5 to 2 the model is deformed and `limited`
 * says so, and the caller reports it. An axis without a size takes the whole-body scale. The mounting face of the
 * model is put on `insertion`, the MVR insertion point in the desk frame: the top of the model (its base plate) for a
 * model in a group in the hanging pose or turned by the file's rotation, and the foot of the model when it is
 * `standing`, built upright on its stand in an unturned group, so it stands on the floor and not under it. A scale
 * that differs per axis shears a turned head.
 */
export function fitDeskModel(
  g: Group,
  target: readonly [number, number, number],
  insertion: readonly [number, number, number] | undefined,
  standing = false,
): DeskFit {
  // the box is measured at scale 1; a box that gives no scale puts the old one back, so the model keeps its size
  const before = g.scale.clone();
  g.scale.setScalar(1);
  const box = bodyBox(g, new Matrix4().compose(g.position, g.quaternion, ONE).invert());
  const have = box.getSize(new Vector3()).toArray();
  const axisAt = new Vector3();
  const whole = Math.max(...target) / Math.max(...have);
  if (!Number.isFinite(whole) || whole <= 0) return (g.scale.copy(before), { axisAt, limited: true });
  const ratios = target.map((wanted, axis) => wanted / (have[axis] ?? 0));
  const [x = whole, y = whole, z = whole] = ratios.map((ratio) =>
    Number.isFinite(ratio) && ratio > 0 ? ratio : whole,
  );
  g.scale.set(x, y, z);
  if (insertion) {
    const local = new Vector3(...insertion).sub(g.position).applyQuaternion(g.quaternion.clone().invert());
    const mountY = standing ? box.min.y : box.max.y;
    g.position.add(axisAt.set(0, local.y - mountY * y, 0).applyQuaternion(g.quaternion));
  }
  return { axisAt, limited: [x, y, z].some((ratio) => ratio < whole * MIN_RATIO || ratio > whole * MAX_RATIO) };
}
