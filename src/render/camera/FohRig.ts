import type { Object3D } from 'three';

/**
 * The FOH riser, its desk and the RoboSpot station. In the MA layout the FOH view is the operator's own eye at that
 * position, so these objects are hidden there; otherwise they would show as a second, empty desk. The station stands
 * on the riser, so it shows only while the venue has one: a black box or an open field has no FOH riser.
 */
export class FohRig {
  /** The venue's FOH riser and desk, in build order. */
  private readonly members: Object3D[] = [];
  /** The objects that stand on the riser: the RoboSpot station. */
  private readonly riders: Object3D[] = [];
  /** What the current layout shows: false in the MA layout's FOH view. */
  private isShown = true;

  /**
   * Registers the venue's FOH objects in build order. A new object takes the rig's visibility (visible when the rig
   * is empty), which is how the legacy RoboSpot station joined a rig that a layout change may have hidden.
   */
  add(...objects: Object3D[]): void {
    this.resetWhenEmpty();
    for (const object of objects) {
      object.visible = this.isShown;
      this.members.push(object);
    }
    this.showRiders();
  }

  /** Registers objects that stand on the riser; they show only while a venue riser is registered. */
  addRider(...objects: Object3D[]): void {
    this.resetWhenEmpty();
    this.riders.push(...objects);
    this.showRiders();
  }

  /** Forgets objects that left the scene with their venue; a later venue's riser joins with `add`. */
  remove(...objects: Object3D[]): void {
    for (const object of objects) {
      const at = this.members.indexOf(object);
      if (at >= 0) this.members.splice(at, 1);
    }
    this.showRiders();
  }

  /** Shows or hides every registered object; a rider stays hidden while the venue has no riser. */
  setVisible(isVisible: boolean): void {
    this.isShown = isVisible;
    for (const member of this.members) member.visible = isVisible;
    this.showRiders();
  }

  /** The legacy rig was a plain list: its first object was visible whatever the layout had set before. */
  private resetWhenEmpty(): void {
    if (this.members.length === 0 && this.riders.length === 0) this.isShown = true;
  }

  private showRiders(): void {
    const isVisible = this.isShown && this.members.length > 0;
    for (const rider of this.riders) rider.visible = isVisible;
  }
}
