import { gdtfOptics, type GdtfOpticsResult } from '../../../src/mvr/gdtf/optics/gdtfOptics.ts';
import { readGdtf } from '../../../src/mvr/gdtf/readGdtf.ts';
import { makeGdtf, type GdtfParts } from './makeGdtf.ts';

/** One `<DMXChannel>` with one logical channel, for `gdtfFunctionMode`. */
export interface FunctionChannel {
  readonly attribute: string;
  /** The `Offset` text: `1`, or `1,2` for a 16-bit channel. */
  readonly offset: string;
  /** The `Geometry` of the channel; `Body` when absent. */
  readonly geometry?: string;
  /** More XML attributes of the `<DMXChannel>` (`InitialFunction="Body_Zoom.Zoom.Spot"`). */
  readonly channel?: string;
  /** More XML attributes of the channel function (`PhysicalFrom="-270" PhysicalTo="270"`). */
  readonly fn?: string;
  /** Inner XML of the channel function: its channel sets. */
  readonly sets?: string;
  /** More `<ChannelFunction>` elements of the same logical channel. */
  readonly more?: string;
}

/**
 * One `<DMXMode>` whose channels have channel functions, which `gdtfMode` leaves out. The optics tests need them:
 * the physical ranges, the wheel and emitter links and the channel sets all sit on the channel function.
 */
export function gdtfFunctionMode(name: string, channels: readonly FunctionChannel[], geometry = 'Body'): string {
  const body = channels
    .map(
      ({ attribute, offset, geometry: at = 'Body', channel = '', fn = '', sets = '', more = '' }) =>
        `<DMXChannel DMXBreak="1" Offset="${offset}" Geometry="${at}" ${channel}><LogicalChannel Attribute="${attribute}">` +
        `<ChannelFunction Attribute="${attribute}" ${fn}>${sets}</ChannelFunction>${more}</LogicalChannel></DMXChannel>`,
    )
    .join('');
  return `<DMXMode Name="${name}" Geometry="${geometry}"><DMXChannels>${body}</DMXChannels></DMXMode>`;
}

/** The optics `gdtfOptics` reads from a synthetic GDTF in mode `mode`. */
export function opticsOf(parts: GdtfParts, mode = 'Std'): GdtfOpticsResult {
  const { info } = readGdtf(makeGdtf(parts), 'Acme@Test.gdtf');
  if (info === undefined) throw new Error('the synthetic GDTF cannot be read');
  return gdtfOptics(info, mode);
}
