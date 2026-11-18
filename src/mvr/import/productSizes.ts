import type { FixtureTypeId } from '../../domain/FixtureType';
import { TYPES } from '../../domain/fixtureTypes';
import type { BodyPlan } from './bodyDraw';

/** Overall width, depth and height of a hanging fixture in metres: GDTF X, Y and Z, the order of `BodyPlan.box`. */
type Size = readonly [width: number, depth: number, height: number];

const VIPER: Size = [0.472, 0.335, 0.731];
/**
 * Overall sizes from the makers' published data sheets. A product matches when its name, with everything but letters
 * and digits removed, holds every fragment, so `LED Beam 150`, `LEDBeam150` and `Robin LEDBeam 150` are one product.
 */
const PRODUCTS: readonly (readonly [fragments: readonly string[], size: Size])[] = [
  [
    ['mac', 'axiom'],
    [0.414, 0.399, 0.616],
  ],
  [
    ['beye', 'k10'],
    [0.423, 0.358, 0.494],
  ],
  [
    ['axcor', 'profile', '600'],
    [0.409, 0.388, 0.785],
  ],
  [['viper', 'profile'], VIPER],
  [['viper', 'airfx'], VIPER],
  [
    ['ledbeam', '150'],
    [0.244, 0.149, 0.337],
  ],
  [['painte'], [0.367, 0.219, 0.619]],
  [
    ['colorado', 'pxlbar16'],
    [1.0, 0.139, 0.273],
  ],
  [['collider'], [0.468, 0.179, 0.268]],
];

const MOVING_SPOT: Size = [0.4, 0.35, 0.65];
const FLASH: Size = [0.5, 0.18, 0.27];
/** A realistic size per desk type for a product the table does not know; a type without one keeps the desk size. */
const BY_TYPE: Partial<Record<FixtureTypeId, Size>> = {
  spot: MOVING_SPOT,
  beam: MOVING_SPOT,
  wash: [0.35, 0.3, 0.45],
  bar: [1.0, 0.14, 0.27],
  strobe: FLASH,
  blinder: FLASH,
  follow: [0.35, 1.2, 0.5],
};

const compact = (name: string | undefined): string => (name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/** The data-sheet size of the product one of `names` (GDTF name, `GDTFSpec`, fixture name) names, if the table has it. */
export function productSize(names: readonly (string | undefined)[]): Size | undefined {
  const texts = names.map(compact);
  return PRODUCTS.find(([fragments]) => texts.some((text) => fragments.every((part) => text.includes(part))))?.[1];
}

/**
 * The ladder step before the desk model at its own size. The desk types are drawn at show scale, about twice the
 * real product, so a fixture without a GDTF size stood out against the real bodies beside it. Only a plan with no
 * GDTF size (`desk`) changes: it gets the product's data-sheet size, or the default of its desk type, and the desk
 * model is fitted to that box. A moving-head default is only for a type that moves.
 */
export function withProductSize(plan: BodyPlan, names: readonly (string | undefined)[], type: FixtureTypeId): BodyPlan {
  if (plan.draw !== 'desk') return plan;
  const known = productSize(names);
  const fallback = TYPES[type].moving || BY_TYPE[type] !== MOVING_SPOT ? BY_TYPE[type] : undefined;
  const box = known ?? fallback;
  if (!box) return plan;
  return { ...plan, draw: 'deskAtBox', box, sizeFrom: known ? 'productTable' : 'typeDefault' };
}
