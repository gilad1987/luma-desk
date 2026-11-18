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
 * (Vectorworks "Custom@" GDTFs write `Offset=""`), which keeps an empty offset instead of being dropped.
 */
function parseOffset(text: string | undefined): number[] {
  if (text === undefined) return [1];
  if (text.trim() === '' || text === 'None') return [];
  return text.split(',').map(Number).filter(Number.isInteger);
}

function toChannel(el: Element): GdtfModeChannel {
  const logical = childElement(el, 'LogicalChannel');
  const attribute = (logical && attr(logical, 'Attribute')) ?? '';
  const mapped = attributeToAttr(attribute);
  return {
    attribute,
    ...(mapped === undefined ? {} : { attr: mapped }),
    geometry: attr(el, 'Geometry') ?? '',
    dmxBreak: parseBreak(attr(el, 'DMXBreak')),
    offset: parseOffset(attr(el, 'Offset')),
  };
}

function toMode(el: Element): GdtfMode {
  const channels = childElement(el, 'DMXChannels');
  return {
    name: attr(el, 'Name') ?? '',
    geometry: attr(el, 'Geometry') ?? '',
    channels: channels ? childElements(channels, 'DMXChannel').map(toChannel) : [],
  };
}

/**
 * The DMX modes of a GDTF `FixtureType`, in file order, with the attribute of each channel's first logical channel:
 * the desk drives one attribute per DMX channel, and the first is the one GDTF writers list as the main function.
 */
export function readModes(fixtureType: Element): GdtfMode[] {
  const modes = childElement(fixtureType, 'DMXModes');
  return modes ? childElements(modes, 'DMXMode').map(toMode) : [];
}
