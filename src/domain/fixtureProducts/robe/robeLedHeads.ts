import type { FixtureProduct } from '../FixtureProduct';

/**
 * The Robe LED wash-beam heads of the catalogue (base type `wash`, the Spiider: Spiider data sheet 5/20/2026,
 * https://cdn.aws.robe.cz/print/en_product_667.pdf: 477 x 390 x 252 mm, 13,700 lm integrating sphere / 11,000 lm
 * goniophotometer, zoom 4°-50°), in catalogue order.
 */
export const ROBE_LED_HEADS = {
  // Robe "LEDBeam 150" data sheet 5/13/2026: 7x 40 W RGBW multichips, zoom 3.8°-60° (15.5:1), 3,550 lm integrating
  // sphere / 2,842 lm goniophotometer, max. 220 W, 337 x 244 x 149 mm, 5.7 kg. User manual p24 drawings: 7 cells
  // (centre hexagon and a ring of 6, a round lens in each) in a round bezel Ø158 on a round drum head, tilt axis
  // 250 mm above the base bottom, front 87-120 mm from the axis.
  'robe-ledbeam-150': {
    id: 'robe-ledbeam-150',
    brand: 'Robe',
    name: 'LEDBeam 150',
    category: 'wash',
    base: 'wash',
    // zoom from the sheet; power = TYPES.wash.power 0.9 * LEDBeam 150 3,550 lm / Spiider 13,700 lm (both integrating
    // sphere) = 0.23
    optics: { zr: [3.8, 60], power: 0.23 },
    // model units; the Spiider drum (src/render/fixtures/models/spiiderHead.ts) is the reference. The drum is cut
    // shorter and narrower than the Spiider's (front 0.4 over the 1.09 axis-to-base of the shared base, as 87-120 over
    // 250 mm; bezel 0.65 of the half width, as 79 over 122 mm); ax and size are tuned so the hung span meets the size
    // rule (1.063 * 337 / 477 = 0.751 m) and the hung width / height meets 244 / 337 (productProportions.test.ts).
    body: {
      family: 'mover',
      ref: 'spiider',
      size: 0.504,
      ax: 0.42,
      barrel: { r: 0.34, rear: 0.3, front: -0.4 },
      lens: { r: 0.3, y: 0.39, off: 0.4 },
      ribs: [-0.21, -0.16, -0.11],
      face: { cells: [1, 6] },
    },
    dimensions: { h: 337, w: 244, d: 149 },
    // measured from the built model and pinned by tests/unit/render/fixtures/productSpans.test.ts
    span: 0.751,
    mountHeight: { hang: 0.549, floor: 0.549 },
    dataSheet:
      'https://www.robe.cz/ledbeam-150 (Robe data sheet "LEDBeam 150" 5/13/2026, https://cdn.aws.robe.cz/print/en_product_668.pdf)',
    unmodelled: [
      'virtual colour wheel and DataSwatch presets',
      'variable CTO',
      'tungsten lamp emulation',
      'strobe and pulse effects',
      'optional Fresnel-wash diffuser',
      'eggcrate',
    ],
  },
} as const satisfies Record<string, FixtureProduct>;
