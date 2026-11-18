import type { Mat4 } from '../math/Mat4';

/** What a placement of an empty Symdef is taken to be. `unknown` is counted and reported, and never drawn. */
export type ProxyKind = 'panel' | 'seat' | 'unknown';

/**
 * One placement of a Symdef that has no geometry in the file, as the scene states it. CAD writers leave LED tiles and
 * audience chairs as such Symdefs placed thousands of times; the record keeps every one of them, with nothing guessed.
 */
export interface ProxyPlacement {
  /** Uuid of the empty `<Symdef>`. */
  readonly symdef: string;
  /** The `name` of the `<Symdef>`, empty when it has none. */
  readonly symdefName: string;
  /** The owning object's `name`, empty when it has none. */
  readonly name: string;
  /** Uuid of the `<Layer>` the owning object sits in. */
  readonly layer: string;
  readonly layerName: string;
  /** Symbol to world: MVR frame, millimetres, Z up, with every parent and symbol matrix already applied. */
  readonly matrix: Mat4;
}

/**
 * A `ProxyPlacement` with what the import inferred about it. The file states only the placement; `kind`, `pitch` and
 * `frame` are inferences from names and spacing (`classifyProxies`), which `inferred` says to every later reader.
 */
export interface MvrProxy extends ProxyPlacement {
  readonly kind: ProxyKind;
  readonly inferred: true;
  /** What decided `kind`: a name word, the spacing of the placements, or nothing (`unknown`). */
  readonly evidence: 'name' | 'spacing' | 'none';
  /**
   * `stacked` when an earlier placement of the same Symdef and layer is at the same place (to 1 mm): CAD files stack
   * copies, and drawing each copy would only draw the same proxy again. Such a placement is `unknown`: counted, not
   * drawn.
   */
  readonly reason?: 'stacked';
  /** Measured distance to the nearest placement of the same Symdef and layer, millimetres; absent when alone. */
  readonly pitch?: number;
  /**
   * Where the proxy is drawn: MVR frame, millimetres, no scale. A panel has X and Y in the grid plane and Z along
   * its normal; a seat has X along the row, Y toward the stage and Z up. Absent for `unknown`.
   */
  readonly frame?: Mat4;
}

/** A seat proxy for the audience: where it stands and which way it looks, in the MVR frame (millimetres, Z up). */
export interface SeatProxy {
  readonly position: readonly [number, number, number];
  /** Unit vector the seat looks along; horizontal. */
  readonly facing: readonly [number, number, number];
  /** Uuid of the seat's `<Layer>`. */
  readonly layer: string;
}
