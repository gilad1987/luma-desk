import type { Vector3 } from 'three';
import type { Rgb01 } from '../../../core';
import type { AttrValues } from '../../../domain/attributes';
import type { LightVisual } from '../FixtureVisual';
import type { BeamHit } from '../../surface/SurfaceHit';

/** One lit fixture in the current frame, as the beam, pool and glow updates read it. */
export interface BeamFrame {
  readonly visual: LightVisual;
  readonly o: Readonly<AttrValues>;
  /** Strobe-gated intensity, 0..1. */
  readonly intensity: number;
  readonly col: Rgb01;
  /** Beam direction (unit). */
  readonly dir: Vector3;
  /** Beam start, just in front of the lens. */
  readonly origin: Vector3;
  /** Zoom clamped to the type's range, degrees. */
  readonly zoom: number;
  /** tan(zoom / 2): beam radius per unit length. */
  readonly tz: number;
  readonly hit: BeamHit | null;
  /** Beam length: to the hit, or 85 when it hits nothing. */
  readonly length: number;
}

/**
 * The writable form of `BeamFrame`: the fixture sync owns one and refills it for each lit fixture, so a frame
 * creates no carrier. A step that keeps a value past its call copies it (the key-light candidate colour).
 */
export type BeamFrameSlot = { -readonly [K in keyof BeamFrame]: BeamFrame[K] };

/** An output value; the merger fills every attribute before the first frame, so the 0 fallback never applies. */
export function outputValue(o: Readonly<AttrValues>, attr: keyof AttrValues): number {
  return o[attr] ?? 0;
}
