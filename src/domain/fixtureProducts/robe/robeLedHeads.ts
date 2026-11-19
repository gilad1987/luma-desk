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
  // Robe "LEDBeam 350" data sheet 5/18/2026: 12x 40 W RGBW multichips, zoom 3.8°-60° (15.5:1), 8,200 lm integrating
  // sphere / 6,574 lm goniophotometer, max. 450 W, 426 x 320 x 220 mm head vertical. User manual drawings: 12 cells
  // (4 inner, a 2x2 group split by a cross, and 8 outer segments, a round lens in each) in a bezel Ø217 with a thick
  // ring on a box-like head with rear vent slots, front 116 mm and rear 104 mm from the tilt axis.
  'robe-ledbeam-350': {
    id: 'robe-ledbeam-350',
    brand: 'Robe',
    name: 'LEDBeam 350',
    category: 'wash',
    base: 'wash',
    // zoom from the sheet; power = TYPES.wash.power 0.9 * LEDBeam 350 8,200 lm / Spiider 13,700 lm (both integrating
    // sphere) = 0.54
    optics: { zr: [3.8, 60], power: 0.54 },
    // model units, the Spiider drum the reference; the box head is drawn as a round drum. Front and rear are 116 and
    // 104 over the tilt axis's 310 mm above the base bottom (426 - 116), on the shared 1.09; ax and size are tuned so
    // the hung span meets the size rule (1.063 * 426 / 477 = 0.949 m) and the hung width / height meets 320 / 426.
    body: {
      family: 'mover',
      ref: 'spiider',
      size: 0.633,
      ax: 0.46,
      barrel: { r: 0.4, rear: 0.366, front: -0.408 },
      lens: { r: 0.35, y: 0.398, off: 0.408 },
      vents: true,
      // inner 2x2 drawn as a ring of 4: the painter draws concentric rings only
      face: { cells: [4, 8] },
    },
    dimensions: { h: 426, w: 320, d: 220 },
    // measured from the built model and pinned by tests/unit/render/fixtures/productSpans.test.ts
    span: 0.948,
    mountHeight: { hang: 0.69, floor: 0.69 },
    dataSheet:
      'https://www.robe.cz/ledbeam-350 (Robe data sheet "LEDBeam 350" 5/18/2026, https://cdn.aws.robe.cz/print/en_product_4349.pdf)',
    unmodelled: [
      'virtual colour wheel and DataSwatch presets',
      'tungsten lamp emulation',
      'strobe and pulse effects',
      'Cpulse flicker-free mode',
      'optional Fresnel-wash diffuser',
      'eggcrate',
      'cell layout approximate (inner 2x2 drawn as a ring)',
    ],
  },
} as const satisfies Record<string, FixtureProduct>;
