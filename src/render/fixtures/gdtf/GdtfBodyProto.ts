import type { BufferGeometry, Matrix4, Vector3 } from 'three';

/** The rigid groups of a body: what never moves, what pans, and what pans and tilts. One mesh is drawn for each. */
export type Section = 'base' | 'yoke' | 'head';

export const SECTIONS: readonly Section[] = ['base', 'yoke', 'head'];

/** The geometries a prototype owns: its sections and the lens discs of a unit with several beams. */
export const OWNED = [...SECTIONS, 'lensDiscs'] as const;

/**
 * One GDTF body ready to draw, shared by every fixture of that GDTF tree. All of it is in the app frame (Y up,
 * metres) with the GDTF root at the origin, in the hanging rest pose the GDTF is drawn in.
 */
export interface GdtfBodyProto {
  readonly base?: BufferGeometry;
  readonly yoke?: BufferGeometry;
  readonly head?: BufferGeometry;
  /** The rest frame of the pan axis in the root frame; the identity for a body without one. */
  readonly panAt: Matrix4;
  /** The rest frame of the tilt axis in the pan frame; the identity for a body without one. */
  readonly tiltAt: Matrix4;
  /** The tree has a pan or a tilt axis, so the head turns on joints; without one the whole body is aimed. */
  readonly moving: boolean;
  /** The frame of the lens face in the frame of `lensIn`; the light leaves along its -Y. */
  readonly lensAt: Matrix4;
  readonly lensIn: Section;
  /** A unit with several beams: one disc at each beam origin in the frame of `lensIn`, drawn in place of the lens. */
  readonly lensDiscs?: BufferGeometry;
  /** Metres. */
  readonly lensRadius: number;
  /** Metres from the tilt axis to the lens face along the beam; 0 for a body without a tilt axis. */
  readonly lensOff: number;
  /** The point the beam direction turns about, in the root frame at rest: the tilt axis, or the lens without one. */
  readonly aimAt: Vector3;
  /** Pan and tilt axes the desk does not drive (a multi-head unit): they stay at rest. */
  readonly extraAxes: number;
  readonly triangles: number;
}
