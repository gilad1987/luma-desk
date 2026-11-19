import type { OpticsColor, OpticsEmitter, OpticsShaping } from '../../../domain/stage/optics/OpticsColor';
import type { OpticsFunction } from '../../../domain/stage/optics/OpticsFunction';
import type { GdtfInfo } from '../GdtfInfo';
import { xyyToLinearSrgb } from './cieColor';
import { compact, orAbsent } from './compact';
import { attributesLike, pick, type PlacedFunction } from './placedFunctions';
import { toFunction } from './toFunction';
import { wheelsLike } from './wheelOptics';

/** A colour temperature under this is not kelvin: it is the GDTF default range 0 to 1 or a percent value. */
const MIN_KELVIN = 1000;
/** No stage strobe flashes faster; a higher value is not hertz. */
const MAX_STROBE_HZ = 100;

/** The emitters (`ColorAdd_*`) or flags (`ColorSub_*`) of the mode, each with the colour of its linked source. */
function emitters(info: GdtfInfo, placed: readonly PlacedFunction[], kind: 'emitters' | 'filters'): OpticsEmitter[] {
  const pattern = kind === 'emitters' ? /^ColorAdd_/ : /^ColorSub_/;
  return attributesLike(placed, pattern).flatMap((attribute) => {
    const found = pick(placed, attribute);
    if (found === undefined) return [];
    const link = kind === 'emitters' ? found.fn.emitter : found.fn.filter;
    const source = info.optics?.[kind].find((candidate) => candidate.name === link);
    const color = source?.color;
    return compact<OpticsEmitter>({
      ...toFunction(found),
      name: source?.name,
      xyY: color,
      rgb: color && xyyToLinearSrgb(color),
      dominantWaveLength: source?.dominantWaveLength,
    });
  });
}

/** The functions of `attributes` that the mode has; physical values are kept only when `physical` accepts them. */
function functions(
  placed: readonly PlacedFunction[],
  attributes: readonly string[],
  physical: (from: number, to: number) => boolean = () => true,
): OpticsFunction[] {
  return attributes.flatMap((attribute) => {
    const found = pick(placed, attribute);
    if (found === undefined) return [];
    const fn = toFunction(found);
    return fn.from !== undefined && fn.to !== undefined && !physical(fn.from, fn.to) ? toFunction(found, false) : fn;
  });
}

/** The colour systems of the mode; `undefined` when it has none. */
export function colorOptics(info: GdtfInfo, placed: readonly PlacedFunction[]): OpticsColor | undefined {
  const kelvin = (from: number, to: number): boolean => from >= MIN_KELVIN && to >= MIN_KELVIN;
  const color = compact<OpticsColor>({
    emitters: orAbsent(emitters(info, placed, 'emitters')),
    filters: orAbsent(emitters(info, placed, 'filters')),
    wheels: orAbsent(wheelsLike(info, placed, /^Color\d+$/)),
    correction: orAbsent(functions(placed, ['CTO', 'CTB', 'CTC'], kelvin)),
  });
  return Object.keys(color).length > 0 ? color : undefined;
}

/**
 * Prism, iris, frost, blades and shutter of the mode; `undefined` when it has none. The first shutter and strobe
 * function stand for the device. A strobe range is kept as hertz only when it lies in 0 to 100 and is not empty.
 */
export function shapingOptics(info: GdtfInfo, placed: readonly PlacedFunction[]): OpticsShaping | undefined {
  const hertz = (from: number, to: number): boolean =>
    Math.min(from, to) >= 0 && Math.max(from, to) <= MAX_STROBE_HZ && from !== to;
  const first = (pattern: RegExp, physical?: (from: number, to: number) => boolean): OpticsFunction | undefined =>
    functions(placed, attributesLike(placed, pattern).slice(0, 1), physical)[0];
  const shaping = compact<OpticsShaping>({
    prisms: orAbsent(wheelsLike(info, placed, /^Prism\d+$/)),
    iris: first(/^Iris$/),
    frost: orAbsent(functions(placed, attributesLike(placed, /^Frost\d+$/))),
    blades: orAbsent(functions(placed, attributesLike(placed, /^(Blade(Soft)?\d+(A|B|Rot)|ShaperRot)$/))),
    shutter: first(/^Shutter\d+$/),
    strobe: first(/^Shutter\d+Strobe$/, hertz),
  });
  return Object.keys(shaping).length > 0 ? shaping : undefined;
}
