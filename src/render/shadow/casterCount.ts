import type { CasterParts } from './casterParts';

/** The cost of caster parts as plain numbers. */
export interface CasterCount {
  triangles: number;
  objects: number;
  bytes: number;
}

export const countParts = ({ triangles, objects, bytes }: CasterParts): CasterCount => ({
  triangles,
  objects: objects.length,
  bytes,
});
