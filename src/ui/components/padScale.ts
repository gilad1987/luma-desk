/** Venue metres to pad pixels and back, for a top view from upstage (top) to the audience (bottom). */
export interface PadScale {
  readonly x: (metres: number) => number;
  readonly z: (metres: number) => number;
  readonly invX: (px: number) => number;
  readonly invZ: (py: number) => number;
}

/** The mapped area: 50 m wide centred on x = 0, 28 m deep from z = -22 (upstage wall) to z = 6. */
const WIDTH_M = 50;
const HALF_WIDTH_M = 25;
const DEPTH_M = 28;
const UPSTAGE_Z = -22;

/** The scale for a pad of the given pixel size; the pad is stretched to fill, so x and z scale differently. */
export function padScale(size: { readonly width: number; readonly height: number }): PadScale {
  return {
    x: (m) => ((m + HALF_WIDTH_M) / WIDTH_M) * size.width,
    z: (m) => ((m - UPSTAGE_Z) / DEPTH_M) * size.height,
    invX: (px) => (px / size.width) * WIDTH_M - HALF_WIDTH_M,
    invZ: (py) => (py / size.height) * DEPTH_M + UPSTAGE_Z,
  };
}
