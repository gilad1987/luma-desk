import { LOOK_BALANCE, keyIrradiance } from '../../domain/stage/showBalance';
import { NEUTRAL_ALBEDO, SURFACE_GAIN } from './surfacePhotometry';

/*
 * The numbers of the bounce of the lit stage (`glsl/ambient.frag.glsl`) and a mirror of its term in TypeScript, so
 * the balance of the bounce against the key is tested without a GPU. The bounce has two parts. The DECK part comes
 * from below and a metal mirrors it. The STAGE part comes from the lit stage as a whole: only a face that looks at
 * the stage gets it, less with distance, and a metal does not multiply it.
 */

type Triple = readonly [number, number, number];

/**
 * How much more of the deck bounce a full metal returns than a matt surface of its colour: a satin metal mirrors the
 * lit deck, which is far brighter than the mean of what a matt face gathers. It gives the truss over a lit stage the
 * colour of the look, and nothing at a blackout.
 */
export const METAL_MIRROR = 8;
/**
 * The bounce a face that looks straight at the centre of the lit stage from close by gets on top of the deck bounce,
 * as a share: the lit stage is the brightest thing an audience faces, so people read at a dim house.
 */
export const STAGE_SPILL = 4;
/**
 * The distance at which the stage spill is half, in radii of the lit area: a lit disc of radius r lights a point on
 * its axis with r^2 / (r^2 + d^2) of what it gives close by, and the stage is lit over more than its pools (the
 * figures, the scenery, the haze), so it counts as a disc of three pool radii.
 */
export const SPILL_REACH = 3;
/** The smallest lit radius in metres: one tight spot still lights a figure and the deck around it. */
export const MIN_LIT_RADIUS = 3;
/**
 * The most the bounce alone may give a metal face, as a share of the key on a mid-grey figure. The key on the
 * performers is the brightest light on stage (`showBalance`): at 0.6 a silver truss reads as lit by the stage and
 * stays a stop under the band; the mirror and the spill together reached 2.6 times the key before.
 */
export const METAL_BOUNCE_CAP = 0.6;
/** The radiance of the key of the first look on a mid-grey figure that faces the audience: 0.06. */
export const KEY_ON_FIGURE = SURFACE_GAIN * keyIrradiance(LOOK_BALANCE.keyLux, [0, 0, 1]) * NEUTRAL_ALBEDO;
/** The cap as a radiance: what the shader holds the bounce of a metal face under. */
export const METAL_BOUNCE_LIMIT = METAL_BOUNCE_CAP * KEY_ON_FIGURE;

/** The lit stage as the bounce sees it: the centre of the landed light and the distance of half spill, metres. */
export interface LitStage {
  readonly centre: Triple;
  /** 0 when no beam landed: no stage spill. */
  readonly reach: number;
}

/** A surface point for the bounce. */
export interface BounceSurface {
  readonly albedo: number;
  /** Metalness 0..1. */
  readonly metal: number;
  readonly normal: Triple;
  readonly at: Triple;
}

/**
 * The share of the stage spill a face gets: the cosine between its normal and the way to the centre of the lit
 * stage (a face that looks away gets none, wherever it is), times the fall with distance.
 */
export function stageSpill(surface: Pick<BounceSurface, 'normal' | 'at'>, stage: LitStage): number {
  const [nx, ny, nz] = surface.normal;
  const dx = stage.centre[0] - surface.at[0];
  const dy = stage.centre[1] - surface.at[1];
  const dz = stage.centre[2] - surface.at[2];
  const far2 = dx * dx + dy * dy + dz * dz;
  const reach2 = stage.reach * stage.reach;
  const facing = Math.max((nx * dx + ny * dy + nz * dz) / Math.sqrt(Math.max(far2, 1e-6)), 0);
  return (STAGE_SPILL * facing * reach2) / Math.max(reach2 + far2, 1e-6);
}

/**
 * The bounce radiance of one channel on `surface` for the bounce `ambient` on white: the mirror of the shader. The
 * mirrored deck part is held so that mirror plus spill stay under `METAL_BOUNCE_LIMIT`; it never goes below the
 * matt value, so the cap takes nothing from a surface that is not a metal.
 */
export function bounceRadiance(ambient: number, surface: BounceSurface, stage: LitStage): number {
  const matt = ambient * surface.albedo * (0.65 - 0.35 * surface.normal[1]);
  const spill = ambient * surface.albedo * stageSpill(surface, stage);
  const mirrored = matt * (1 + METAL_MIRROR * surface.metal);
  return Math.min(mirrored, Math.max(METAL_BOUNCE_LIMIT - spill, matt)) + spill;
}
