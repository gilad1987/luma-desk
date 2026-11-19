import { toThree, type MvrProxy } from '../../../mvr/index';

export type V3 = readonly [number, number, number];

/** Where one square LED panel is, in the three frame and metres, before the stage offset. */
export interface PanelPose {
  readonly position: V3;
  /** The two unit edges of the face. */
  readonly x: V3;
  readonly z: V3;
  /** Unit normal of the face; the file does not say which side is the front. */
  readonly normal: V3;
  /** Edge length in metres. */
  readonly pitch: number;
  /** Uuid of the panel's layer, when it has one. */
  readonly layer?: string;
  /**
   * The second spacing of the panel's grid, for a tile that is not square: the unit direction across the nearest
   * neighbour and the distance to the next panel that way (`withGridSpacing`). Absent for a square grid.
   */
  readonly across?: { readonly along: V3; readonly pitch: number };
}

export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const unit = (a: V3): V3 => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

/** Column `at` of a column-major 4x4 matrix. */
const column = (m: ArrayLike<number>, at: number): V3 => [m[at] ?? 0, m[at + 1] ?? 0, m[at + 2] ?? 0];

/** The pose of a drawn panel proxy: its frame has the face in three XZ and the normal along Y (`proxyGeometry`). */
export function proxyPose(proxy: MvrProxy): PanelPose | undefined {
  if (proxy.kind !== 'panel' || !proxy.frame || proxy.pitch === undefined) return undefined;
  const m = toThree(proxy.frame);
  return {
    position: column(m, 12),
    x: unit(column(m, 0)),
    normal: unit(column(m, 4)),
    z: unit(column(m, 8)),
    pitch: proxy.pitch / 1000,
    layer: proxy.layer,
  };
}

/** The layers of `panels`, each once, in panel order; empty when none brings a layer. */
export function panelLayers(panels: readonly PanelPose[]): string[] {
  return [...new Set(panels.flatMap(({ layer }) => (layer === undefined ? [] : [layer])))];
}
