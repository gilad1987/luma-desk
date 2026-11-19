import type { FixtureProduct } from '../FixtureProduct';

/** The Robe effect heads of the catalogue, in catalogue order. */
export const ROBE_EFFECTS = {
  // Robe "TetraX" data sheet (en_product_4889): 9x 40 W RGBW LED multichips, zoom 4°-45°, 5,300 lm (integrating
  // sphere; 4,225 lm goniophotometer), pan 540° with continuous rotation, tilt 191°, 368 x 512 x 205 mm (depth with
  // the head horizontal), 15.7 kg. Shape: User_manual_Robin_Tetra_X.pdf p32 (views) and p14 (pixel order).
  'robe-tetrax': {
    id: 'robe-tetrax',
    brand: 'Robe',
    name: 'TetraX',
    category: 'bar',
    base: 'wash',
    // zoom from the sheet; power = wash 0.9 * TetraX 5,300 lm / Spiider 13,700 lm (both integrating sphere) = 0.348
    optics: { zr: [4, 45], power: 0.348 },
    // model units of 512 mm (the bar length), from the UM p32 views: tilt axis 267 mm above the base bottom, head
    // 71 mm behind it and 92 mm + a 9 mm proud frame in front, head 104 mm thick, front face 512 x 119 mm, base
    // 414 mm with handles x 104 x 205 mm, crossbar 112-180 mm high, arms 18 mm, 9 cells 53 mm on a 56 mm pitch;
    // size = BODY_SPANS.wash 1.063 * 512 / 477 (Spiider height) = 1.141 m over a 1-unit span.
    body: {
      family: 'tiltBar',
      size: 1.141,
      base: { w: 0.809, h: 0.203, d: 0.4, y: 0.521 },
      yoke: { y: 0.17, h: 0.133, d: 0.225, arm: 0.035, neck: 0.098 },
      head: { w: 0.93, d: 0.203, rear: 0.139, front: -0.18 },
      frame: { d: 0.232, proud: 0.017 },
      cells: { count: 9, pitch: 0.109, w: 0.104 },
      lens: { w: 0.979, h: 0.107, off: 0.193 },
    },
    dimensions: { h: 368, w: 512, d: 205 },
    // measured from the built model and pinned by tests/unit/render/fixtures/productSpans.test.ts
    span: 1.141,
    mountHeight: { hang: 0.594, floor: 0.594 },
    dataSheet: 'https://www.robe.cz/tetrax (Robe data sheet https://cdn.aws.robe.cz/print/en_product_4889.pdf)',
    unmodelled: [
      '9 pixel cells and pixel effects',
      '3 flower effects',
      'continuous pan rotation',
      'virtual colour library',
      'cell layout single row, one beam',
      'tilt range 191° (the desk tilts to ±135°; past about ±115° the head passes through the yoke)',
    ],
  },
} as const satisfies Record<string, FixtureProduct>;
