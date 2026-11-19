import type { StageDesign } from '../../../domain/stage/StageDesign';
import { MvrError } from '../../MvrWarning';
import { childElement } from '../../xml/elements';
import { planPatches, type PatchPlan } from '../autoPatch';
import { exportContext } from '../ExportContext';
import { appendAdded, replaceLumaData } from './deskElements';
import { usableIds } from './fileIds';
import type { IntegrityCounts } from './Integrity';
import { addressFootprints } from './keptFootprints';
import { keyedElements } from './legacyPairs';
import { matchFixtures } from './matchFixtures';
import { patchMatches } from './patchMatches';
import { reservedSpans } from './reservedSpans';
import { raiseVersion } from './rootAttributes';
import { unknownReach } from './unknownReach';
import { walkedFixtures } from './walkedFixtures';

/** How the desk changed the fixtures of the original scene. */
export interface FixtureChanges {
  readonly updated: number;
  readonly moved: number;
  readonly added: number;
  readonly removed: number;
  /** Fixtures unpatched on the desk whose modelled break lost its file address. */
  readonly unpatched: number;
  /** Desk fixtures the file left unpatched; they stay so. */
  readonly spares: number;
}

/** The patched scene's facts for the summary. */
export interface ScenePatch {
  readonly changes: FixtureChanges;
  readonly plan: Omit<PatchPlan, 'patches'>;
  /** Fixtures whose file id was empty, zero or shared, so their file id stays and the desk id is not written. */
  readonly fileIdsKept: number;
  /** Fixture elements without a desk fixture that a show saved before the import list could not judge. */
  readonly unjudged: number;
  /** Fixtures whose new `<Matrix>` could not be written: their parent's frame has no inverse. */
  readonly unplaced: number;
  /** Kept addresses of unknown size, counted as 1 channel in the overlap check. */
  readonly reserved: number;
  /** File fixtures whose desk patch is out of range, so the address the file had stays on their element. */
  readonly stale: number;
  /** Fixtures without a desk patch whose other breaks keep their file addresses. */
  readonly otherBreaks: number;
  readonly integrity: IntegrityCounts;
  /** The MVR version the file declared when added fixtures made the export declare 1.6 (`raiseVersion`). */
  readonly raisedFrom: string | undefined;
}

/**
 * By fixture key in the scene as it is written now, the desk's break of each fixture in `vacants`. Elements the desk
 * deleted are gone and added ones are in, so the keys are the ones the next import counts.
 */
function unpatchedKeys(layers: Element, vacants: ReadonlyMap<Element, number>): Map<string, number> {
  const keyed = keyedElements(walkedFixtures(layers));
  return new Map(keyed.flatMap(({ element, key }) => (vacants.has(element) ? [[key, vacants.get(element) ?? 0]] : [])));
}

/**
 * Patches the original scene in place with what the desk owns (`matchFixtures` pairs elements and desk fixtures).
 * A paired element gets its desk values; one the desk deleted is removed, its children kept; desk fixtures the file
 * does not hold are appended with addresses above every address the file keeps. All other content stays. Only the
 * elements the import's walk met are paired (`walkedFixtures`), in its order, so both count repeated uuids alike.
 */
export function patchScene(doc: Document, design: StageDesign, original: Uint8Array): ScenePatch {
  const context = exportContext(design);
  const layers = childElement(childElement(doc.documentElement, 'Scene') ?? doc.documentElement, 'Layers');
  if (!layers) throw new MvrError('no-scene', 'The original scene has no <Layers>.');
  const elements = walkedFixtures(layers);
  const ids = usableIds(elements);
  const found = matchFixtures(elements, design, ids);
  // Read before any patch: an address is sized by its break among the breaks the file gave the fixture.
  const sizes = addressFootprints(original, found.matches);
  const matched = patchMatches(doc, found, ids, context);
  const { vacants, fileIdsKept, unjudged, unplaced, repatched, integrity, ...counts } = matched;
  const reserved = reservedSpans(found.matches, sizes);
  const fresh = new Set(found.added);
  const planned = design.fixtures.filter((fixture) => fixture.patch || fresh.has(fixture));
  // No address is guessed into a file that holds a real rig: an added fixture of unknown size stays unpatched.
  const base = planPatches(planned, design.mvr, reserved, false);
  const written = new Set([...repatched, ...found.added.map((fixture) => fixture.id)]);
  const plan = { ...base, warnings: [...base.warnings, ...unknownReach(base.patches, reserved, written)] };
  appendAdded(layers, found.added, context, plan);
  const raisedFrom = found.added.length > 0 ? raiseVersion(doc.documentElement) : undefined;
  replaceLumaData(doc, context, unpatchedKeys(layers, vacants));
  const stale = found.matches.filter(({ fixture }) => fixture?.patch && !plan.patches.has(fixture.id)).length;
  const unsized = reserved.filter((span) => !span.known).length;
  const changes = { ...counts, added: found.added.length };
  const kept = { fileIdsKept, unjudged, unplaced, reserved: unsized, stale, otherBreaks: vacants.size };
  return { changes, plan, ...kept, integrity, raisedFrom };
}
