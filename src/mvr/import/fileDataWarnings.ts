import { parseColorCie } from '../gdtf/optics/cieColor';
import type { MvrWarning, MvrWarningCode } from '../MvrWarning';
import { uuidKey, type AuxNames } from '../scene/auxNames';
import type { MvrFixtureRecord } from '../scene/MvrScene';

/** One grouped line for the fixtures a rule finds, or none: the count in the text, the uuids in `refs`. */
function grouped(
  code: MvrWarningCode,
  fixtures: readonly MvrFixtureRecord[],
  text: (count: string) => string,
): MvrWarning[] {
  if (fixtures.length === 0) return [];
  const count = fixtures.length === 1 ? '1 fixture' : `${fixtures.length} fixtures`;
  return [{ code, message: text(count), refs: fixtures.map((fixture) => fixture.uuid) }];
}

/** Whether a reference names a node the file's `<AUXData>` does not have. */
function dangling(uuid: string | undefined, names: ReadonlyMap<string, string> | undefined): boolean {
  return uuid !== undefined && names?.has(uuidKey(uuid)) !== true;
}

/**
 * What the import could not use of the fixtures' `<Position>`, `<Classing>` and `<Color>`, one grouped line per
 * cause. Nothing is dropped: the reference stays on the fixture, and the export writes the file's own node back.
 */
export function fileDataWarnings(fixtures: readonly MvrFixtureRecord[], aux: AuxNames | undefined): MvrWarning[] {
  const noPosition = fixtures.filter((fixture) => dangling(fixture.position, aux?.positions));
  const noClass = fixtures.filter((fixture) => dangling(fixture.classing, aux?.classes));
  const badColor = fixtures.filter((fixture) => fixture.color !== undefined && !parseColorCie(fixture.color));
  return [
    ...grouped(
      'dangling-position',
      noPosition,
      (count) => `A Position the file does not define is named by ${count}; the desk groups by where they hang.`,
    ),
    ...grouped('dangling-class', noClass, (count) => `A Class the file does not define is named by ${count}.`),
    ...grouped(
      'bad-color',
      badColor,
      (count) => `A Color that is not a CIE x,y,Y value is on ${count}; the desk shows no file colour there.`,
    ),
  ];
}
