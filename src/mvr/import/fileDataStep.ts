import type { AuxNames } from '../scene/auxNames';
import { colourLines } from './colourLines';
import type { FileDataLine } from './fileDataLine';
import { fileDataWarnings } from './fileDataWarnings';
import type { OpticsLine } from './opticsLines';
import type { ResolvedRig } from './resolveFixtures';
import { withRestAim } from './restAim';
import type { RigOptics } from './rigOptics';

/** The optics step with the file data step on top: the summary lines of both. */
export interface RigFileData extends RigOptics {
  readonly summary: { readonly opticsLines: readonly OpticsLine[]; readonly fileDataLines?: readonly FileDataLine[] };
}

/**
 * Uses the fixtures' file data on the finished design, after the optics, because the `/percent` form of a custom
 * command needs the GDTF range of its axis. `own` is true for a file with the desk's own data: such a design states
 * every pose itself, so the commands of the file it came from are not applied a second time.
 */
export function withFileData(
  optics: RigOptics,
  rig: ResolvedRig,
  aux: AuxNames | undefined,
  own: boolean,
): RigFileData {
  const records = rig.fixtures.map((fixture) => fixture.record);
  const aimed = own ? { design: optics.design, lines: [] } : withRestAim(optics.design);
  const lines = [...colourLines(aimed.design), ...aimed.lines];
  return {
    ...optics,
    design: aimed.design,
    warnings: [...optics.warnings, ...fileDataWarnings(records, aux)],
    summary: { opticsLines: optics.lines, ...(lines.length > 0 ? { fileDataLines: lines } : {}) },
  };
}
