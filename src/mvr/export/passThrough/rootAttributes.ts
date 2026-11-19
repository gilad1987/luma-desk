import { readLumaData } from '../../import/readLumaData';
import { LUMA_PROVIDER, type OriginalProvider } from '../../luma/lumaData';
import { attr } from '../../xml/elements';

/** The `providerVersion` the desk writes, in the plain writer and here. */
export const LUMA_PROVIDER_VERSION = '1';

/** The MVR version whose elements the desk writes for a fixture it adds. */
const WRITTEN = { major: 1, minor: 6 };

/**
 * The application that wrote the file before the desk: the root's own `provider` when it is not the desk, else the
 * one the desk's data of the original already carries, so a second export from a desk export still names it. A root
 * that names no provider gives empty strings: the field also marks a file another program wrote (review R2-3).
 */
export function originalProviderOf(doc: Document): OriginalProvider | undefined {
  const provider = attr(doc.documentElement, 'provider');
  if (provider === LUMA_PROVIDER) return readLumaData(doc)?.originalProvider;
  return { provider: provider ?? '', providerVersion: attr(doc.documentElement, 'providerVersion') ?? '' };
}

/**
 * Names the desk as the writer of the file. MVR 1.6, `provider`: "The name of the application that is generating
 * the MVR export", and `providerVersion`: "The version of the software that is generating the MVR export". The
 * desk generates this export, also when most of it is the original's content, so a reader that asks who wrote a
 * value the desk changed gets the right answer. The first writer is kept in the desk's own data
 * (`originalProviderOf`), where it loses nothing.
 */
export function nameExporter(root: Element): void {
  root.setAttribute('provider', LUMA_PROVIDER);
  root.setAttribute('providerVersion', LUMA_PROVIDER_VERSION);
}

/**
 * Raises the declared version to 1.6 when the file declares a lower one, and gives the version it had; `undefined`
 * when nothing changed. Called only when the export appended fixtures: they are written as MVR 1.6 fixtures, with
 * `FixtureIDNumeric`, which this export treats as a 1.6 element (the local spec text has no history to say when
 * it came). A file that says 1.4 and holds 1.6 elements would misstate itself. Without added fixtures the declared
 * version stays, as does a version that is missing or not a number.
 */
export function raiseVersion(root: Element): string | undefined {
  // `Number('')` is 0, so a missing or blank part would read as version 0 and be raised; NaN keeps it as it is
  const part = (name: string): number => Number(attr(root, name)?.trim() || NaN);
  const major = part('verMajor');
  const minor = part('verMinor');
  if (!Number.isInteger(major) || !Number.isInteger(minor)) return undefined;
  if (major > WRITTEN.major || (major === WRITTEN.major && minor >= WRITTEN.minor)) return undefined;
  root.setAttribute('verMajor', String(WRITTEN.major));
  root.setAttribute('verMinor', String(WRITTEN.minor));
  return `${major}.${minor}`;
}

/** The summary line for a raised version. */
export function versionNote(raisedFrom: string | undefined): string[] {
  if (raisedFrom === undefined) return [];
  return [
    `The file declared MVR ${raisedFrom}; the fixtures added on the desk are written as MVR 1.6 fixtures ` +
      '(FixtureIDNumeric), so this export declares MVR 1.6.',
  ];
}
