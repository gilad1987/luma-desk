import { TYPES } from '../../domain/fixtureTypes';
import type { MvrArchive } from '../archive/MvrArchive';
import { findGdtfMatch, type GdtfMatch } from '../gdtf/findGdtf';
import type { GdtfInfo } from '../gdtf/GdtfInfo';
import { readGdtf } from '../gdtf/readGdtf';
import { typeFromGdtfSpec } from '../gdtf/typeFromGdtfSpec';
import type { MvrWarning } from '../MvrWarning';
import { byCount } from '../byCount';
import { fallbackType } from './fallbackType';

/** The GDTF files of one scene, read once per distinct `GDTFSpec` because hundreds of fixtures share a few types. */
export interface GdtfTable {
  /** The read GDTF by spec; absent when the file is missing or unreadable, so the fixture type is a guess. */
  readonly infos: ReadonlyMap<string, GdtfInfo>;
  /** Fixtures whose GDTF file is not in the archive and whose spec names no desk type, so their type is a guess. */
  readonly missingCount: number;
  /** Ambiguous-file, unreadable-file and missing-file warnings, in the order the specs first appear in the scene. */
  readonly warnings: readonly MvrWarning[];
}

/** One warning per missing spec, not per fixture, so a show with 30 such fixtures does not flood the summary. */
function missingWarning(spec: string, count: number): MvrWarning {
  const fixtures = byCount(count, 'fixture', 'fixtures');
  const uses = spec === '' ? byCount(count, 'names no', 'name no') : byCount(count, 'uses', 'use');
  const what = spec === '' ? `${uses} GDTF file` : `${uses} the GDTF "${spec}", which is not in the file`;
  const shown = `${byCount(count, 'it is', 'they are')} shown as the desk type "${TYPES[fallbackType(spec)].name}"`;
  const message = `${count} ${fixtures} ${what}; ${shown}.`;
  return { code: 'missing-gdtf', message, ref: spec };
}

/** One warning per spec whose lookup matched several files equally well, so the user can check the guess. */
function ambiguousWarning(spec: string, match: GdtfMatch): MvrWarning {
  const others = match.ties.map((tie) => `"${tie}"`).join(', ');
  const message = `GDTF "${spec}" matches ${match.ties.length + 1} files; "${match.file}" is used, not ${others}.`;
  return { code: 'ambiguous-gdtf', message, ref: spec };
}

/** How many fixtures use each spec, in first-appearance order (a `Map` keeps insertion order). */
function countSpecs(specs: readonly string[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const spec of specs) counts.set(spec, (counts.get(spec) ?? 0) + 1);
  return counts;
}

/**
 * Resolves and reads the GDTF of every distinct spec in `specs` (one entry per fixture, in scene order). A missing
 * file gives one `missing-gdtf` warning with the affected fixture count, except when the spec names a desk type: a
 * luma export never embeds GDTF files, and its type is known. A spec that matches several files gives one
 * `ambiguous-gdtf` warning. A broken file keeps `readGdtf`'s warning.
 */
export function readGdtfTable(archive: MvrArchive, specs: readonly string[]): GdtfTable {
  const infos = new Map<string, GdtfInfo>();
  const warnings: MvrWarning[] = [];
  let missingCount = 0;
  for (const [spec, count] of countSpecs(specs)) {
    const match = findGdtfMatch(archive.names, spec);
    if (match && match.ties.length > 0) warnings.push(ambiguousWarning(spec, match));
    const file = match?.file;
    const bytes = file === undefined ? undefined : archive.file(file);
    if (file === undefined || bytes === undefined) {
      if (typeFromGdtfSpec(spec) !== undefined) continue;
      warnings.push(missingWarning(spec, count));
      missingCount += count;
      continue;
    }
    const read = readGdtf(bytes, file);
    warnings.push(...read.warnings);
    if (read.info) infos.set(spec, read.info);
  }
  return { infos, missingCount, warnings };
}
