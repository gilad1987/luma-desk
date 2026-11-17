import { Raycaster, Vector2, type Camera, type Object3D, type Vector3 } from 'three';
import type { Fixture } from '../domain/Fixture';
import { projectToScreen, type ScreenPoint, type ScreenRect } from './CameraViewsProjection';

/** Maps a client pixel inside a rect to normalised device coordinates (-1..1, y up), the raycaster's input. */
export function clientToNdc(clientX: number, clientY: number, rect: ScreenRect, out: Vector2): Vector2 {
  return out.set(((clientX - rect.left) / rect.width) * 2 - 1, (-(clientY - rect.top) / rect.height) * 2 + 1);
}

/**
 * The render half of viewport picking: which fixture is under a pointer, and where a fixture lands on screen. The
 * pointer handlers and the selection rectangle stay in the UI.
 */
export class FixturePicker {
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: Camera;
  private readonly pickables: Object3D[] = [];
  private readonly owners = new Map<Object3D, Fixture>();
  private readonly ray = new Raycaster();
  private readonly ndc = new Vector2();

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas;
    this.camera = camera;
  }

  /** Makes an object a pick target for its fixture; register in build order, the order hits are tested. */
  register(object: Object3D, fixture: Fixture): void {
    this.pickables.push(object);
    this.owners.set(object, fixture);
  }

  /** The fixture whose registered object is nearest under the client point, or null. Children are not tested. */
  pickAt(clientX: number, clientY: number): Fixture | null {
    clientToNdc(clientX, clientY, this.canvas.getBoundingClientRect(), this.ndc);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = this.ray.intersectObjects(this.pickables, false)[0];
    return hit ? (this.owners.get(hit.object) ?? null) : null;
  }

  /** Where a world point lands in a screen rect; the box select keeps fixtures whose depth is at most 1. */
  projectToScreen(position: Vector3, rect: ScreenRect): ScreenPoint {
    return projectToScreen(this.camera, position, rect);
  }
}
