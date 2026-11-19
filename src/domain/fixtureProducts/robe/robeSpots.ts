import type { FixtureProduct } from '../FixtureProduct';

/** The Robe spot heads of the catalogue (base type `spot`), in catalogue order. */
export const ROBE_SPOTS = {
  // Robe "iFORTE" data sheet 10/8/2026: zoom 5°-55° (11:1; its intro text says 5.5°-55°), lens 180 mm, 50,000 lm
  // integrating sphere (HP engine; 40,000 lm goniophotometer), pan 540°, tilt 270°, 837 x 480 x 335 mm (head
  // vertical), 42.5 kg, max. 1250 W, iSE-TE 1000 W white LED engine (HP or HCF), CMY + variable CTO, IP65.
  'robe-iforte': {
    id: 'robe-iforte',
    brand: 'Robe',
    name: 'iFORTE',
    category: 'spot',
    base: 'spot',
    // zoom from the sheet; power = iFORTE 50,000 lm / FORTE 50,000 lm (both integrating sphere, HP engines) = 1.0
    optics: { zr: [5, 55], power: 1.0 },
    // model units; the FORTE head is the reference and the iFORTE is drawn as it: barrel, ax, ribs (ribbed rear
    // underside in the sheet photo) and the 180 mm lens are the FORTE's; size = 0.72 * 837 / 843 = 0.715.
    body: {
      family: 'mover',
      ref: 'forte',
      size: 0.715,
      ax: 0.43,
      barrel: { r: 0.335, rear: 0.45, front: -0.78 },
      lens: { r: 0.235, y: 0.772, off: 0.78 },
      ribs: [0.12, 0.17, 0.22, 0.27],
      face: 'rings',
    },
    dimensions: { h: 837, w: 480, d: 335 },
    // measured from the built model and pinned by tests/unit/render/fixtures/productSpans.test.ts
    span: 1.337,
    mountHeight: { hang: 0.779, floor: 0.779 },
    dataSheet: 'https://www.robe.cz/api/robe/pdfs/en/product/5260 (Robe data sheet "iFORTE" 10/8/2026)',
    unmodelled: [
      'variable CTO',
      'colour wheels',
      'second rotating gobo wheel',
      'animation wheel',
      'prisms',
      'framing shutters',
      'iris',
      'frosts',
      'hot-spot lens',
      'HP/HCF engine choice',
    ],
  },
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
    // model units; the FORTE head (src/render/fixtures/models/forteHead.ts) is the reference. The barrel radius and
    // length, ax and the ribs are the FORTE's, because the sheets give no barrel diameter; the lens is 150/180 of the
    // FORTE's; size = TYPES.spot.size 0.72 * 733 / 843 = 0.626 from the height ratio (drawn at the desk's scale
    // relative to the base model, see ADR 0007).
    body: {
      family: 'mover',
      ref: 'forte',
      size: 0.626,
      ax: 0.43,
      barrel: { r: 0.335, rear: 0.45, front: -0.78 },
      lens: { r: 0.196, y: 0.772, off: 0.78 },
      ribs: [0.12, 0.17, 0.22, 0.27],
      face: 'rings',
    },
    dimensions: { h: 733, w: 443, d: 264 },
    // measured from the built model and pinned by tests/unit/render/fixtures/productSpans.test.ts
    span: 1.171,
    mountHeight: { hang: 0.682, floor: 0.682 },
    dataSheet: 'https://www.robe.cz/esprite (Robe data sheets "Esprite" 27.11.2019 and "ESPRITE FS" 4/16/2026)',
    unmodelled: [
      'colour wheels',
      'static gobo wheel',
      'variable CTO',
      'framing shutters',
      'animation wheel',
      'prism',
      'iris',
      'frosts',
    ],
  },
} as const satisfies Record<string, FixtureProduct>;
