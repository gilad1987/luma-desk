import { ATTR } from '../attributes';
import type { PanTilt } from '../Fixture';
import type { FixtureType } from '../FixtureType';
import { TYPES } from '../fixtureTypes';
import type { MvrDesignInfo } from './mvr';
import { fileCommandsOf } from './mvrFileData';
import { deskAimOf, readFileAngle } from './mvrRestAim';
import type { StageFixture } from './StageDesign';

/** The rest aim the commands of the file give a fixture, in desk values, and what the bounds did to it. */
export interface FileAim {
  readonly aim?: PanTilt | undefined;
  /** A pan or tilt value of the file was past what a head adopts (`readFileAngle`). */
  readonly limited: boolean;
  /** The file's tilt is outside the desk range, so the aim stops at the desk limit. */
  readonly tiltClamped: boolean;
}

const NONE: FileAim = { limited: false, tiltClamped: false };

/**
 * The rest aim the file's `<CustomCommands>` give a fixture; none for a fixture without pan and tilt commands and
 * for a static type. A tilt-only bar needs tilt alone. The import stores it as `fixed`, and the export asks again
 * to see whether the desk still holds it (`restAimChanged`), so both read the commands by one rule.
 */
export function fileAimOf(mvr: MvrDesignInfo | undefined, fixture: StageFixture): FileAim {
  const info = mvr?.fixtures[String(fixture.id)];
  const type: FixtureType = TYPES[fixture.type];
  if (mvr === undefined || info === undefined || !type.moving) return NONE;
  const commands = fileCommandsOf(mvr, info);
  const pan = readFileAngle(commands, 'pan', { range: info.optics?.pan });
  const tilt = readFileAngle(commands, 'tilt', { range: info.optics?.tilt });
  const limited = pan.limit !== undefined || tilt.limit !== undefined;
  if (tilt.angle === undefined || (pan.angle === undefined && !type.tiltOnly)) return { ...NONE, limited };
  const aim = deskAimOf(pan.angle ?? 0, tilt.angle, !fixture.rotation && fixture.mount === 'floor');
  return { aim, limited, tiltClamped: -tilt.angle < ATTR.tilt.min || -tilt.angle > ATTR.tilt.max };
}

/** A hundredth of a degree: the step a rest aim is stored in (`deskAimOf`). */
const SAME_AIM = 0.01;

/**
 * Whether the desk holds another rest aim than the one the file's pan and tilt commands give: the user aimed the
 * fixture after the import, so the commands no longer say where it stands. A fixture without a stored aim states
 * none of its own (the import takes no pose from a rig that carries one value on every fixture), so its commands
 * are not stale.
 */
export function restAimChanged(mvr: MvrDesignInfo | undefined, fixture: StageFixture): boolean {
  const { aim } = fileAimOf(mvr, fixture);
  const { fixed } = fixture;
  if (aim === undefined || fixed === undefined) return false;
  const far = (desk: number, file: number): boolean => Math.abs(desk - file) > SAME_AIM + 1e-9;
  return far(fixed.pan, aim.pan) || far(fixed.tilt, aim.tilt);
}
