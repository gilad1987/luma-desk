import type { MvrWarning } from '../MvrWarning';
import type { GdtfBreak, GdtfChannel, GdtfInfo, GdtfMode, GdtfModeChannel, GdtfReference } from './GdtfInfo';

/** The channels of the mode a fixture uses, and the mode actually used (it differs after a fallback). */
export interface ModeChannelsResult {
  readonly mode: string;
  readonly channels: readonly GdtfChannel[];
  readonly warnings: readonly MvrWarning[];
}

/** Sorts virtual channels (no offset) after the patched ones. */
const NO_OFFSET = Number.MAX_SAFE_INTEGER;

/**
 * The break a channel copy lands in. `Overwrite` channels take the reference's last break (GDTF rule); numbered
 * channels take the break with their number. A channel outside any reference keeps its own break at offset 1.
 */
function breakFor(channel: GdtfModeChannel, breaks: readonly GdtfBreak[]): GdtfBreak {
  const own = channel.dmxBreak === 'overwrite' ? 1 : channel.dmxBreak;
  const found =
    channel.dmxBreak === 'overwrite' ? breaks.at(-1) : breaks.find((entry) => entry.dmxBreak === channel.dmxBreak);
  return found ?? { dmxBreak: own, dmxOffset: 1 };
}

function place(channel: GdtfModeChannel, at: GdtfBreak): GdtfChannel {
  return {
    attribute: channel.attribute,
    ...(channel.attr === undefined ? {} : { attr: channel.attr }),
    dmxBreak: at.dmxBreak,
    offset: channel.offset.map((offset) => offset + at.dmxOffset - 1),
  };
}

/** One copy of the channel per reference to its geometry, or the channel itself when no reference uses it. */
function expand(channel: GdtfModeChannel, references: readonly GdtfReference[]): GdtfChannel[] {
  const users = references.filter((reference) => reference.geometry === channel.geometry);
  const breakLists = users.length > 0 ? users.map((reference) => reference.breaks) : [[]];
  return breakLists.map((breaks) => place(channel, breakFor(channel, breaks)));
}

function byDmxSlot(a: GdtfChannel, b: GdtfChannel): number {
  return a.dmxBreak - b.dmxBreak || (a.offset[0] ?? NO_OFFSET) - (b.offset[0] ?? NO_OFFSET);
}

function unknownMode(info: GdtfInfo, modeName: string, used: GdtfMode | undefined, ref: string): MvrWarning {
  const fallback = used ? `the first mode "${used.name}" is used` : 'it has no DMX modes';
  const message = `Mode "${modeName}" is not in GDTF "${info.fileName}", so ${fallback}.`;
  return { code: 'unknown-mode', message, ref };
}

/**
 * The mode named `modeName`: an exact match first, then one equal after trimming both names. Writers keep trailing
 * spaces in GDTF mode names (`"Full Access Extended Mode "`) that other writers drop or pad in `<GDTFMode>` text.
 */
function findMode(info: GdtfInfo, modeName: string): GdtfMode | undefined {
  const exact = info.modes.find((mode) => mode.name === modeName);
  return exact ?? info.modes.find((mode) => mode.name.trim() === modeName.trim());
}

/**
 * The DMX channels of one mode in DMX order (break, then offset), with `GeometryReference` templates expanded to one
 * copy per reference, so the caller can patch them directly. An empty or unknown mode name falls back to the first
 * mode with an `unknown-mode` warning (`ref` names the fixture), as MVR writers often leave `GDTFMode` empty. `mode`
 * is the GDTF's own name, spaces kept, so an export writes the name the GDTF file holds.
 */
export function modeChannels(info: GdtfInfo, modeName: string, ref: string): ModeChannelsResult {
  const named = findMode(info, modeName);
  const mode = named ?? info.modes[0];
  const warnings = named ? [] : [unknownMode(info, modeName, mode, ref)];
  if (mode === undefined) return { mode: '', channels: [], warnings };
  // a mode without a Geometry attribute is out of spec; all references are the best guess then
  const references = info.references.filter((reference) => mode.geometry === '' || reference.root === mode.geometry);
  const channels = mode.channels.flatMap((channel) => expand(channel, references)).sort(byDmxSlot);
  return { mode: mode.name, channels, warnings };
}
