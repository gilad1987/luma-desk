/**
 * The 100-line limit for the files ESLint cannot see. ESLint `max-lines` covers .ts; CSS, SCSS and GLSL need this
 * check, and both must count the same way, so a file that passes one gate never fails the other.
 */
export const MAX_FILE_LINES = 100;

/** Extensions this check owns; .ts is left to ESLint so a file is never reported twice. */
const CHECKED_EXTENSIONS = ['.css', '.scss', '.glsl'];

export interface SourceFile {
  readonly path: string;
  readonly text: string;
}

export interface OversizedFile {
  readonly path: string;
  readonly lines: number;
}

/**
 * Counts lines like ESLint `max-lines` with blank lines and comments included: the newline that ends the last line
 * does not open a new one.
 */
export function countLines(text: string): number {
  if (text === '') return 0;
  const lines = text.split(/\r\n|\r|\n/);
  return lines.at(-1) === '' ? lines.length - 1 : lines.length;
}

/** Returns the CSS, SCSS and GLSL files over the limit, so the caller can list every offender in one run. */
export function findOversizedFiles(files: readonly SourceFile[]): OversizedFile[] {
  return files
    .filter((file) => CHECKED_EXTENSIONS.some((ext) => file.path.endsWith(ext)))
    .map((file) => ({ path: file.path, lines: countLines(file.text) }))
    .filter((file) => file.lines > MAX_FILE_LINES);
}
