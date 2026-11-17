import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { ShippedFile } from './cacheName.ts';

/** Dotfiles such as .nojekyll configure the host; static servers often refuse them, and one 404 fails install (I9). */
const isHostConfig = (name: string): boolean => name.split('/').some((part) => part.startsWith('.'));

/**
 * The app files of Vite's public folder (manifest, icons). Vite copies them to dist/ after the bundle is written, so
 * they are not in the bundle the plugin sees and must be read from disk. Names use forward slashes, as URLs do.
 */
export function readPublicFiles(publicDir: string): ShippedFile[] {
  if (!publicDir || !existsSync(publicDir)) return [];
  return readdirSync(publicDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .map((path) => ({ path, name: relative(publicDir, path).split(sep).join('/') }))
    .filter((file) => !isHostConfig(file.name))
    .map((file) => ({ name: file.name, content: readFileSync(file.path) }));
}
