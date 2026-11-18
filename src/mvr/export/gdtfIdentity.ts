import { gdtfModeOf } from '../../domain/stage/gdtfModeOf';
import { importedGdtfInfo } from '../../domain/stage/importedGdtfInfo';
import type { MvrDesignInfo } from '../../domain/stage/mvr';
import type { StageFixture } from '../../domain/stage/StageDesign';
import { LUMA_PROVIDER } from '../luma/lumaData';
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
 * Whether a `<GDTFSpec>` is one of the desk's own stand-in names (`LUMA DESK@LED Screen.gdtf`, `LUMA DESK@Device.gdtf`):
 * the desk types without a real product. No GDTF file of such a name exists, in the archive or on GDTF-Share, so the
 * export says so (`standInNote`) instead of sending the user to look for it.
 */
export const isStandInSpec = (spec: string): boolean => spec.startsWith(`${LUMA_PROVIDER}@`);

/**
 * The GDTF file and mode an exported fixture names. An imported fixture that still has the type the import chose
 * keeps the file's GDTF name and mode, so a re-export names what the source file named. After the user changes the
 * type, or for a desk fixture, the desk type's real product and mode are written together. The mode rule lives in
 * `gdtfModeOf` because the Sheet shows the same mode.
 */
export function gdtfIdentity(fixture: StageFixture, mvr: MvrDesignInfo | undefined): GdtfIdentity {
  const mode = gdtfModeOf(fixture, mvr) ?? DEFAULT_MODE;
  const info = importedGdtfInfo(fixture, mvr);
  if (info) return { spec: info.gdtfName, mode, imported: true };
  return { spec: deskType(fixture).gdtfSpec ?? '', mode, imported: false };
}
