/**
 * The data-sheet size of the Robe fixture each base type copies, for the size rule in productSizes.test.ts. Test data
 * only (rule T21: no production code reads it). Millimetres as the sheet states them; `largest` is the dimension the
 * size rule divides by, and `pose` is the pose the sheet (or its user manual drawing) gives that dimension in.
 */
export type BaseSheet = {
  readonly fixture: string;
  readonly h: number;
  readonly w: number;
  readonly d: number;
  /** The base's largest dimension; for `par` the depth with the hanging bracket, which the native par model draws. */
  readonly largest: number;
  readonly url: string;
} & (
  | /** Head vertical, as the desk hangs the native model at rest: the size rule scales from `BODY_SPANS[base]`. */
    { readonly pose: 'vertical' }
  | {
      /** Head tilted level (tilt joint -90°): the size rule scales from the native model's span in that pose. */
      readonly pose: 'forward';
      /** The native model's largest dimension head-forward, in metres; productProportions.test.ts pins it. */
      readonly forwardSpan: number;
    }
);

/** The base sheet of every base type a catalogue product uses today. */
export const BASE_SHEETS: Readonly<Record<'spot' | 'beam' | 'wash' | 'par', BaseSheet>> = {
  // FORTE data sheet 4/16/2026: 843 mm head vertical, 483.5 mm wide, 335 mm deep
  spot: {
    fixture: 'Robe FORTE',
    h: 843,
    w: 483.5,
    d: 335,
    largest: 843,
    pose: 'vertical',
    url: 'https://cdn.aws.robe.cz/print/en_product_4220.pdf',
  },
  // MegaPointe data sheet 7/21/2026: 640 mm head vertical (user manual p42: 638.2 head vertical, 508.6 head-forward),
  // 396 mm wide, 230 mm deep
  beam: {
    fixture: 'Robe MegaPointe',
    h: 640,
    w: 396,
    d: 230,
    largest: 640,
    pose: 'vertical',
    url: 'https://cdn.aws.robe.cz/print/en_product_635.pdf',
  },
  // Spiider data sheet 5/20/2026: 477 mm high, 390 mm wide, 252 mm deep, pose not stated; User_manual_Robin_Spiider.pdf
  // p34 draws the 476.2 mm height and the 389.9 mm width head-forward, lens to the front. The native Spiider measures
  // 1.17 m (its height) head-forward and 1.063 m (BODY_SPANS.wash, its width) hung at rest.
  wash: {
    fixture: 'Robe Spiider',
    h: 477,
    w: 390,
    d: 252,
    largest: 477,
    pose: 'forward',
    forwardSpan: 1.17,
    url: 'https://cdn.aws.robe.cz/print/en_product_667.pdf',
  },
  // ParFect 150 RGBA data sheet: 192 mm high, 240 mm wide, 392 mm deep without / 498 mm with the hanging bracket; a
  // static par, so 'vertical' is its hung-at-rest body
  par: {
    fixture: 'Robe ParFect 150 RGBA',
    h: 192,
    w: 240,
    d: 392,
    largest: 498,
    pose: 'vertical',
    url: 'https://cdn.aws.robe.cz/print/en_product_689.pdf',
  },
};
