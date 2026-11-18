import type { MvrDesignInfo } from '../../domain/stage/mvr';
import type { StageDesign } from '../../domain/stage/StageDesign';
import type { StageSource } from '../../domain/stage/types';

/**
 * True when `design` still shows the MVR file of `source`, so its scenery stays valid. The design needs MVR data: a
 * template or a show of the same file without that data has no scenery to draw. A builder edit copies the design
 * with a new source that keeps the file hash, and a show load parses a new object, so the hash decides; the same
 * object covers a file not stored, and two sources without a hash are two files. The stage follower and the restore
 * share this rule, so a change the follower keeps never drops a queued restore.
 */
export const showsMvrFile = (
  design: StageDesign,
  source: StageSource,
): design is StageDesign & { readonly mvr: MvrDesignInfo } =>
  design.mvr !== undefined &&
  (design.source === source || (source.fileHash !== undefined && design.source.fileHash === source.fileHash));
