import type { Object3D } from 'three';
import type { SceneryPart } from '../../domain/stage/types';

/**
 * The scene objects of each scenery part (G3), so a design toggle shows or hides them without a rebuild and the frame
 * loop skips the per-frame work of a hidden part. It keeps plain arrays and creates no three.js object: a `Group`
 * would draw a uuid from the seeded Math.random and move every later uuid of the boot scene.
 */
export class SceneryRegistry {
  readonly #objects = new Map<SceneryPart, Object3D[]>();
  readonly #hidden = new Set<SceneryPart>();

  /** Adds `objects` to `part`; they take the part's current visibility, so a late object never shows a hidden part. */
  register(part: SceneryPart, ...objects: Object3D[]): void {
    const list = this.#objects.get(part) ?? [];
    list.push(...objects);
    this.#objects.set(part, list);
    if (!this.isVisible(part)) for (const o of objects) o.visible = false;
  }

  /**
   * Shows or hides every object of `part`. It writes only on a change, so showing a part that is already shown (the
   * boot design shows every part) leaves each object's own visibility as its builder set it.
   */
  setVisible(part: SceneryPart, on: boolean): void {
    if (this.isVisible(part) === on) return;
    if (on) this.#hidden.delete(part);
    else this.#hidden.add(part);
    for (const o of this.#objects.get(part) ?? []) o.visible = on;
  }

  /** Whether `part` is shown; a part never set is shown, as every part of a design is by default. */
  isVisible(part: SceneryPart): boolean {
    return !this.#hidden.has(part);
  }
}
