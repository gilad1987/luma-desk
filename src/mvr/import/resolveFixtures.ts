import type { FixtureTypeId } from '../../domain/FixtureType';
import type { MvrArchive } from '../archive/MvrArchive';
import type { ResolvedFixture } from '../design/DesignInput';
import type { GdtfInfo } from '../gdtf/GdtfInfo';
import { breakFootprint } from '../gdtf/breakFootprint';
import { gdtfBodySize } from '../gdtf/gdtfBodySize';
import { modeChannels } from '../gdtf/modeChannels';
import type { MvrWarning } from '../MvrWarning';
import { patchFromAddresses } from '../patch/address';
import type { MvrFixtureRecord } from '../scene/MvrScene';
import { classifyFixture, type FixtureClass } from './classifyFixture';
import { withCustomId } from './deviceEvidence';
import { fallbackType } from './fallbackType';
import { readGdtfTable } from './gdtfTable';
import { StandInTally } from './standInWarnings';
import { typeGuessWarnings } from './typeGuessWarnings';

/** The scene's `<Fixture>` elements after the GDTF and patch steps: every one is a desk fixture, none is dropped. */
export interface ResolvedRig {
  /** Every `<Fixture>` in scene order: each becomes one desk fixture, also when its GDTF is no light. */
  readonly fixtures: readonly ResolvedFixture[];
  /** Fixtures whose GDTF file is not in the archive. */
  readonly missingGdtfCount: number;
  /** GDTF file warnings, then unknown-mode warnings per file and mode, then the grouped type-guess lines. */
  readonly gdtfWarnings: readonly MvrWarning[];
  /** Patch warnings in fixture order. */
  readonly patchWarnings: readonly MvrWarning[];
  /** By fixture uuid: the overall size in metres its GDTF gives (`gdtfBodySize`); no entry when it gives none. */
  readonly bodySizes: ReadonlyMap<string, number>;
  /** The read GDTF by `GDTFSpec` (`GdtfTable.infos`), for the body step. */
  readonly infos: ReadonlyMap<string, GdtfInfo>;
}

/** What the GDTF step decides for one fixture: a `FixtureClass` plus the resolved mode and its DMX footprint. */
interface TypeAndMode extends FixtureClass {
  readonly mode: string;
  readonly footprint?: number;
  readonly bodySize?: number;
  /** The mode's channel count, for the placeholder line of the summary. */
  readonly channelCount?: number;
}

/**
 * The type, mode and footprint of one fixture; without a usable GDTF the mode is kept as the scene names it. Mode
 * warnings are kept once per GDTF file and requested mode (the first fixture names it), because a show often gives
 * the same unknown mode to every fixture of a type, and one line per fixture floods the summary.
 */
function typeAndMode(
  record: MvrFixtureRecord,
  info: GdtfInfo | undefined,
  modeWarnings: Map<string, MvrWarning>,
): TypeAndMode {
  if (info === undefined) return { type: fallbackType(record.gdtfSpec), fromName: false, mode: record.gdtfMode };
  const result = modeChannels(info, record.gdtfMode, record.uuid);
  // modeChannels matches names after trimming, so "" and "  " (or "Std" and "Std ") give the same warning
  const key = `${info.fileName}\n${record.gdtfMode.trim()}`;
  for (const warning of result.warnings) if (!modeWarnings.has(key)) modeWarnings.set(key, warning);
  const footprint = breakFootprint(result.channels);
  const kind = classifyFixture(info, result.channels, [record.gdtfSpec, info.name, record.name]);
  const bodySize = gdtfBodySize(info, result.mode);
  const sized = bodySize === undefined ? {} : { bodySize };
  const channelCount = result.channels.length;
  return { ...kind, mode: result.mode, ...(footprint === undefined ? {} : { footprint }), ...sized, channelCount };
}

/**
 * Gives every scene fixture a desk type, its resolved mode and its patch. GDTF files are read once per spec. A
 * fixture whose GDTF is a placeholder or no light keeps its id and patch (`StandInTally` reports it). `gdtfName`
 * keeps the scene's `GDTFSpec` text, so an export can write back the same name even when the file was missing.
 */
export function resolveFixtures(archive: MvrArchive, records: readonly MvrFixtureRecord[]): ResolvedRig {
  const table = readGdtfTable(
    archive,
    records.map((record) => record.gdtfSpec),
  );
  const modeWarnings = new Map<string, MvrWarning>();
  const patchWarnings: MvrWarning[] = [];
  const fixtures: ResolvedFixture[] = [];
  const standIns = new StandInTally();
  const guesses = new Map<FixtureTypeId, number>();
  const bodySizes = new Map<string, number>();
  for (const record of records) {
    const kind = withCustomId(record, typeAndMode(record, table.infos.get(record.gdtfSpec), modeWarnings));
    const { type, fromName, standIn, bodySize, channelCount = 0, mode, footprint } = kind;
    if (bodySize !== undefined) bodySizes.set(record.uuid, bodySize);
    // a stand-in has its own summary line, so it is not counted as a plain name guess too
    if (standIn !== undefined) standIns.add(record.gdtfSpec, kind, channelCount);
    else if (fromName) guesses.set(type, (guesses.get(type) ?? 0) + 1);
    const { patch, warnings } = patchFromAddresses(record.addresses, record.uuid);
    patchWarnings.push(...warnings);
    const sized = footprint === undefined ? {} : { footprint };
    const marked = standIn === undefined ? {} : { standIn };
    fixtures.push({ record, type, gdtfName: record.gdtfSpec, mode, ...sized, ...marked, ...(patch ? { patch } : {}) });
  }
  const guessWarnings = [...typeGuessWarnings(guesses), ...standIns.warnings()];
  const gdtfWarnings = [...table.warnings, ...modeWarnings.values(), ...guessWarnings];
  const { infos, missingCount: missingGdtfCount } = table;
  return { fixtures, missingGdtfCount, gdtfWarnings, patchWarnings, bodySizes, infos };
}
