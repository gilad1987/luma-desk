import type { FixtureProduct } from '../FixtureProduct';

/** The Robe effect heads of the catalogue, in catalogue order. */
export const ROBE_EFFECTS = {
  // Robe "Spikie" data sheet 8/12/2025: one 60 W RGBW LED, zoom 4°-28° (User_manual_Robin_Spikie.pdf: 4°-27°, 4°-23°
  // with the flower effect), lens 110 mm, 1,150 lm integrating sphere (920 lm goniophotometer), max. 100 W,
  // 408 x 277 x 147 mm head vertical, 7.3 kg, pan 540° and tilt 360° with continuous rotation, no gobos.
  // Discontinued (robe.cz/spikie).
  'robe-spikie': {
    id: 'robe-spikie',
    brand: 'Robe',
    name: 'Spikie',
    category: 'beam',
    base: 'beam',
    // zoom from the sheet, z0 at its narrow end; power = TYPES.beam.power 1.2 * Spikie 1,150 lm / MegaPointe 20,375 lm
    // = 0.068: the MegaPointe sheet states no method, so the ratio may mix measures; no gobo wheel
    optics: {
      attrs: ['dim', 'pan', 'tilt', 'r', 'g', 'b', 'zoom', 'strobe'],
      zr: [4, 28],
      z0: 4,
      power: 0.068,
    },
    // model units of about 305 mm (the 292.5 mm tilt axis height over the robe base and yoke), from the UM p24
    // views: a barrel of about 160 mm diameter, 110 mm in front of the tilt axis and 92 mm behind it. The lens is
    // 110/150 of the MegaPointe's, sunk as deep per lens radius; size, barrel and ax are tuned so the hung span
    // meets the size rule (0.94 * 408 / 640 = 0.599 m) and the hung width / height meets 277 / 408.
    body: {
      family: 'mover',
      ref: 'megapointe',
      size: 0.413,
      ax: 0.34,
      barrel: { r: 0.26, rear: 0.3, front: -0.36 },
      lens: { r: 0.198, y: 0.298, off: 0.36 },
      face: 'hotspot',
    },
    dimensions: { h: 408, w: 277, d: 147 },
    // measured from the built model and pinned by tests/unit/render/fixtures/productSpans.test.ts
    span: 0.599,
    mountHeight: { hang: 0.45, floor: 0.45 },
    dataSheet:
      'https://www.robe.cz/spikie (Robe data sheet "Spikie" 8/12/2025, https://www.robe.cz/api/robe/pdfs/en/product/664)',
    unmodelled: ['3-facet rotating prism', 'flower effect', 'continuous pan and tilt rotation', 'virtual colour wheel'],
    discontinued: true,
  },
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
    // size = the Spiider measured head-forward 1.17 * 512 / 477 (its head-forward height) = 1.256 m over a 1-unit span.
    body: {
      family: 'tiltBar',
      size: 1.256,
      base: { w: 0.809, h: 0.203, d: 0.4, y: 0.521 },
      yoke: { y: 0.17, h: 0.133, d: 0.225, arm: 0.035, neck: 0.098 },
      head: { w: 0.93, d: 0.203, rear: 0.139, front: -0.18 },
      frame: { d: 0.232, proud: 0.017 },
      cells: { count: 9, pitch: 0.109, w: 0.104 },
      lens: { w: 0.979, h: 0.107, off: 0.193 },
    },
    dimensions: { h: 368, w: 512, d: 205 },
    // measured from the built model and pinned by tests/unit/render/fixtures/productSpans.test.ts
    span: 1.256,
    mountHeight: { hang: 0.654, floor: 0.654 },
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
