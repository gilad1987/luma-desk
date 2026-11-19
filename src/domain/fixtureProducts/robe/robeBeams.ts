import type { FixtureProduct } from '../FixtureProduct';

/**
 * The Robe beam heads of the catalogue (base type `beam`, the MegaPointe: MegaPointe data sheet 7/21/2026,
 * https://cdn.aws.robe.cz/print/en_product_635.pdf: 640 x 396 x 230 mm head vertical, 20,375 lm "fixture total
 * lumen output", method not stated, lens 150 mm), in catalogue order.
 */
export const ROBE_BEAMS = {
  // Robe "Pointe" data sheet 1/20/2026: zoom 2.5°-10° beam application, 5°-20° spot application, lens 110 mm,
  // "fixture total lumen output" beam mode 9,870 lm (method not stated), spot mode 5,150 lm, 470 W at 230 V,
  // 575 mm head vertical x 365 x 250 mm, 15 kg, Osram Sirius HRI 280 W lamp. Discontinued (robe.cz/pointe).
  'robe-pointe': {
    id: 'robe-pointe',
    brand: 'Robe',
    name: 'Pointe',
    category: 'hybrid',
    base: 'beam',
    // zoom from beam-mode min to spot-mode max; power = TYPES.beam.power 1.2 * Pointe 9,870 lm / MegaPointe 20,375 lm
    // = 0.58: both are "fixture total" figures and neither sheet states the measuring method
    optics: { zr: [2.5, 20], power: 0.58 },
    // model units; the MegaPointe head (src/render/fixtures/models/megapointeHead.ts) is the reference: a short, fat
    // head with a thick front ring round a deep lens and side vents (robe.cz/pointe photos). The lens is 110/150 of
    // the MegaPointe's; ax, barrel radius and length are tuned so the hung span meets the size rule (0.94 * 575 / 640
    // = 0.845 m) and the hung width / height meets 365 / 575 (productProportions.test.ts), as the sheet gives no
    // barrel diameter. The lens sits 0.062 behind the front, the MegaPointe's 0.085 recess scaled by the lens radius
    // (0.198 / 0.27), so its hot spot shows at a slant as the native one does (mover.test.ts).
    body: {
      family: 'mover',
      ref: 'megapointe',
      size: 0.5,
      ax: 0.43,
      barrel: { r: 0.35, rear: 0.4, front: -0.6 },
      lens: { r: 0.198, y: 0.538, off: 0.6 },
      vents: true,
      face: 'hotspot',
    },
    dimensions: { h: 575, w: 365, d: 250 },
    // measured from the built model and pinned by tests/unit/render/fixtures/productSpans.test.ts
    span: 0.845,
    mountHeight: { hang: 0.545, floor: 0.545 },
    dataSheet:
      'https://www.robe.cz/pointe (Robe data sheet "Pointe" 1/20/2026, https://www.robe.cz/api/robe/pdfs/en/product/2)',
    unmodelled: [
      'colour wheel',
      'rotating gobo wheel',
      'static gobo wheel',
      'beam reducers',
      'prisms',
      'frost',
      'beam / spot mode switch',
    ],
    discontinued: true,
  },
} as const satisfies Record<string, FixtureProduct>;
