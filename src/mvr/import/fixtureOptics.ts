import type { FixtureOptics } from '../../domain/stage/optics/FixtureOptics';
import { isVendorSymbol } from '../gdtf/gdtfBodySize';
import type { GdtfInfo } from '../gdtf/GdtfInfo';
import { isGenericGdtf } from '../gdtf/isGenericGdtf';
import { mixesColour } from '../gdtf/mixesColour';
import { modeChannels } from '../gdtf/modeChannels';
import { gdtfOptics } from '../gdtf/optics/gdtfOptics';
import type { OpticsDrop } from '../gdtf/optics/OpticsDrop';

/**
 * Why a fixture gets no optical data from a GDTF. `noGdtf`: the file is not in the archive or cannot be read.
 * `vendorSymbol`: a Vectorworks `Custom@` GDTF, whose geometry is real but whose beam, ranges and wheels are
 * placeholders. `generic`: the mode has only the stand-in channels (`isGenericGdtf`), as a 1-channel stub has.
 * `noData`: a real GDTF that states no optical fact the import can use.
 */
export type OpticsDistrust = 'noGdtf' | 'vendorSymbol' | 'generic' | 'noData';

/** What the trust rule decided for one GDTF and mode. */
export interface OpticsVerdict {
  /** The optics to store on the fixture; absent when `reason` is set. */
  readonly optics?: FixtureOptics;
  readonly reason?: OpticsDistrust;
  /** Single values of a trusted file that were not used (`OpticsDrop`). */
  readonly drops: readonly OpticsDrop[];
  /** The mode has colour channels the optics do not describe; stored beside them (`MvrColourMix`). */
  readonly mixesColour?: true;
}

/**
 * The trust rule for optical data. A GDTF is used only when it is a maker's file with a real channel set: not a
 * Vectorworks `Custom@` stand-in and not a generic mode. This is stricter than geometry trust (`gdtfBodySize` uses
 * the sizes of both), because a CAD tool copies the symbol's shape but invents the optics: always Wash, 25 degrees,
 * 10000 lumens. Inside a trusted file each value is still checked on its own (`gdtfOptics`), so one placeholder
 * range does not discard the rest. `modeName` is the mode the fixture uses; `spec` is its MVR `GDTFSpec`.
 */
export function fixtureOptics(info: GdtfInfo | undefined, spec: string, modeName: string): OpticsVerdict {
  if (info === undefined) return { reason: 'noGdtf', drops: [] };
  if (isVendorSymbol(info, spec)) return { reason: 'vendorSymbol', drops: [] };
  const { mode, channels } = modeChannels(info, modeName, spec);
  if (isGenericGdtf(channels)) return { reason: 'generic', drops: [] };
  const { optics, drops } = gdtfOptics(info, mode);
  const mixed = mixesColour(channels) ? { mixesColour: true as const } : {};
  return optics === undefined ? { reason: 'noData', drops } : { optics, drops, ...mixed };
}
