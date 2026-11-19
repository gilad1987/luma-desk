import type { MvrWarning } from '../MvrWarning';

/** The newest MVR version the import was written against (DIN SPEC 15801, MVR 1.6). */
const READ_MAJOR = 1;
const READ_MINOR = 6;

/**
 * One warning when the file says it is newer than MVR 1.6. Older files (1.4, 1.5) need none: the import reads the
 * elements a file has and asks for no version. A newer file is still read, but it may hold elements the desk does not
 * know, and the user must hear that before trusting the result. A missing or unreadable version gives no warning.
 */
export function versionWarnings(doc: Document): MvrWarning[] {
  const major = Number(doc.documentElement.getAttribute('verMajor') ?? '');
  const minor = Number(doc.documentElement.getAttribute('verMinor') ?? '');
  if (!Number.isInteger(major) || !Number.isInteger(minor)) return [];
  if (major < READ_MAJOR || (major === READ_MAJOR && minor <= READ_MINOR)) return [];
  const message = `The file is MVR ${major}.${minor}, newer than the 1.6 the desk reads; parts that 1.6 does not have are not imported.`;
  return [{ code: 'newer-version', message }];
}
