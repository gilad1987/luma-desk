import type { OpticsRange } from '../../../domain/stage/optics/OpticsFunction';
import type { OpticsDrop } from './OpticsDrop';
import { compact } from './compact';
import { pick, variantsOf, type PlacedFunction } from './placedFunctions';
import { toFunction } from './toFunction';

/** A pan range under this is not a moving head's range: it is a placeholder or a file in another unit. */
const MIN_PAN_DEGREES = 90;
/** A range this narrow is the GDTF default (`PhysicalFrom` 0, `PhysicalTo` 1) or empty, not an angle range. */
const NO_RANGE = 1;
/** No lens spreads its beam over more than a half space. */
const MAX_ZOOM_DEGREES = 180;

type Check = (from: number, to: number) => OpticsDrop['reason'] | undefined;

/** The range of the found function, or `undefined` with a drop of `part` when a rule rejects it. */
function range(
  found: PlacedFunction | undefined,
  part: OpticsDrop['part'],
  drops: OpticsDrop[],
  check: Check,
): OpticsRange | undefined {
  if (found === undefined) return undefined;
  const fn = toFunction(found);
  const { from, to } = fn;
  if (from === undefined || to === undefined) {
    drops.push({ part, reason: 'missing' });
    return undefined;
  }
  const reason = Math.abs(to - from) <= NO_RANGE ? 'noRange' : check(from, to);
  if (reason !== undefined) {
    drops.push({ part, reason });
    return undefined;
  }
  return { ...fn, from, to };
}

/**
 * The `Pan` range in degrees with the file's own sign (`from` at DMX 0). GDTF: "Pan: Controls the fixture's sideward
 * movement (horizontal axis)", physical values in degrees. A range under 90 degrees is dropped.
 */
export function panRange(placed: readonly PlacedFunction[], drops: OpticsDrop[]): OpticsRange | undefined {
  const check: Check = (from, to) => (Math.abs(to - from) < MIN_PAN_DEGREES ? 'tooSmall' : undefined);
  return range(pick(placed, 'Pan'), 'pan', drops, check);
}

/** The `Tilt` range in degrees with the file's own sign. Only a default or empty range is dropped. */
export function tiltRange(placed: readonly PlacedFunction[], drops: OpticsDrop[]): OpticsRange | undefined {
  return range(pick(placed, 'Tilt'), 'tilt', drops, () => undefined);
}

const zoomCheck: Check = (from, to) => {
  const ok = (angle: number): boolean => angle > 0 && angle <= MAX_ZOOM_DEGREES;
  return ok(from) && ok(to) ? undefined : 'outOfRange';
};

/**
 * The `Zoom` range in degrees: the `Zoom` channel function the GDTF makes active by default (`InitialFunction`, else
 * the first). Both ends must be above 0 and at most 180 degrees.
 */
export function zoomRange(placed: readonly PlacedFunction[], drops: OpticsDrop[]): OpticsRange | undefined {
  return range(pick(placed, 'Zoom'), 'zoom', drops, zoomCheck);
}

/**
 * Every plausible `Zoom` function of the mode with its name and its condition, when there is more than one: one
 * maker's file has a beam mode of 21 to 1.8 degrees and a spot mode of 42 to 3 degrees on the same DMX channel.
 */
export function zoomModes(placed: readonly PlacedFunction[]): OpticsRange[] | undefined {
  const ranges = variantsOf(placed, 'Zoom').flatMap((variant) => {
    const found = range(variant, 'zoom', [], zoomCheck);
    return found ? [compact<OpticsRange>({ ...found, label: variant.fn.name })] : [];
  });
  return ranges.length > 1 ? ranges : undefined;
}
