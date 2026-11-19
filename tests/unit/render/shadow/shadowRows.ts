import { ROW } from '../../../../src/render/beams/packBeam';

/** One spot beam for a test row; unset fields give a white beam straight down from 8 m. */
export interface TestBeam {
  origin?: readonly [number, number, number];
  axis?: readonly [number, number, number];
  length?: number;
  tan?: number;
  peak?: number;
  lens?: number;
}

/** Writes a beam into its instance row, with the layout of `packBeam.ts`. */
export function setRow(rows: Float32Array, light: number, beam: TestBeam): void {
  const { origin = [0, 8, 0], axis = [0, -1, 0], length = 8, tan = 0.2, peak = 1, lens = 0.1 } = beam;
  const norm = Math.hypot(...axis);
  rows.set([...origin, length, axis[0] / norm, axis[1] / norm, axis[2] / norm, tan, peak, peak, peak], light * ROW);
  rows[light * ROW + 14] = lens;
}

/** Rows of `count` beams straight down, one metre apart on x. */
export function beamRows(count: number, beam: TestBeam = {}): Float32Array {
  const rows = new Float32Array(count * ROW);
  for (let i = 0; i < count; i++) setRow(rows, i, { ...beam, origin: [i, 8, 0] });
  return rows;
}
