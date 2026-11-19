import type { OpticsSlot, OpticsWheel } from '../../../domain/stage/optics/OpticsColor';
import type { GdtfInfo } from '../GdtfInfo';
import { xyyToLinearSrgb } from './cieColor';
import { compact } from './compact';
import type { GdtfChannelSet } from './GdtfFunction';
import type { GdtfSlot } from './GdtfOpticsSource';
import { attributesLike, pick, type PlacedFunction } from './placedFunctions';
import { toFunction } from './toFunction';

/**
 * One slot as fixture data. The image name gets its extension here: GDTF `MediaFileName` is the "PNG file name
 * without extension", and the file lies "in a folder called `./wheels` in the zip archive".
 */
function toSlot(slot: GdtfSlot, set: GdtfChannelSet | undefined): OpticsSlot {
  return compact<OpticsSlot>({
    name: slot.name,
    xyY: slot.color,
    rgb: slot.color && xyyToLinearSrgb(slot.color),
    image: slot.mediaFileName === undefined ? undefined : `${slot.mediaFileName}.png`,
    facets: slot.facets > 0 ? slot.facets : undefined,
    dmxFrom: set?.dmxFrom,
    dmxTo: set?.dmxTo,
  });
}

/**
 * The wheel the function of `attribute` selects, with its slots. A slot's DMX range comes from the first channel
 * set that names it; the spec: "The link between a slot and a channel set is done via the wheel slot index", which
 * "is normalized to 1". A function without a `Wheel` link, or with a link to no wheel, gives nothing: its slots are
 * unknown.
 */
function wheelOf(info: GdtfInfo, placed: readonly PlacedFunction[], attribute: string): OpticsWheel | undefined {
  const found = pick(placed, attribute);
  const wheel = info.optics?.wheels.find((candidate) => candidate.name === found?.fn.wheel);
  if (found === undefined || wheel === undefined) return undefined;
  const setOf = (index: number): GdtfChannelSet | undefined =>
    found.fn.sets.find((set) => set.wheelSlotIndex === index + 1);
  // the wheel's physical values are slot positions, not a unit a consumer can use, so they are left out
  const slots = wheel.slots.map((slot, index) => toSlot(slot, setOf(index)));
  return { ...toFunction(found, false), name: wheel.name, slots };
}

/** The wheels of the attributes that match `pattern` (`/^Color\d+$/`), in mode order. */
export function wheelsLike(info: GdtfInfo, placed: readonly PlacedFunction[], pattern: RegExp): OpticsWheel[] {
  return attributesLike(placed, pattern).flatMap((attribute) => wheelOf(info, placed, attribute) ?? []);
}

/**
 * The gobo wheels (`Gobo(n)`: "Selects gobos in gobo wheel (n)"). A wheel is rotating when the mode has the
 * attribute that indexes its gobos (`Gobo(n)Pos`) or spins them (`Gobo(n)PosRotate`), else static.
 */
export function goboOptics(info: GdtfInfo, placed: readonly PlacedFunction[]): OpticsWheel[] {
  return wheelsLike(info, placed, /^Gobo\d+$/).map((wheel) => {
    const turns = [`${wheel.attribute}Pos`, `${wheel.attribute}PosRotate`];
    return { ...wheel, rotating: turns.some((attribute) => pick(placed, attribute) !== undefined) };
  });
}
