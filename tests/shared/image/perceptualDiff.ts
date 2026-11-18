import { BLOCK, blockDistances } from './blockDiff';
import { labPlanes, oklab, type LabPlanes } from './oklab';
import type { RgbaImage } from './png';

export { BLOCK } from './blockDiff';

/** A block counts as changed above this Oklab distance (about 5 % of the lightness range). */
export const CHANGED_BLOCK = 0.05;
// A chroma that the eye reads as grey: it keeps the hue of a near-neutral pair from being noise divided by noise.
const NEUTRAL_CHROMA = 0.004;

export interface PerceptualDiff {
  /** Mean over blocks of the shift-tolerant Oklab distance between block averages. */
  mean: number;
  /** Share (0..1) of blocks whose distance is above CHANGED_BLOCK: the size of a local change. */
  share: number;
  /** The largest block distance, and the top-left pixel of that block. */
  worst: number;
  worstAt: { x: number; y: number };
  /** ln(Yb / Ya) of the mean linear luminance, second over first: about +0.049 for a 5 % brighter picture. */
  exposure: number;
  /** Signed hue turn from first to second in degrees, weighted by the chroma of both pixels (+ is a to b). */
  hue: number;
  /** Red where blocks differ (full red at `heatScale`), over the dimmed lightness of the first image. */
  heatmap: RgbaImage;
}

/**
 * Global exposure and hue. Both are sums over every pixel, so a moved edge and noise cancel out while an exposure or
 * white-balance change moves every pixel the same way. The hue term sums C1·C2·sin(Δh) and C1·C2·cos(Δh) (the cross
 * and dot products of the a-b vectors), so saturated pixels decide it and grey pixels add almost nothing.
 */
function globalShift(pa: LabPlanes, pb: LabPlanes): { exposure: number; hue: number } {
  let [ya, yb, cross, dot] = [0, 0, 0, 0];
  for (let p = 0; p < pa.y.length; p++) {
    ya += pa.y[p] ?? 0;
    yb += pb.y[p] ?? 0;
    const [a1, b1, a2, b2] = [pa.a[p] ?? 0, pa.b[p] ?? 0, pb.a[p] ?? 0, pb.b[p] ?? 0];
    cross += a1 * b2 - b1 * a2;
    dot += a1 * a2 + b1 * b2;
  }
  // a floor of 1e-6 per pixel keeps the ratio of two black pictures at 1 instead of 0/0
  const floor = pa.y.length * 1e-6;
  const hue = Math.atan2(cross, dot + pa.y.length * NEUTRAL_CHROMA ** 2);
  return { exposure: Math.log((yb + floor) / (ya + floor)), hue: (hue * 180) / Math.PI };
}

function heatmapOf(a: RgbaImage, dist: Float64Array, cols: number, heatScale: number): RgbaImage {
  const heat = new Uint8Array(a.width * a.height * 4);
  for (let p = 0; p < a.width * a.height; p++) {
    const [x, y] = [p % a.width, Math.floor(p / a.width)];
    const d = dist[Math.floor(y / BLOCK) * cols + Math.floor(x / BLOCK)] ?? 0;
    const grey = Math.round(oklab(a.data[p * 4] ?? 0, a.data[p * 4 + 1] ?? 0, a.data[p * 4 + 2] ?? 0)[0] * 90);
    heat.set([Math.max(grey, Math.min(255, Math.round((d / heatScale) * 255))), grey, grey, 255], p * 4);
  }
  return { width: a.width, height: a.height, data: heat };
}

/** Compares two same-sized images; the averaging is of Oklab values per block. Limits: docs/render-gates.md. */
export function perceptualDiff(a: RgbaImage, b: RgbaImage, heatScale = CHANGED_BLOCK): PerceptualDiff {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`image sizes differ: ${a.width}x${a.height} vs ${b.width}x${b.height}`);
  }
  const [pa, pb] = [labPlanes(a), labPlanes(b)];
  const { cols, dist } = blockDistances(pa, pb);
  let [total, changed, worst, worstBlock] = [0, 0, 0, 0];
  dist.forEach((d, k) => {
    total += d;
    if (d > CHANGED_BLOCK) changed++;
    if (d > worst) [worst, worstBlock] = [d, k];
  });
  const worstAt = { x: (worstBlock % cols) * BLOCK, y: Math.floor(worstBlock / cols) * BLOCK };
  const shares = { mean: total / dist.length, share: changed / dist.length, worst, worstAt };
  return { ...shares, ...globalShift(pa, pb), heatmap: heatmapOf(a, dist, cols, heatScale) };
}
