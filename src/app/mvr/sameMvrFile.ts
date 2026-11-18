import type { StageSource } from '../../domain/stage/types';

/**
 * True when both sources name the same MVR file, so its scenery stays valid. A builder edit copies the design with a
 * new source that keeps the file hash, and a show load parses a new object, so the hash decides; the same object
 * covers a file not stored, and two sources without a hash are two files. The stage follower and the restore share
 * this rule, so a change the follower keeps never drops a queued restore.
 */
export const sameMvrFile = (a: StageSource, b: StageSource): boolean =>
  a === b || (b.fileHash !== undefined && a.fileHash === b.fileHash);
