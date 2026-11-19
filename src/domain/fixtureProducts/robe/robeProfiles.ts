import type { FixtureProduct } from '../FixtureProduct';

/**
 * The Robe LED profile heads of the catalogue (base type `spot`), in catalogue order. Each body is in FORTE model
 * units (src/render/fixtures/models/forteHead.ts): barrel and ax are the FORTE's, the lens is the sheet's output lens
 * over the FORTE's 180 mm, size = TYPES.spot.size 0.72 * height / 843 (ADR 0007). `span` and `mountHeight` are
 * measured from the built model and pinned by tests/unit/render/fixtures/productSpans.test.ts.
 */
export const ROBE_PROFILES = {
  // Robe "PAINTE" data sheet 4/16/2026: zoom 8°-48° (6:1), lens 110 mm, 15,200 lm integrating sphere (HP engine;
  // 12,250 lm goniophotometer), pan 540°, tilt 270°, 619 x 367 x 219 mm (head vertical), 19.6 kg, max. 440 W.
  'robe-painte': {
    id: 'robe-painte',
    brand: 'Robe',
    name: 'Painte',
    category: 'spot',
    base: 'spot',
    // power = Painte 15,200 lm / FORTE 50,000 lm (both integrating sphere, HP engines) = 0.3
    optics: { zr: [8, 48], power: 0.3 },
    // lens 110/180 of the FORTE's; ribs as the FORTE's (ribbed rear underside in the sheet photo); size 0.529
    body: {
      family: 'mover',
      ref: 'forte',
      size: 0.529,
      ax: 0.43,
      barrel: { r: 0.335, rear: 0.45, front: -0.78 },
      lens: { r: 0.144, y: 0.772, off: 0.78 },
      ribs: [0.12, 0.17, 0.22, 0.27],
      face: 'rings',
    },
    dimensions: { h: 619, w: 367, d: 219 },
    span: 0.989,
    mountHeight: { hang: 0.577, floor: 0.577 },
    dataSheet: 'https://www.robe.cz/api/robe/pdfs/en/product/4887 (Robe data sheet "PAINTE" 4/16/2026)',
    unmodelled: ['colour wheel', 'static gobo wheel', 'framing shutters', 'prism', 'iris', 'frost', 'engine choice'],
  },
  // Robe "T1 Profile" data sheet 10/23/2026: zoom 7°-49° (7:1), lens 140 mm, 12,600 lm integrating sphere (10,075 lm
  // goniophotometer), pan 540°, tilt 265°, 726 x 400 x 258 mm (head vertical), 24.3 kg, max. 750 W, MSL 550 W engine.
  'robe-t1-profile': {
    id: 'robe-t1-profile',
    brand: 'Robe',
    name: 'T1 Profile',
    category: 'spot',
    base: 'spot',
    // power = T1 Profile 12,600 lm / FORTE 50,000 lm (both integrating sphere) = 0.25
    optics: { zr: [7, 49], power: 0.25 },
    // lens 140/180 of the FORTE's; no ribs (a smooth barrel in the sheet photo); size 0.62
    body: {
      family: 'mover',
      ref: 'forte',
      size: 0.62,
      ax: 0.43,
      barrel: { r: 0.335, rear: 0.45, front: -0.78 },
      lens: { r: 0.183, y: 0.772, off: 0.78 },
      face: 'rings',
    },
    dimensions: { h: 726, w: 400, d: 258 },
    span: 1.159,
    mountHeight: { hang: 0.676, floor: 0.676 },
    dataSheet: 'https://www.robe.cz/api/robe/pdfs/en/product/654 (Robe data sheet "T1 Profile" 10/23/2026)',
    unmodelled: ['CCT/CRI/green', 'animation wheel', 'prism', 'framing shutters', 'iris', 'frosts', 'split colour'],
  },
  // Robe "T2 Profile" data sheet 4/21/2026: zoom 5°-55° (11:1), lens 180 mm, 22,000 lm integrating sphere (17,600 lm
  // goniophotometer), pan 540°, tilt 270°, 802 x 483 x 335 mm (head vertical), 36.9 kg, max. 1150 W, MSL 850 W engine.
  'robe-t2-profile': {
    id: 'robe-t2-profile',
    brand: 'Robe',
    name: 'T2 Profile',
    category: 'spot',
    base: 'spot',
    // power = T2 Profile 22,000 lm / FORTE 50,000 lm (both integrating sphere) = 0.44
    optics: { zr: [5, 55], power: 0.44 },
    // the FORTE's 180 mm lens; no ribs (a smooth barrel in the sheet photo); size 0.685
    body: {
      family: 'mover',
      ref: 'forte',
      size: 0.685,
      ax: 0.43,
      barrel: { r: 0.335, rear: 0.45, front: -0.78 },
      lens: { r: 0.235, y: 0.772, off: 0.78 },
      face: 'rings',
    },
    dimensions: { h: 802, w: 483, d: 335 },
    span: 1.281,
    mountHeight: { hang: 0.747, floor: 0.747 },
    dataSheet: 'https://www.robe.cz/api/robe/pdfs/en/product/4311 (Robe data sheet "T2 Profile" 4/21/2026)',
    unmodelled: [
      'CCT/CRI/green',
      'static gobo wheel',
      'animation wheel',
      'prisms',
      'framing shutters',
      'iris',
      'frosts',
      'split colour',
    ],
  },
} as const satisfies Record<string, FixtureProduct>;
