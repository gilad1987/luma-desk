import { createHash } from 'node:crypto';

/** One top-level venue object in the golden: its position among the venue's scene children and its dump hash. */
export interface DigestEntry {
  readonly index: number;
  readonly type: string;
  readonly uuid: string;
  readonly sha: string;
}

/**
 * Turns the dump texts of the venue's top-level objects into compact golden entries. A full dump is several MB (the
 * trusses alone are thousands of meshes), so the golden keeps a hash per top-level object; type and uuid stay
 * readable so a failure points at the first object that differs.
 */
export function digestVenue(texts: readonly string[]): DigestEntry[] {
  return texts.map((text, index) => {
    const { type, uuid } = JSON.parse(text) as { type: string; uuid: string };
    return { index, type, uuid, sha: createHash('sha256').update(text).digest('hex').slice(0, 16) };
  });
}
