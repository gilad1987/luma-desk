import { innerFraction, MIN_TAN, peakIntensity, reachOf } from './beamIntensity';

/** Floats per beam in the instance buffer: four vec4 attributes (see `glsl/beam.vert.glsl`). */
export const ROW = 16;
/** Cells in the gobo sheet; a slot past it shows the open gobo. */
export const GOBO_SLOTS = 8;

interface Point {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** The part of a lit fixture's frame that the volume needs; the carrier of the fixture sync has this shape. */
export interface BeamShape {
  /** Beam start, just in front of the lens. */
  readonly origin: Point;
  /** Beam direction (unit). */
  readonly dir: Point;
  /** Metres to the scenery hit, or the free length. */
  readonly length: number;
  /** tan(zoom / 2). */
  readonly tz: number;
  readonly col: ArrayLike<number>;
  readonly hit: object | null;
}

/** What the fixture type and its output add to the shape. */
export interface BeamLook {
  /** Strobe-gated dimmer times the output scale of the fixture type. */
  output: number;
  /** Edge softness of the fixture type. */
  soft: number;
  gobo: number;
  /** Gobo rotation, radians. */
  rotation: number;
  /** Radius of the front lens in metres: the beam starts as a disc of this size, not as a point. */
  lensRadius: number;
}

/**
 * Writes one beam into its instance row: origin and length, axis and tan of the field half angle, colour times peak
 * intensity and the core fraction, then gobo cell, gobo rotation, lens radius and the end fade flag.
 */
export function packBeam(row: Float32Array, shape: BeamShape, look: BeamLook): void {
  const { origin, dir, col } = shape;
  // one value that is not finite (a NaN pose, the tan of a 180 degree zoom) would spread over the whole target
  // through the additive blend; a sum is finite only when every term is. A zero row draws nothing.
  const terms = origin.x + origin.y + origin.z + dir.x + dir.y + dir.z + shape.length + shape.tz;
  const looks =
    look.output + look.soft + look.rotation + look.lensRadius + (col[0] ?? 0) + (col[1] ?? 0) + (col[2] ?? 0);
  if (!Number.isFinite(terms + looks)) {
    row.fill(0);
    return;
  }
  const tan = Math.max(shape.tz, MIN_TAN);
  const reach = Math.min(shape.length, reachOf(tan));
  const scale = look.output * peakIntensity(tan);
  row[0] = shape.origin.x;
  row[1] = shape.origin.y;
  row[2] = shape.origin.z;
  row[3] = reach;
  row[4] = shape.dir.x;
  row[5] = shape.dir.y;
  row[6] = shape.dir.z;
  row[7] = tan;
  row[8] = (shape.col[0] ?? 0) * scale;
  row[9] = (shape.col[1] ?? 0) * scale;
  row[10] = (shape.col[2] ?? 0) * scale;
  row[11] = innerFraction(look.soft);
  row[12] = look.gobo >= 0 && look.gobo < GOBO_SLOTS ? look.gobo : 0;
  row[13] = look.rotation;
  row[14] = look.lensRadius;
  // a beam that ends in the air, or is cut before its hit, fades out; one that lands on scenery ends there
  row[15] = shape.hit !== null && reach === shape.length ? 0 : 1;
}
