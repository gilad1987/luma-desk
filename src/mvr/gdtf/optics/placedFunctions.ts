import type { OpticsCondition, OpticsDrive } from '../../../domain/stage/optics/OpticsFunction';
import type { GdtfInfo, GdtfMode, GdtfModeChannel, GdtfReference } from '../GdtfInfo';
import { expand } from '../modeChannels';
import { activeByDefault } from './activeByDefault';
import { dmxValueBytes, parseDmxValue } from './dmxValue';
import type { GdtfFunction } from './GdtfFunction';

/** A channel function with the DMX slots of every copy of its channel in the mode. */
export interface PlacedFunction {
  readonly fn: GdtfFunction;
  readonly drives: readonly OpticsDrive[];
  /** Set when the function has a `ModeMaster`. */
  readonly when?: OpticsCondition;
}

/** Sorts virtual channels (no offset) after the patched ones. */
const NO_OFFSET = Number.MAX_SAFE_INTEGER;

/** A copy whose break or offset is not a whole number from 1 (`Offset="0"`) names no DMX slot, so it is left out. */
const isSlot = (value: number): boolean => Number.isInteger(value) && value > 0;
const drivesOf = (channel: GdtfModeChannel, references: readonly GdtfReference[]): OpticsDrive[] =>
  expand(channel, references)
    .filter(({ dmxBreak, offset }) => isSlot(dmxBreak) && offset.every(isSlot))
    .map(({ dmxBreak, offset }) => ({ dmxBreak, offset }));

/**
 * The `ModeMaster` condition of a function. The master is named by its DMX channel, whose name the spec builds from
 * "a geometry name and the attribute name of the first logical channel with separator `_`"; a link to a channel
 * function starts with the same name. `ModeFrom` and `ModeTo` are read in the master's resolution.
 */
function conditionOf(
  fn: GdtfFunction,
  mode: GdtfMode,
  references: readonly GdtfReference[],
): OpticsCondition | undefined {
  const name = fn.modeMaster?.split('.')[0];
  if (name === undefined) return undefined;
  const master = mode.channels.find((channel) => `${channel.geometry}_${channel.attribute}` === name);
  const own = master?.offset.length ?? 0;
  const bytes = own > 0 ? own : (dmxValueBytes(fn.modeFrom) ?? 1);
  return {
    attribute: master?.attribute ?? name,
    drives: master ? drivesOf(master, references) : [],
    dmxFrom: parseDmxValue(fn.modeFrom, bytes) ?? 0,
    dmxTo: parseDmxValue(fn.modeTo, bytes) ?? 0,
  };
}

/** Every channel function of the mode `info.modes[modeIndex]`, `GeometryReference` copies placed as the patch does. */
export function placedFunctions(info: GdtfInfo, modeIndex: number): PlacedFunction[] {
  const mode = info.modes[modeIndex];
  const functions = info.optics?.functions[modeIndex];
  if (mode === undefined || functions === undefined) return [];
  const references = info.references.filter((reference) => mode.geometry === '' || reference.root === mode.geometry);
  return mode.channels.flatMap((channel, index) => {
    const drives = drivesOf(channel, references);
    return (functions[index] ?? []).map((fn) => {
      const when = conditionOf(fn, mode, references);
      return when ? { fn, drives, when } : { fn, drives };
    });
  });
}

/** `first` with the drives of all `entries`, each once, in DMX order. */
function merged(first: PlacedFunction, entries: readonly PlacedFunction[]): PlacedFunction {
  const drives = new Map<string, OpticsDrive>();
  for (const drive of entries.flatMap((entry) => entry.drives)) {
    drives.set(`${drive.dmxBreak}:${drive.offset.join(',')}`, drive);
  }
  const byDmx = (a: OpticsDrive, b: OpticsDrive): number =>
    a.dmxBreak - b.dmxBreak || (a.offset[0] ?? NO_OFFSET) - (b.offset[0] ?? NO_OFFSET);
  return { ...first, drives: [...drives.values()].sort(byDmx) };
}

/**
 * The function of one attribute: the one `InitialFunction` names, else the one active at the master's default
 * (`activeByDefault`), else the first, gives the ranges; the drives are those of every channel with the attribute.
 * So a pixel bar's `ColorAdd_R` has one drive per pixel, as `GeometryReference` copies or one channel per geometry.
 */
export function pick(placed: readonly PlacedFunction[], attribute: string): PlacedFunction | undefined {
  const same = placed.filter((entry) => entry.fn.attribute === attribute);
  const first = same.find((entry) => entry.fn.initial) ?? activeByDefault(placed, same) ?? same[0];
  return first && merged(first, same);
}

/** The distinct functions of one attribute (by name, physical range and condition), each with its drives. */
export function variantsOf(placed: readonly PlacedFunction[], attribute: string): PlacedFunction[] {
  const groups = new Map<string, PlacedFunction[]>();
  for (const entry of placed.filter((candidate) => candidate.fn.attribute === attribute)) {
    const { name, physicalFrom, physicalTo, modeMaster, modeFrom, modeTo } = entry.fn;
    const key = [name, physicalFrom, physicalTo, modeMaster, modeFrom, modeTo].join('\n');
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return [...groups.values()].flatMap((same) => (same[0] ? [merged(same[0], same)] : []));
}

/** The attributes of the mode that match `pattern`, each once, in mode order. */
export function attributesLike(placed: readonly PlacedFunction[], pattern: RegExp): string[] {
  return [...new Set(placed.map((entry) => entry.fn.attribute).filter((attribute) => pattern.test(attribute)))];
}
