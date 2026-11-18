import type { RgbaImage } from './png';

// sRGB 8-bit → linear light, once per level instead of once per pixel
const LINEAR = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

/** One pixel in Oklab (Ottosson 2020): L about 0..1, so a difference of 0.01 is about 1 % of the lightness range. */
export function oklab(r8: number, g8: number, b8: number): [number, number, number] {
  const [r, g, b] = [LINEAR[r8] ?? 0, LINEAR[g8] ?? 0, LINEAR[b8] ?? 0];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** One image as per-pixel planes: Oklab L, a, b, and the linear-light luminance Y (Rec. 709 weights). */
export interface LabPlanes {
  width: number;
  height: number;
  l: Float32Array;
  a: Float32Array;
  b: Float32Array;
  y: Float32Array;
}

/** Converts every pixel once; alpha is ignored because the 3D canvas is opaque. */
export function labPlanes(image: RgbaImage): LabPlanes {
  const n = image.width * image.height;
  const planes = { width: image.width, height: image.height, l: new Float32Array(n), a: new Float32Array(n) };
  const out: LabPlanes = { ...planes, b: new Float32Array(n), y: new Float32Array(n) };
  for (let p = 0; p < n; p++) {
    const [r8, g8, b8] = [image.data[p * 4] ?? 0, image.data[p * 4 + 1] ?? 0, image.data[p * 4 + 2] ?? 0];
    [out.l[p], out.a[p], out.b[p]] = oklab(r8, g8, b8);
    out.y[p] = 0.2126 * (LINEAR[r8] ?? 0) + 0.7152 * (LINEAR[g8] ?? 0) + 0.0722 * (LINEAR[b8] ?? 0);
  }
  return out;
}
