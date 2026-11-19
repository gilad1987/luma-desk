/**
 * The parametric body of a moving head drawn on the Robe base and yoke. All lengths are model units, scaled by
 * `size` like a native model, so one family builder draws every mover product from these numbers.
 */
export interface MoverBody {
  readonly family: 'mover';
  /** The native Robe head whose lathe profile the family scales. */
  readonly ref: 'forte' | 'megapointe' | 'spiider';
  /** Metres per model unit (`FixtureType.size`). */
  readonly size: number;
  /** Yoke arm offset from the pan axis, model units. */
  readonly ax: number;
  /** Barrel radius at the tilt axis; y of the rear cap and of the lens face (negative = towards the lens). */
  readonly barrel: { readonly r: number; readonly rear: number; readonly front: number };
  /** Lens radius, y of its face, and the group-origin-to-lens-face offset (`BuiltModel.lensOff`). */
  readonly lens: { readonly r: number; readonly y: number; readonly off: number };
  /** y of each cooling rib ring; none for a smooth barrel. */
  readonly ribs?: readonly number[];
  /** Side vent grilles on the head. */
  readonly vents?: boolean;
  /** Lens face painter: 'rings' (one front lens over zoom optics), 'hotspot' (short-arc beam). */
  readonly face: 'rings' | 'hotspot';
}
