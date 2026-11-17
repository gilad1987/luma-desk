import { createHash } from 'node:crypto';

/** One file the build ships, by its path from the dist root (forward slashes) and its bytes. */
export interface ShippedFile {
  readonly name: string;
  readonly content: string | Uint8Array;
}

/** Hex digits kept from the SHA-256: short enough to read in DevTools, long enough that two deploys never collide. */
const HASH_LENGTH = 10;

const sha256 = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex');

/**
 * The cache name of one build: `luma-desk-` + a hash of every shipped file's name and content. It changes exactly
 * when a deploy changes a file, so users fetch the app again only when there is something new, and two builds of one
 * commit agree. The prefix keeps the cache easy to find and lets a later fix of quirk I7 delete only our own caches.
 */
export function cacheName(files: readonly ShippedFile[]): string {
  const lines = files.map((file) => `${file.name}\0${sha256(file.content)}`).sort();
  return `luma-desk-${sha256(lines.join('\n')).slice(0, HASH_LENGTH)}`;
}
