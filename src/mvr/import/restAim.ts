import type { PanTilt } from '../../domain/Fixture';
import { commandAxis, parseCustomCommand } from '../../domain/stage/mvrCommand';
import { fileAimOf } from '../../domain/stage/mvrFileAim';
import { fileCommandsOf } from '../../domain/stage/mvrFileData';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { fixtureCount, type FileDataLine } from './fileDataLine';
import { limitLine, tiltLine, unmappedLine } from './restAimLines';

/** The commands of one fixture the desk does not use: not pan or tilt, unreadable, or on a unit that cannot move. */
function unusedOf(commands: readonly string[], aim: PanTilt | undefined): readonly string[] {
  if (aim === undefined) return commands;
  return commands.filter((text) => {
    const command = parseCustomCommand(text);
    return command === undefined || commandAxis(command) === undefined;
  });
}

/**
 * Gives each moving fixture the rest pose its `<CustomCommands>` state (`fileAimOf`): the pan and tilt the designer
 * drew, as the fixture's `fixed` aim, which the output takes before any cue and after a clear. When every fixture
 * with commands has the same pan and tilt (many files write 0 and 0 on all), the commands hold no focus and no pose
 * is taken. Commands the desk does not use stay in the design and are counted in one line.
 */
export function withRestAim(design: StageDesign): { design: StageDesign; lines: readonly FileDataLine[] } {
  const aims = new Map<number, PanTilt>();
  const unused = new Map<number, readonly string[]>();
  let [limited, clamped] = [0, 0];
  for (const fixture of design.fixtures) {
    const info = design.mvr?.fixtures[String(fixture.id)];
    const commands = info && design.mvr ? fileCommandsOf(design.mvr, info) : [];
    // A fixture that already has a rigged aim keeps it: the commands of the file give it none.
    const read = fixture.fixed === undefined ? fileAimOf(design.mvr, fixture) : undefined;
    if (read?.aim) aims.set(fixture.id, read.aim);
    if (read?.limited) limited += 1;
    if (read?.aim && read.tiltClamped) clamped += 1;
    const rest = unusedOf(commands, read?.aim);
    if (rest.length > 0) unused.set(fixture.id, rest);
  }
  const notes = [...limitLine(limited), ...unmappedLine(unused)];
  const poses = new Set([...aims.values()].map((aim) => `${aim.pan}, ${aim.tilt}`));
  const [only] = poses;
  const same = poses.size === 1 && (aims.size > 1 || only === '0, 0');
  if (aims.size === 0) return { design, lines: notes };
  const count = fixtureCount(aims.size);
  const one = aims.size === 1;
  if (same) {
    const message = `${count} ${one ? 'carries' : 'carry'} the same pan and tilt in the file's CustomCommands (${only}); that is no focus, so the desk keeps its rest pose.`;
    return { design, lines: [{ kind: 'sameAim', count: aims.size, message }, ...notes] };
  }
  const fixtures = design.fixtures.map((fixture) => {
    const fixed = aims.get(fixture.id);
    return fixed ? { ...fixture, fixed } : fixture;
  });
  const message = `${count} ${one ? 'takes its' : 'take their'} rest aim from the file's CustomCommands.`;
  const taken: FileDataLine = { kind: 'restAim', count: aims.size, message };
  return { design: { ...design, fixtures }, lines: [taken, ...tiltLine(clamped), ...notes] };
}
