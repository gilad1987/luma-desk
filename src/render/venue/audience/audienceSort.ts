import type { Slot } from './figureSlot';
import type { People } from './people';

/** Figures nearer than this to the camera get the near level of detail, metres. */
const NEAR = 16;
/** The level of a person no sort has seen yet; it differs from near (0) and far (1), so the first sort fills. */
export const UNSORTED = 2;

/** A point in the layer's own frame. */
interface Point {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Sets the level of detail of the first `count` people in fill order (`levels[n]`: 0 near, 1 far) from their distance
 * to `eye`, and says whether any level changed. It reads the place of a person by index from the matrix buffer, so a
 * camera that moves makes no object; nearly every sort of an orbiting camera ends here with "no change".
 */
export function setLevels(people: People, count: number, eye: Point, levels: Uint8Array): boolean {
  const { matrix, order } = people;
  let changed = false;
  for (let n = 0; n < count; n++) {
    const at = (order[n] ?? 0) * 16 + 12;
    const [x, y, z] = [matrix[at] ?? 0, matrix[at + 1] ?? 0, matrix[at + 2] ?? 0];
    const level = Math.hypot(x - eye.x, y - eye.y, z - eye.z) < NEAR ? 0 : 1;
    if (levels[n] !== level) changed = true;
    levels[n] = level;
  }
  return changed;
}

/** A buffer the sort writes into: an instance attribute's array. */
interface Target {
  [index: number]: number;
}

/**
 * A copy of one item of `size` numbers from item `from` of `source` to item `to` of `target`: a loop by index, as a
 * `subarray` per person and buffer was 7,400 objects a sort.
 */
const copyOf =
  (size: number) =>
  (source: Float32Array, from: number, target: Target, to: number): void => {
    for (let k = 0; k < size; k++) target[to * size + k] = source[from * size + k] ?? 0;
  };
const [copyMatrix, copyColor, copyLook] = [copyOf(16), copyOf(3), copyOf(4)];

/**
 * Copies the first `count` people into the near or the far mesh of each person's body (`slots`: two per body, near
 * first), sets the draw counts and marks the buffers for upload.
 */
export function fillSlots(people: People, count: number, levels: Uint8Array, slots: readonly Slot[]): void {
  const { matrix, color, look, variant, order } = people;
  const filled = slots.map(() => 0);
  for (let n = 0; n < count; n++) {
    const i = order[n] ?? 0;
    const index = (variant[i] ?? 0) * 2 + (levels[n] === 0 ? 0 : 1);
    const slot = slots[index];
    const at = filled[index] ?? 0;
    if (!slot) continue;
    filled[index] = at + 1;
    copyMatrix(matrix, i, slot.mesh.instanceMatrix.array, at);
    copyColor(color, i, slot.tint.array, at);
    copyLook(look, i, slot.look.array, at);
  }
  slots.forEach(({ mesh, look: looks, tint }, index) => {
    mesh.count = filled[index] ?? 0;
    mesh.instanceMatrix.needsUpdate = looks.needsUpdate = tint.needsUpdate = true;
  });
}
