import { attr, childElement, childElements } from '../xml/elements';
import { attributeToAttr } from './attributeMap';
import type { GdtfMode, GdtfModeChannel } from './GdtfInfo';

/** `DMXBreak`: a 1-based number, or `Overwrite`; anything else is the GDTF default 1. */
function parseBreak(text: string | undefined): number | 'overwrite' {
  if (text === 'Overwrite') return 'overwrite';
  const value = Number(text);
  return Number.isInteger(value) && value > 0 ? value : 1;
}

/**
 * `Offset`: comma-separated 1-based offsets. Missing means the GDTF default `1`; empty or `None` is a virtual channel
 * (Vectorworks "Custom@" GDTFs write `Offset=""`), which keeps an empty offset instead of being dropped. A value that
 * is not a whole number from 1 (`Offset="0"`) is no DMX slot: it is dropped here, once for the patch, the footprint
 * and the optics, and counted in `dropped` so the import can say so.
 */
function parseOffset(text: string | undefined, dropped: { count: number }): number[] {
  if (text === undefined) return [1];
  if (text.trim() === '' || text === 'None') return [];
  const values = text.split(',').map(Number);
  const slots = values.filter((value) => Number.isInteger(value) && value >= 1);
  dropped.count += values.length - slots.length;
  return slots;
}

function toChannel(el: Element, dropped: { count: number }): GdtfModeChannel {
  const logical = childElement(el, 'LogicalChannel');
  const attribute = (logical && attr(logical, 'Attribute')) ?? '';
  const mapped = attributeToAttr(attribute);
  return {
    attribute,
    ...(mapped === undefined ? {} : { attr: mapped }),
    geometry: attr(el, 'Geometry') ?? '',
    dmxBreak: parseBreak(attr(el, 'DMXBreak')),
    offset: parseOffset(attr(el, 'Offset'), dropped),
  };
}

function toMode(el: Element, dropped: { count: number }): GdtfMode {
  const channels = childElement(el, 'DMXChannels');
  return {
    name: attr(el, 'Name') ?? '',
    geometry: attr(el, 'Geometry') ?? '',
    channels: channels ? childElements(channels, 'DMXChannel').map((channel) => toChannel(channel, dropped)) : [],
  };
}

/**
 * The DMX modes of a GDTF `FixtureType`, in file order, with the attribute of each channel's first logical channel:
 * the desk drives one attribute per DMX channel, and the first is the one GDTF writers list as the main function.
 * `dropped.count` grows by each channel offset that is no DMX slot (`parseOffset`).
 */
export function readModes(fixtureType: Element, dropped = { count: 0 }): GdtfMode[] {
  const modes = childElement(fixtureType, 'DMXModes');
  return modes ? childElements(modes, 'DMXMode').map((mode) => toMode(mode, dropped)) : [];
}
