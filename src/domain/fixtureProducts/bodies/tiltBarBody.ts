/**
 * The parametric body of a tilting bar head on a panning yoke: a low base, a crossbar yoke with an arm at each end of
 * the bar, and a box head with one row of cells behind a proud front frame. All lengths are model units, scaled by
 * `size`, in the hang orientation: base up (+y), tilt axis at the origin, lens facing -y, bar along x.
 */
export interface TiltBarBody {
  readonly family: 'tiltBar';
  /** Metres per model unit (`FixtureType.size`). */
  readonly size: number;
  /** Base width with its handles, height with its feet, depth, and y of its top (the hung mounting face). */
  readonly base: { readonly w: number; readonly h: number; readonly d: number; readonly y: number };
  /** Crossbar: y of its head side, height and depth; arm thickness (x) and arm neck width (z) at the tilt axis. */
  readonly yoke: {
    readonly y: number;
    readonly h: number;
    readonly d: number;
    readonly arm: number;
    readonly neck: number;
  };
  /** Head length between the arms, thickness (z), y of its rounded rear and of its front face (negative). */
  readonly head: { readonly w: number; readonly d: number; readonly rear: number; readonly front: number };
  /** Front frame depth (z) and how far it stands proud of the head face; it spans the whole bar length. */
  readonly frame: { readonly d: number; readonly proud: number };
  /** The one row of cells: count, pitch and cell width along the bar. */
  readonly cells: { readonly count: number; readonly pitch: number; readonly w: number };
  /** Flat lens size over the cell row, and the group-origin-to-lens-face offset (`BuiltModel.lensOff`). */
  readonly lens: { readonly w: number; readonly h: number; readonly off: number };
}
