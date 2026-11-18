import { importedGdtfInfo } from '../../domain/stage/importedGdtfInfo';
import type { MvrDesignInfo } from '../../domain/stage/mvr';
import { commandAxis, parseCustomCommand } from '../../domain/stage/mvrCommand';
import { restAimChanged } from '../../domain/stage/mvrFileAim';
import { fileCommandsOf } from '../../domain/stage/mvrFileData';
import type { StageFixture } from '../../domain/stage/StageDesign';

/** The `<CustomCommand>` texts the plain writer writes for one fixture. */
export interface WrittenCommands {
  readonly texts: readonly string[];
  /** Why commands of the file are not written: the fixture has another `type`, or its rest `aim` changed. */
  readonly lost?: 'type' | 'aim';
}

/** Whether a command text drives pan or tilt. */
function isAimCommand(text: string): boolean {
  const command = parseCustomCommand(text);
  return command !== undefined && commandAxis(command) !== undefined;
}

/**
 * The commands of the file that are still true for a desk fixture. None while the fixture has another type than in
 * the file: "This node defines a custom command for the linked GDTF", and after a type change the GDTF is another
 * one. No pan or tilt command once the user gave the fixture another rest aim (`restAimChanged`): the command would
 * state a pose the fixture no longer has. Every other command is written as the file had it.
 */
export function writtenCommands(mvr: MvrDesignInfo | undefined, fixture: StageFixture): WrittenCommands {
  const info = mvr?.fixtures[String(fixture.id)];
  const all = mvr && info ? fileCommandsOf(mvr, info) : [];
  if (all.length === 0) return { texts: [] };
  if (!importedGdtfInfo(fixture, mvr)) return { texts: [], lost: 'type' };
  if (!restAimChanged(mvr, fixture)) return { texts: all };
  return { texts: all.filter((text) => !isAimCommand(text)), lost: 'aim' };
}
