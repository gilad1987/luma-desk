import { fixtureKey, occurrences } from '../../design/fixtureKey';
import { readLumaData } from '../../import/readLumaData';
import { unpatchedBreaksOf } from '../../luma/unpatchedBreaks';
import type { Mat4 } from '../../math/Mat4';
import { walkScene } from '../../scene/walkScene';
import { attr } from '../../xml/elements';
import type { ExportContext } from '../ExportContext';
import { Integrity, type IntegrityCounts } from './Integrity';
import type { FixtureMatch } from './matchFixtures';
import { parentFrame } from './parentFrame';
import { patchFixture } from './patchFixture';
import { removeFixture } from './removeFixture';

/** What patching the paired elements did, counted for the summary. */
export interface MatchCounts {
  readonly updated: number;
  readonly moved: number;
  /** Fixtures whose new `<Matrix>` could not be written: their parent's frame has no inverse. */
  readonly unplaced: number;
  readonly removed: number;
  /** Fixtures unpatched on the desk whose modelled break lost its file address. */
  readonly unpatched: number;
  /** Desk fixtures the file left unpatched; they stay so. */
  readonly spares: number;
  readonly fileIdsKept: number;
  readonly unjudged: number;
  /** By element: the break the desk models of a fixture it has unpatched while the file keeps other breaks (M-2). */
  readonly vacants: ReadonlyMap<Element, number>;
  /** Desk ids of the file fixtures whose address this export wrote anew. */
  readonly repatched: ReadonlySet<number>;
  /** What a re-type or a delete left for the summary to say (B3, B4). */
  readonly integrity: IntegrityCounts;
}

/** World matrices of the walked fixtures by `uuid#occurrence`. */
function worldsOf(doc: Document): Map<string, Mat4> {
  const records = walkScene(doc).fixtures;
  const counted = occurrences(records);
  return new Map(records.map((record) => [fixtureKey(record.uuid, counted.get(record) ?? 0), record.matrix]));
}

/**
 * Gives each paired element its desk values and removes each element the desk deleted, its children kept. The desk's
 * own data of the original is read first: it names, by fixture key, the fixtures the desk wrote unpatched, whose
 * remaining breaks are not the desk's. Only data the import would accept is trusted.
 */
export function patchMatches(
  doc: Document,
  found: FixtureMatch,
  ids: ReadonlyMap<Element, number>,
  context: ExportContext,
): MatchCounts {
  const worlds = worldsOf(doc);
  const carried = readLumaData(doc) ? unpatchedBreaksOf(doc) : new Map<string, number>();
  const zero = { updated: 0, moved: 0, unplaced: 0, removed: 0 };
  const count = { ...zero, unpatched: 0, spares: 0, fileIdsKept: 0, unjudged: 0 };
  const vacants = new Map<Element, number>();
  const repatched = new Set<number>();
  // Parents come before their children in `found.matches`, so a child reads its parent's new matrix (B2).
  // A fixture that follows a moved parent (no matrix could be written) is not listed: its children ask further up.
  const moved = new Map<Element, boolean>();
  const integrity = new Integrity();
  for (const { element, key, fixture, deleted } of found.matches) {
    if (fixture) {
      const parent = parentFrame(element, moved);
      const file = { element, world: worlds.get(key), parent, fileId: ids.get(element), vacant: carried.get(key) };
      const edits = patchFixture(file, fixture, context);
      if (edits.rewritten || !parent.rewritten) moved.set(element, edits.moved);
      if (edits.retyped) integrity.retypedFixture(element);
      count.updated += edits.changed ? 1 : 0;
      count.moved += edits.moved ? 1 : 0;
      count.unplaced += edits.unplaced ? 1 : 0;
      count.unpatched += edits.address === 'removed' ? 1 : 0;
      count.spares += edits.address === 'spare' ? 1 : 0;
      count.fileIdsKept += edits.fileIdKept ? 1 : 0;
      if (edits.vacant !== undefined) vacants.set(element, edits.vacant);
      if (edits.address === 'changed') repatched.add(fixture.id);
    } else if (deleted) {
      integrity.deletedFixture(attr(element, 'uuid'), removeFixture(element));
      count.removed += 1;
    } else if (found.legacy) count.unjudged += 1;
  }
  return { ...count, vacants, repatched, integrity: integrity.finish(doc) };
}
