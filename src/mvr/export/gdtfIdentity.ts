import { gdtfModeOf } from '../../domain/stage/gdtfModeOf';
import { importedGdtfInfo } from '../../domain/stage/importedGdtfInfo';
import type { MvrDesignInfo } from '../../domain/stage/mvr';
import type { StageFixture } from '../../domain/stage/StageDesign';
import { deskType } from './deskType';

/** The `<GDTFSpec>` and `<GDTFMode>` of one exported fixture; the mode is always one of the spec's own modes. */
export interface GdtfIdentity {
  readonly spec: string;
  readonly mode: string;
  /** True when both come from the imported file, false when they come from the desk type. */
  readonly imported: boolean;
}

/** The mode written when a type names no GDTF mode. */
const DEFAULT_MODE = 'Default';

/**
 * The GDTF file and mode an exported fixture names. An imported fixture that still has the type the import chose
 * keeps the file's GDTF name and mode, so a re-export names what the source file named. After the user changes the
 * type or gives the fixture a catalogue product (see `importedGdtfInfo`), or for a desk fixture, the desk type's real
 * product and mode are written together. The mode rule lives in
 * `gdtfModeOf` because the Sheet shows the same mode.
 */
export function gdtfIdentity(fixture: StageFixture, mvr: MvrDesignInfo | undefined): GdtfIdentity {
  const mode = gdtfModeOf(fixture, mvr) ?? DEFAULT_MODE;
  const info = importedGdtfInfo(fixture, mvr);
  if (info) return { spec: info.gdtfName, mode, imported: true };
  return { spec: deskType(fixture).gdtfSpec ?? '', mode, imported: false };
}
