import { attr, childElements } from '../../xml/elements';
import { compact, toNumber } from './compact';
import { dmxValueBytes, parseDmxValue } from './dmxValue';
import type { GdtfChannelSet, GdtfFunction } from './GdtfFunction';

/**
 * The last DMX value of the range that starts at `starts[index]`. The spec: "The end DMX value is calculated as a
 * DMXFrom of the next channel function – 1 or the maximum value of the DMX channel." "Next" is read as the nearest
 * higher start, not the next in file order: functions with a `ModeMaster` share one start value, and the next in
 * file order would give them an end below their start.
 */
function endOf(starts: readonly number[], index: number, max: number): number {
  const start = starts[index] ?? 0;
  const higher = starts.filter((other) => other > start);
  return higher.length > 0 ? Math.min(...higher) - 1 : max;
}

function readSets(fn: Element, bytes: number, end: number): GdtfChannelSet[] {
  const sets = childElements(fn, 'ChannelSet');
  const starts = sets.map((set) => parseDmxValue(attr(set, 'DMXFrom'), bytes) ?? 0);
  return sets.map((set, index) =>
    compact<GdtfChannelSet>({
      name: attr(set, 'Name') ?? '',
      dmxFrom: starts[index] ?? 0,
      dmxTo: endOf(starts, index, end),
      wheelSlotIndex: toNumber(attr(set, 'WheelSlotIndex')),
    }),
  );
}

/** Where a function sits in its channel: the byte count, its DMX range and the name the channel starts with. */
interface Span {
  readonly bytes: number;
  readonly dmxFrom: number;
  readonly dmxTo: number;
  readonly initial: string | undefined;
}

function toFunction(fn: Element, { bytes, dmxFrom, dmxTo, initial }: Span): GdtfFunction {
  const name = attr(fn, 'Name') || undefined;
  return compact<GdtfFunction>({
    attribute: attr(fn, 'Attribute') ?? 'NoFeature',
    name,
    initial: name !== undefined && name === initial ? true : undefined,
    dmxFrom,
    dmxTo,
    defaultDmx: parseDmxValue(attr(fn, 'Default'), bytes),
    physicalFrom: toNumber(attr(fn, 'PhysicalFrom')),
    physicalTo: toNumber(attr(fn, 'PhysicalTo')),
    wheel: attr(fn, 'Wheel') || undefined,
    emitter: attr(fn, 'Emitter') || undefined,
    filter: attr(fn, 'Filter') || undefined,
    modeMaster: attr(fn, 'ModeMaster') || undefined,
    modeFrom: attr(fn, 'ModeFrom') || undefined,
    modeTo: attr(fn, 'ModeTo') || undefined,
    sets: readSets(fn, bytes, dmxTo),
  });
}

/**
 * Every channel function of one `DMXChannel`, logical channel by logical channel, in file order. `offsetBytes` is
 * the number of DMX offsets of the channel; a virtual channel has none, and its values then keep the byte count
 * the `DMXFrom` text of its first function names. The functions of all logical channels share the DMX channel's
 * range, so the end of each is found among the starts of the whole channel: a shutter in one logical channel ends
 * where the strobe of the next one starts, not at the channel's maximum.
 */
export function readFunctions(channel: Element, offsetBytes: number): GdtfFunction[] {
  // `InitialFunction` is a node path (`Head_Zoom.Zoom.ZoomModeSpot`); its last part is the function name
  const initial = attr(channel, 'InitialFunction')?.split('.').at(-1);
  const fns = childElements(channel, 'LogicalChannel').flatMap((logical) => childElements(logical, 'ChannelFunction'));
  const first = fns[0];
  const bytes = offsetBytes > 0 ? offsetBytes : ((first && dmxValueBytes(attr(first, 'DMXFrom'))) ?? 1);
  const starts = fns.map((fn) => parseDmxValue(attr(fn, 'DMXFrom'), bytes) ?? 0);
  const max = 256 ** bytes - 1;
  return fns.map((fn, index) =>
    toFunction(fn, { bytes, dmxFrom: starts[index] ?? 0, dmxTo: endOf(starts, index, max), initial }),
  );
}
