import type { FixtureProduct } from '../FixtureProduct';

/** The Robe retro dish lights of the catalogue (base type `par`), in catalogue order. */
export const ROBE_RETRO = {
  // Robe "onePATT" data sheet 7/22/2026 and "onePATT" user manual version 1.4 (May 31, 2022): one 40 W RGBW LED
  // multichip, 200 mm parabolic aluminium reflector with a half-ball diffuser dome, beam angle 58° (1/2 peak), field
  // angle 90° (1/10 peak), manual yoke with 360° tilt, M12 clamp hole, 321 x 309 x 150 mm (UM p7: 320.6 x 309.3 x
  // 149.7), 1.6 kg, RGBW or CMY, variable CTO 2,700-8,000 K, electronic strobe; no lumen figure published.
  'robe-onepatt': {
    id: 'robe-onepatt',
    brand: 'Robe',
    name: 'onePATT',
    category: 'par',
    base: 'par',
    // fixed beam from the manual; attrs stay the par's (the onePATT has dim, RGB and strobe); power stays the par's,
    // because Robe publishes no lumen figure for the onePATT
    optics: { zr: [58, 58], z0: 58 },
    // model units of 250 mm from the UM p7 drawings, tilt pivot at the origin: bezel Ø257.5 x 71 deep, 44 mm of it in
    // front of the pivot, bowl 42 deep, rear cylinder Ø91 x 37, reflector 200 mm, arch top 191.8 mm over the pivot
    // (320.6 - 257.5 / 2), arch tubes Ø11, T-knobs 309.3 mm apart. size = the size-rule target 0.395 m (0.613 * 321 /
    // 498, see ADR 0007) over the 1.2372-unit width, the largest dimension of the hung (beam down) body.
    body: {
      family: 'yokedCan',
      size: 0.3193,
      rim: { r: 0.515, front: -0.176, back: 0.108 },
      bowl: { r: 0.22, y: 0.276 },
      rear: { r: 0.182, y: 0.424 },
      mouth: 0.4,
      lens: { r: 0.385, y: -0.13, off: 0.18 },
      centre: 'dome',
      grille: 9,
      arch: { tube: 0.022, halfWidth: 0.55, height: 0.745, gap: 0.03 },
      knob: 0.6186,
    },
    dimensions: { h: 321, w: 309, d: 150 },
    // measured from the built model and pinned by tests/unit/render/fixtures/productSpans.test.ts
    span: 0.395,
    mountHeight: { hang: 0.245, floor: 0.245 },
    dataSheet:
      'https://www.robe.cz/onepatt (Robe data sheet "onePATT" 7/22/2026, user manual "onePATT" version 1.4, May 31, 2022)',
    unmodelled: [
      'external PATT Driver and chaining',
      'half-ball diffuser dome look',
      'pixel chase effects across units',
    ],
  },
} as const satisfies Record<string, FixtureProduct>;
