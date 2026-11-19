import type { FixtureProduct } from '../FixtureProduct';

/** The Robe long-throw beam heads of the catalogue (base type `beam`, the MegaPointe; see robeBeams.ts). */
export const ROBE_BOLTS = {
  // Robe "iBOLT" data sheet 10/8/2026: zoom 0.4°-8.5° hard edge, up to 16° soft edge, lens 300 mm, "fixture total
  // lumen output" 26,800 lm integrating sphere (21,500 lm goniophotometer), 700 W, 830 x 542 x 392 mm head vertical,
  // 54.4 kg, pan 540° with continuous rotation, tilt 265°.
  'robe-ibolt': {
    id: 'robe-ibolt',
    brand: 'Robe',
    name: 'iBolt',
    category: 'beam',
    base: 'beam',
    // hard-edge zoom; power = TYPES.beam.power 1.2 * iBolt 26,800 lm / MegaPointe 20,375 lm = 1.578: the MegaPointe
    // sheet states no method, so the ratio may mix measures
    optics: { zr: [0.4, 8.5], power: 1.578 },
    // model units; a MegaPointe-class head with side vents (robe.cz/ibolt photos). The lens is 300/150 of the
    // MegaPointe's; barrel, front and ax are tuned so the hung span meets the size rule (0.94 * 830 / 640 = 1.219 m)
    // and the hung width / height meets 542 / 830, as the sheet gives no head size. The lens is sunk as deep per lens
    // radius as the MegaPointe one (0.085 / 0.27).
    body: {
      family: 'mover',
      ref: 'megapointe',
      size: 0.49,
      ax: 0.7,
      barrel: { r: 0.62, rear: 0.45, front: -1.4 },
      lens: { r: 0.54, y: 1.23, off: 1.4 },
      vents: true,
      face: 'hotspot',
    },
    dimensions: { h: 830, w: 542, d: 392 },
    // measured from the built model and pinned by tests/unit/render/fixtures/productSpans.test.ts
    span: 1.22,
    mountHeight: { hang: 0.534, floor: 0.534 },
    dataSheet:
      'https://www.robe.cz/ibolt (Robe data sheet "iBOLT" 10/8/2026, https://www.robe.cz/api/robe/pdfs/en/product/5444)',
    unmodelled: [
      'CMY',
      'colour wheel',
      'rotating gobo wheel',
      'static gobo wheel',
      'multi-level prisms',
      'SpektraBeam',
      'frost',
      'soft-edge zoom to 16°',
      'continuous pan rotation',
    ],
  },
} as const satisfies Record<string, FixtureProduct>;
