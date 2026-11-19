import type { FixtureType, FixtureTypeId } from '../FixtureType';
import type { MountHeight } from '../fixtureTypes/mountHeights';
import type { MoverBody } from './bodies/moverBody';
import type { TiltBarBody } from './bodies/tiltBarBody';
import type { YokedCanBody } from './bodies/yokedCanBody';

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

export type { MoverBody } from './bodies/moverBody';
export type { TiltBarBody } from './bodies/tiltBarBody';
export type { YokedCanBody } from './bodies/yokedCanBody';

/** Every body family a product can be drawn with; other families join the union as they land. */
export type ProductBody = MoverBody | TiltBarBody | YokedCanBody;

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
  /** Data-sheet size in millimetres (height, width, depth, as the sheet states them); feeds the size rule. */
  readonly dimensions: { readonly h: number; readonly w: number; readonly d: number };
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
  /** Set only when the manufacturer lists the product as discontinued; the library card shows a badge. */
  readonly discontinued?: true;
}
