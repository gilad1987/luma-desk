import { Raycaster, Vector2, type Camera, type Object3D } from 'three';
import type { Fixture } from '../../domain/Fixture';
import type { ScreenRect } from '../shared';
import { clientToNdc } from './clientToNdc';

/** The canvas field the picker reads; narrow so a test can pass a plain fake. */
export interface PickCanvas {
  getBoundingClientRect(): ScreenRect;
}

/**
 * The render half of viewport picking: which fixture is under a pointer. The pointer handlers, the selection
 * rectangle and the box select (which projects with `projectToScreen` from render/shared) stay in the UI.
 */
export class FixturePicker {
  private readonly canvas: PickCanvas;
  private readonly camera: Camera;
  private readonly pickables: Object3D[] = [];
  private readonly owners = new Map<Object3D, Fixture>();
  private readonly ray = new Raycaster();
  private readonly ndc = new Vector2();

  constructor(canvas: PickCanvas, camera: Camera) {
    this.canvas = canvas;
    this.camera = camera;
  }

  /** Makes an object a pick target for its fixture; register in build order, the order hits are tested. */
  register(object: Object3D, fixture: Fixture): void {
    this.pickables.push(object);
    this.owners.set(object, fixture);
  }

  /** Forgets every pick target, so a rig rebuild can register the new rig's objects without the old ones. */
  clear(): void {
    this.pickables.length = 0;
    this.owners.clear();
  }

  /** The fixture whose registered object is nearest under the client point, or null. Children are not tested. */
  pickAt(clientX: number, clientY: number): Fixture | null {
    clientToNdc(clientX, clientY, this.canvas.getBoundingClientRect(), this.ndc);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = this.ray.intersectObjects(this.pickables, false)[0];
    return hit ? (this.owners.get(hit.object) ?? null) : null;
  }
}
