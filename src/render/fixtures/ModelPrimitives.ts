import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  LatheGeometry,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from 'three';
import { part, type AxisTriple } from './modelGeometry';

/** One [radius, y] point of a revolved profile. */
export type ProfilePoint = readonly [radius: number, y: number];

/**
 * The unit primitives every fixture model, pixel bar, pool and prop is cut from, plus shorthands that place a
 * scaled copy of one. The constructor creates the 7 geometries in the legacy order (decision 24).
 */
export class ModelPrimitives {
  readonly cylinderGeo = new CylinderGeometry(1, 1, 1, 18);
  readonly boxGeo = new BoxGeometry(1, 1, 1);
  readonly circleGeo = new CircleGeometry(1, 20);
  readonly planeGeo = new PlaneGeometry(1, 1);
  readonly poolGeo = new PlaneGeometry(2, 2);
  readonly sphereGeo = new SphereGeometry(1, 8, 6);
  readonly torusGeo = new TorusGeometry(1, 0.12, 6, 20);

  /** A box of the given size centred at `position`, turned by `rotation` (radians, XYZ). */
  readonly box = (position: AxisTriple, size: AxisTriple, rotation?: AxisTriple): BufferGeometry =>
    part(this.boxGeo, position, size, rotation);

  /** A cylinder of `radius` and `height` centred at `position`, axis Y before `rotation`. */
  readonly cylinder = (position: AxisTriple, radius: number, height: number, rotation?: AxisTriple): BufferGeometry =>
    part(this.cylinderGeo, position, [radius, height, radius], rotation);

  /** A cylinder along X (tilt hubs, knobs). */
  readonly cylinderX = (position: AxisTriple, radius: number, length: number): BufferGeometry =>
    this.cylinder(position, radius, length, [0, 0, Math.PI / 2]);

  /** A profile revolved around Y; list points front (-y) to rear (+y) so the faces point outward. */
  readonly lathe = (pts: readonly ProfilePoint[], seg = 28): BufferGeometry =>
    part(
      new LatheGeometry(
        pts.map(([r, y]) => new Vector2(r, y)),
        seg,
      ),
    );
}
