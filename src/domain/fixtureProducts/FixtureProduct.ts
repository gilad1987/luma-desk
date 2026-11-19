import type { FixtureType, FixtureTypeId } from '../FixtureType';
import type { MountHeight } from '../fixtureTypes/mountHeights';

/** Every library category a product can sit in; the library groups its cards by this list, in this order. */
export const PRODUCT_CATEGORIES = [
  'spot',
  'beam',
  'wash',
  'hybrid',
  'bar',
  'par',
  'strobe',
  'blinder',
  'profile',
  'tube',
] as const;

/** The library category of one product; it is display only, the behaviour comes from `FixtureProduct.base`. */
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Optical overrides; it cannot name moving, tiltOnly, shape, model, name or size, so a product keeps its base's. */
export type ProductOptics = Partial<
  Pick<FixtureType, 'attrs' | 'zr' | 'z0' | 'power' | 'beamK' | 'soft' | 'glowK' | 'defColor'>
>;

/**
 * The parametric body of a moving head drawn on the Robe base and yoke. All lengths are model units, scaled by
 * `size` like a native model, so one family builder draws every mover product from these numbers.
 */
export interface MoverBody {
  readonly family: 'mover';
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

/** Every body family a product can be drawn with; C2 adds tiltBar and yokedCan, C3 panel and tube. */
export type ProductBody = MoverBody;

/**
 * One real fixture of the catalogue, drawn and driven as its `base` type with its own optics and body. It is static
 * data: the merged `FixtureType` comes from `fixtureTypeOf`, so the native types and their goldens stay untouched.
 */
export interface FixtureProduct {
  /** Equals its key in `PRODUCTS`; kebab-case `<brand>-<model>`. Show format: never renamed. */
  readonly id: string;
  readonly brand: string;
  /** The model name without the brand; the merged type's name is `${brand} ${name}`. */
  readonly name: string;
  readonly category: ProductCategory;
  /** The native type the product behaves as; a stored fixture with this product always has this `type`. */
  readonly base: FixtureTypeId;
  readonly optics?: ProductOptics;
  /** `Manufacturer@Model.gdtf`, only when checked against a real GDTF file (Phase C5's MVR export will read it). */
  readonly gdtfSpec?: string;
  /** The DMX mode of `gdtfSpec`, only when checked against the same file. */
  readonly gdtfMode?: string;
  readonly body: ProductBody;
  /**
   * Drawn hung span in metres (largest dimension), pinned against the built model as BODY_SPANS. No reader until C5
   * (`bodyScale` for a product's own GDTF size).
   */
  readonly span: number;
  /** Drawn mounting-point distances, pinned against the built model as MOUNT_HEIGHTS. */
  readonly mountHeight: MountHeight;
  /** The manufacturer data sheet every number above was checked against (URL, title, date). */
  readonly dataSheet: string;
  /** Real features the desk does not model, for the library card ("single cell / approximate"). English. */
  readonly unmodelled: readonly string[];
}
