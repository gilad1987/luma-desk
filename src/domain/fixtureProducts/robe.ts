import type { FixtureProduct } from './FixtureProduct';

/**
 * The Robe products of the catalogue, checked against the Robe data sheets. The base type `spot` copies the Robe
 * FORTE: FORTE FS data sheet 4/16/2026, https://cdn.aws.robe.cz/print/en_product_4251.pdf: height 843 mm head
 * vertical, width 483.5 mm, depth 335 mm, TE 1000 W HP engine 50,000 lm integrating sphere / 40,000 lm
 * goniophotometer, lens 180 mm, zoom 5-55°.
 */
export const ROBE_PRODUCTS = {
  // Robe "Esprite" data sheet 27.11.2019 and "ESPRITE FS" data sheet 4/16/2026: zoom 5.5°-50° (9:1), lens 150 mm,
  // up to 27,000 lm (goniophotometer, HP engine; 34,000 lm integrating sphere), pan 540°, tilt 265°,
  // 733 x 443 x 264 mm (head vertical), 27.8 kg, 650 W white LED engine, CMY + variable CTO.
  'robe-esprite': {
    id: 'robe-esprite',
    brand: 'Robe',
    name: 'Esprite',
    category: 'spot',
    base: 'spot',
    // zoom from the sheet; power = Esprite 34,000 lm / FORTE 50,000 lm (both integrating sphere, HP engines) = 0.68
    optics: { zr: [5.5, 50], power: 0.68 },
    // model units; the FORTE head (src/render/fixtures/models/forteHead.ts) is the reference, lens 150/180 of the
    // FORTE's; size = TYPES.spot.size 0.72 * 733 / 843 = 0.626 (drawn at the desk's scale relative to the base
    // model, see ADR 0007). The barrel is slimmer than the FORTE's by the sheets' depth-to-height ratios
    // (264/733 over 335/843 = 0.91): 0.335 * 0.91 = 0.305. Barrel length, ax and ribs stay the FORTE's.
    body: {
      family: 'mover',
      size: 0.626,
      ax: 0.43,
      barrel: { r: 0.305, rear: 0.45, front: -0.78 },
      lens: { r: 0.196, y: 0.772, off: 0.78 },
      ribs: [0.12, 0.17, 0.22, 0.27],
      face: 'rings',
    },
    // measured from the built model and pinned by tests/unit/render/fixtures/productSpans.test.ts
    span: 1.171,
    mountHeight: { hang: 0.682, floor: 0.682 },
    dataSheet: 'https://www.robe.cz/esprite (Robe data sheets "Esprite" 27.11.2019 and "ESPRITE FS" 4/16/2026)',
    unmodelled: ['colour wheels', 'framing shutters', 'animation wheel', 'prism', 'iris', 'frosts'],
  },
} as const satisfies Record<string, FixtureProduct>;
