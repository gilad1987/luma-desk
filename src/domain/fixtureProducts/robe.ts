import type { FixtureProduct } from './FixtureProduct';
import { ROBE_BEAMS } from './robe/robeBeams';
import { ROBE_LED_HEADS } from './robe/robeLedHeads';
import { ROBE_SPOTS } from './robe/robeSpots';

/**
 * The Robe products of the catalogue, checked against the Robe data sheets, joined from the data files in catalogue
 * order. The base type `spot` copies the Robe FORTE: FORTE data sheet 4/16/2026,
 * https://cdn.aws.robe.cz/print/en_product_4220.pdf: height 843 mm head vertical, width 483.5 mm, depth 335 mm,
 * TE 1000 W HP engine 50,000 lm integrating sphere / 40,000 lm goniophotometer, lens 180 mm, zoom 5-55°.
 */
export const ROBE_PRODUCTS = { ...ROBE_SPOTS, ...ROBE_BEAMS, ...ROBE_LED_HEADS } as const satisfies Record<
  string,
  FixtureProduct
>;
