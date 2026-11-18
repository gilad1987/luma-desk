import type { FixtureType, FixtureTypeId } from '../../domain/FixtureType';
import { TYPES } from '../../domain/fixtureTypes';

/** A GDTF name in the form writers vary least: trimmed, lower case, without `.gdtf`. */
const normalize = (spec: string): string =>
  spec
    .trim()
    .toLowerCase()
    .replace(/\.gdtf$/, '');

/** Narrows an object key of `TYPES` to a fixture type id. */
const isTypeId = (key: string): key is FixtureTypeId => key in TYPES;

/**
 * The desk fixture type whose `gdtfSpec` names `spec`, or `undefined`. A desk-exported MVR embeds no GDTF files, so
 * on import the GDTF is missing; this maps its name back to the desk type that wrote it. Case and a missing `.gdtf`
 * are ignored, because MVR writers differ in both.
 */
export function typeFromGdtfSpec(spec: string): FixtureTypeId | undefined {
  const wanted = normalize(spec);
  if (wanted === '') return undefined;
  for (const [id, type] of Object.entries(TYPES)) {
    const known: FixtureType = type;
    if (isTypeId(id) && known.gdtfSpec !== undefined && normalize(known.gdtfSpec) === wanted) return id;
  }
  return undefined;
}
