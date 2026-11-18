import type { StageDesign } from '../../domain/stage/StageDesign';
import type { Vec3 } from '../../domain/stage/types';
import { stableUuid } from './stableUuid';

/** What every element writer of one export needs besides its own object. */
export interface ExportContext {
  readonly design: StageDesign;
  /** World metres taken off every point before the MVR conversion; see `poseMatrix`. */
  readonly offset: Vec3;
  /** The uuid of the object of `kind` with desk id `id`; the same design always gives the same uuid. */
  readonly uuidOf: (kind: string, id: string) => string;
}

/**
 * The context of one export. Uuids are keyed by the design name too, so two different designs do not give their
 * `front` trusses the same uuid when a console merges both files. An imported design takes its fit offset back off.
 */
export function exportContext(design: StageDesign): ExportContext {
  return {
    design,
    offset: design.mvr?.offset ?? [0, 0, 0],
    uuidOf: (kind, id) => stableUuid(`${design.source.name}|${kind}|${id}`),
  };
}
