import type { MvrFixtureRecord } from '../scene/MvrScene';
import type { MvrWarning } from '../MvrWarning';

/** `id` when it is a usable desk id (a positive integer), else `undefined`. */
const positive = (id: number | undefined): number | undefined =>
  id !== undefined && Number.isInteger(id) && id > 0 ? id : undefined;

/**
 * The id the file asks for: `FixtureIDNumeric`, else a numeric `FixtureID`. The spec defines `FixtureIDNumeric` 0 as
 * "not set", and writers emit 0 by default, so a 0 must not hide the `FixtureID` the user typed.
 */
function requestedId(record: MvrFixtureRecord): number | undefined {
  const fromText = /^\s*\d+\s*$/.test(record.fixtureId) ? Number(record.fixtureId) : undefined;
  return positive(record.fixtureIdNumeric) ?? positive(fromText);
}

/**
 * Desk fixture ids for the records, in file order. A requested id is kept when no earlier record took it, because
 * users type the ids they know from the console. Records without one, and later duplicates, get the lowest free id
 * after all requested ids are reserved, so a free id never steals a later record's requested id. Each duplicate gets
 * a `duplicate-id` warning, as the user's numbering changed.
 */
export function assignIds(records: readonly MvrFixtureRecord[], warn: (warning: MvrWarning) => void): number[] {
  const used = new Set<number>();
  const kept = records.map((record) => {
    const id = requestedId(record);
    if (id === undefined) return undefined;
    if (!used.has(id)) {
      used.add(id);
      return id;
    }
    warn({
      code: 'duplicate-id',
      message: `Fixture id ${id} is used twice; ${record.name} got a new id.`,
      ref: record.uuid,
    });
    return undefined;
  });
  let next = 1;
  return kept.map((id) => {
    if (id !== undefined) return id;
    while (used.has(next)) next++;
    used.add(next);
    return next;
  });
}
