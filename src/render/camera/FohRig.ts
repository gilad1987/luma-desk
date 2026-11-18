import type { Object3D } from 'three';

/**
 * The FOH riser, its desk and the RoboSpot station. In the MA layout the FOH view is the operator's own eye at that
 * position, so these objects are hidden there; otherwise they would show as a second, empty desk.
 */
export class FohRig {
  private readonly members: Object3D[] = [];

  /**
   * Registers objects in build order. A new object takes the visibility of the first registered one (visible when
   * the rig is empty), which is how the legacy RoboSpot station joined a rig that a layout change may have hidden.
   */
  add(...objects: Object3D[]): void {
    for (const object of objects) {
      object.visible = this.members[0]?.visible ?? true;
      this.members.push(object);
    }
  }

  /** Shows or hides every registered object. */
  setVisible(isVisible: boolean): void {
    for (const member of this.members) member.visible = isVisible;
  }
}
