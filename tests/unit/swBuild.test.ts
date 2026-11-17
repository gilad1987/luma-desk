import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'vite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Unit tests of the build helpers pass even when the plugin wires them up wrong (an empty shell once passed them all).
// Only a real production build, as CI runs it, proves that dist/sw.js can install the app.

const root = resolve(import.meta.dirname, '../..');
let outDir = '';
let worker = '';
let page = '';

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), 'sw-build-'));
  // Vitest sets NODE_ENV to 'test' and Vite reads production mode from it; build what `npm run build` ships
  vi.stubEnv('NODE_ENV', 'production');
  await build({ root, configFile: join(root, 'vite.config.ts'), logLevel: 'silent', build: { outDir } });
  worker = readFileSync(join(outDir, 'sw.js'), 'utf8');
  page = readFileSync(join(outDir, 'index.html'), 'utf8');
}, 60_000);

afterAll(() => {
  vi.unstubAllEnvs();
  if (outDir) rmSync(outDir, { recursive: true, force: true });
});

/** The shell list the plugin wrote in: the one JSON array of the minified worker that starts with './'. */
const shellOf = (code: string): unknown => JSON.parse(/\["\.\/".*?\]/.exec(code)?.[0] ?? '[]');

/** The first URL of index.html that the pattern captures, or a marker that no shell entry can equal. */
const pageUrl = (pattern: RegExp): string => pattern.exec(page)?.[1] ?? `${String(pattern)} is not in index.html`;

describe('the built service worker', () => {
  it('names its cache luma-desk- and a 10-digit hex hash', () => {
    expect(/"(luma-desk-[^"]*)"/.exec(worker)?.[1]).toMatch(/^luma-desk-[0-9a-f]{10}$/);
  });

  it('caches the folder URL, the page, its hashed JS and CSS entries, the manifest and every icon', () => {
    const icons = readdirSync(join(root, 'public/icons')).map((name) => `./icons/${name}`);
    const entries = [
      pageUrl(/src="(\.\/assets\/index-[\w-]+\.js)"/),
      pageUrl(/href="(\.\/assets\/index-[\w-]+\.css)"/),
    ];
    const expected = ['./', './index.html', ...entries, './manifest.webmanifest', ...icons];
    expect(shellOf(worker)).toEqual(expect.arrayContaining(expected));
  });

  it('is one classic script, with no import or export statement', () => {
    expect(worker).not.toMatch(/\b(?:import|export)\b/);
  });
});
