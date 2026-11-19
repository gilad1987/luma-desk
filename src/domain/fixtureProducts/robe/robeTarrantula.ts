import type { FixtureProduct } from '../FixtureProduct';

/**
 * The Robe Tarrantula, an LED pixel wash-beam head on the base type `wash` (the Spiider, see `robeLedHeads.ts`), in
 * the catalogue right after the LED heads.
 */
export const ROBE_TARRANTULA = {
  // Robe "Tarrantula" data sheet 7/21/2026: 1x 60 W + 36x 40 W RGBW multichips, zoom 4°-50° (12.5:1), 25,200 lm
  // integrating sphere / 21,358 lm goniophotometer, 1,000 W, 587 x 508 x 257 mm. User manual p15 and p34 drawings:
  // 37 cells (centre, a hexagon ring of 6, then rings of 12 and 18, a round lens in each) on a round head Ø~380, 225.6
  // mm deep, front about 90 mm and rear about 130 mm from the tilt axis, about 397 mm above the base bottom.
  'robe-tarrantula': {
    id: 'robe-tarrantula',
    brand: 'Robe',
    name: 'Tarrantula',
    category: 'wash',
    base: 'wash',
    // zoom from the sheet (the user manual gives 4° at 1/2 peak and 50° at 1/10 peak, so the range mixes a beam and a
    // field angle); power = TYPES.wash.power 0.9 * Tarrantula 25,200 lm / Spiider 13,700 lm (both integrating sphere)
    // = 1.66
    optics: { zr: [4, 50], power: 1.66 },
    // model units, the Spiider drum the reference: radius 190 over the 397 mm tilt axis height, on the shared 1.09.
    // The sheet's 587 mm is drawn head horizontal (axis + radius), but the desk measures the head vertical, so the
    // front is stretched to about the radius and the rear cut to keep the drum about 226 mm deep; ax and size are
    // tuned so the hung span meets the size rule (1.063 * 587 / 477 = 1.308 m) and the width / height meets 508 / 587.
    body: {
      family: 'mover',
      ref: 'spiider',
      size: 0.823,
      ax: 0.6,
      barrel: { r: 0.52, rear: 0.2, front: -0.5 },
      lens: { r: 0.47, y: 0.49, off: 0.5 },
      vents: true,
      face: { cells: [1, 6, 12, 18] },
    },
    dimensions: { h: 587, w: 508, d: 257 },
    // measured from the built model and pinned by tests/unit/render/fixtures/productSpans.test.ts
    span: 1.309,
    mountHeight: { hang: 0.897, floor: 0.897 },
    dataSheet:
      'https://www.robe.cz/tarrantula (Robe data sheet "Tarrantula" 7/21/2026, https://cdn.aws.robe.cz/print/en_product_666.pdf)',
    unmodelled: [
      '37 individually controlled pixel cells and pixel effects',
      'MCFE multi-coloured flower effect',
      'virtual colour wheel',
      'tungsten lamp emulation',
      'optional beam shaper',
      'EMS motion stabiliser',
    ],
  },
} as const satisfies Record<string, FixtureProduct>;
