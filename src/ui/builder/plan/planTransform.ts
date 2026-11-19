import type { StageBounds } from '../../../domain/stage/types';

/** A point of the plan:`[x, z]` in world metres or `[px, py]` in canvas pixels. */
export type Point2 = readonly [number, number];

/** The pixel size of the canvas the stage is fitted into. */
export interface CanvasSize {
  readonly width: number;
  readonly height: number;
}

/**
 * World x/z to canvas pixels and back for the builder plan view. One scale serves both axes, so a circle truss stays
 * round: the focus pad stretches its map, but the builder must not, because the user places items by eye. Upstage
 * (-z) is at the top, the audience at the bottom, as on the focus pad.
 */
export interface PlanTransform {
  /** Canvas pixels per metre. */
  readonly scale: number;
  toCanvas(x: number, z: number): Point2;
  toWorld(px: number, py: number): Point2;
}

/** Space kept free around the stage, so an item at the edge is still a whole touch target. */
const MARGIN_PX = 24;
/** A design with no extent (one fixture) still gets a finite scale. */
const MIN_SPAN_M = 1;
/** A canvas smaller than its margins still maps every point somewhere. */
const MIN_SCALE_PX_PER_M = 1;

/** The transform that fits `bounds` (the whole design, see `boundsOf`) into `size`, centred, with a margin. */
export function fitTransform(bounds: StageBounds, size: CanvasSize): PlanTransform {
  const [x0, , z0] = bounds.min;
  const [x1, , z1] = bounds.max;
  const fitX = (size.width - 2 * MARGIN_PX) / Math.max(x1 - x0, MIN_SPAN_M);
  const fitZ = (size.height - 2 * MARGIN_PX) / Math.max(z1 - z0, MIN_SPAN_M);
  const scale = Math.max(Math.min(fitX, fitZ), MIN_SCALE_PX_PER_M);
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  const ox = size.width / 2,
    oy = size.height / 2;
  return {
    scale,
    toCanvas: (x, z) => [ox + (x - cx) * scale, oy + (z - cz) * scale],
    toWorld: (px, py) => [cx + (px - ox) / scale, cz + (py - oy) / scale],
  };
}
