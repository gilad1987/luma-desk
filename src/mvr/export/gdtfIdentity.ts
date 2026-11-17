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
 * type, or for a desk fixture, the desk type's real product and mode are written together, because a spec with
 * another product's mode cannot be patched. A stored patch mode wins only for a fixture that was never imported.
 */
export function gdtfIdentity(fixture: StageFixture, mvr: MvrDesignInfo | undefined): GdtfIdentity {
  const info = mvr?.fixtures[String(fixture.id)];
  if (info && info.type === fixture.type && info.gdtfName !== '') {
    return { spec: info.gdtfName, mode: info.gdtfMode, imported: true };
  }
  const type = deskType(fixture);
  const ownMode = info ? undefined : fixture.patch?.mode;
  return { spec: type.gdtfSpec ?? '', mode: ownMode ?? type.gdtfMode ?? DEFAULT_MODE, imported: false };
}
