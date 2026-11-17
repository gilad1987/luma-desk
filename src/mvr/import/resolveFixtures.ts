import type { FixtureTypeId } from '../../domain/FixtureType';
import type { MvrArchive } from '../archive/MvrArchive';
import type { ResolvedFixture } from '../design/DesignInput';
import { classifyType } from '../gdtf/classifyType';
import type { GdtfInfo } from '../gdtf/GdtfInfo';
import { breakFootprint } from '../gdtf/breakFootprint';
import { modeChannels } from '../gdtf/modeChannels';
import type { MvrWarning } from '../MvrWarning';
import { patchFromAddresses } from '../patch/address';
import type { MvrFixtureRecord } from '../scene/MvrScene';
import { fallbackType } from './fallbackType';
import { readGdtfTable } from './gdtfTable';

/** The scene's `<Fixture>` elements after the GDTF and patch steps, split into desk fixtures and objects. */
export interface ResolvedRig {
  /** Light fixtures in scene order: each becomes one desk fixture. */
  readonly fixtures: readonly ResolvedFixture[];
  /** Uuids of `<Fixture>` elements whose GDTF has no beam and no dimmer (a speaker): objects, not lights. */
  readonly objectUuids: readonly string[];
  /** Fixtures whose GDTF file is not in the archive. */
  readonly missingGdtfCount: number;
  /** GDTF file warnings first, then one unknown-mode warning per GDTF file and requested mode, in fixture order. */
  readonly gdtfWarnings: readonly MvrWarning[];
  /** Patch warnings in fixture order. */
  readonly patchWarnings: readonly MvrWarning[];
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
): { readonly type: FixtureTypeId | 'object'; readonly mode: string; readonly footprint?: number } {
  if (info === undefined) return { type: fallbackType(record.gdtfSpec), mode: record.gdtfMode };
  const result = modeChannels(info, record.gdtfMode, record.uuid);
  const key = `${info.fileName}\n${record.gdtfMode}`;
  for (const warning of result.warnings) if (!modeWarnings.has(key)) modeWarnings.set(key, warning);
  const footprint = breakFootprint(result.channels);
  const type = classifyType(info, result.channels);
  return { type, mode: result.mode, ...(footprint === undefined ? {} : { footprint }) };
}

/**
 * Gives every scene fixture a desk type, its resolved mode and its patch. GDTF files are read once per spec. Objects
 * get no patch, because the desk never drives them. `gdtfName` keeps the scene's `GDTFSpec` text, so an export can
 * write back the same name even when the file was missing.
 */
export function resolveFixtures(archive: MvrArchive, records: readonly MvrFixtureRecord[]): ResolvedRig {
  const table = readGdtfTable(
    archive,
    records.map((record) => record.gdtfSpec),
  );
  const modeWarnings = new Map<string, MvrWarning>();
  const patchWarnings: MvrWarning[] = [];
  const fixtures: ResolvedFixture[] = [];
  const objectUuids: string[] = [];
  for (const record of records) {
    const { type, ...identity } = typeAndMode(record, table.infos.get(record.gdtfSpec), modeWarnings);
    if (type === 'object') {
      objectUuids.push(record.uuid);
      continue;
    }
    const { patch, warnings } = patchFromAddresses(record.addresses, record.uuid);
    patchWarnings.push(...warnings);
    fixtures.push({ record, type, gdtfName: record.gdtfSpec, ...identity, ...(patch ? { patch } : {}) });
  }
  const gdtfWarnings = [...table.warnings, ...modeWarnings.values()];
  return { fixtures, objectUuids, missingGdtfCount: table.missingCount, gdtfWarnings, patchWarnings };
}
