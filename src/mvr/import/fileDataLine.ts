/** What a line of the import summary about the fixtures' file data says. */
export type FileDataLineKind =
  'restAim' | 'sameAim' | 'aimLimit' | 'tiltLimit' | 'unmappedCommands' | 'colour' | 'sameColour';

/** One line of the import summary about the fixtures' file data. */
export interface FileDataLine {
  readonly kind: FileDataLineKind;
  /** The number of fixtures the line is about. */
  readonly count: number;
  /** One English sentence for the summary. */
  readonly message: string;
}

/** `1 fixture`, `12 fixtures`. */
export function fixtureCount(count: number): string {
  return count === 1 ? '1 fixture' : `${count} fixtures`;
}
