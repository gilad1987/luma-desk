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

  // catches a lazy chunk the worker does not cache, so the builder fails to open offline
  it('caches the Web Awesome chunk and its CSS', () => {
    const shell = shellOf(worker);
    const urls = Array.isArray(shell) ? shell.filter((url) => typeof url === 'string') : [];
    const hasEntry = (pattern: RegExp): boolean => urls.some((url) => pattern.test(url));
    expect([hasEntry(/^\.\/assets\/registerWa-[\w-]+\.js$/), hasEntry(/^\.\/assets\/registerWa-[\w-]+\.css$/)]).toEqual(
      [true, true],
    );
  });
});

describe('the Web Awesome chunk boundary', () => {
  /** The text of the one built asset whose name matches `pattern`, or '' when there is none. */
  const assetText = (pattern: RegExp): string => {
    const name = readdirSync(join(outDir, 'assets')).find((file) => pattern.test(file));
    return name ? readFileSync(join(outDir, 'assets', name), 'utf8') : '';
  };

  // catches a static import of the wa folder, which pulls Web Awesome into the desk's start-up chunk. The marker is a
  // Web Awesome token name: the component styles carry `--wa-` tokens, the builder's own TypeScript never does (U7),
  // while the tag name `wa-button` is in the builder markup of the main chunk by design.
  it('keeps the Web Awesome component code out of the main chunk and in the registerWa chunk', () => {
    const main = assetText(/^index-[\w-]+\.js$/);
    const wa = assetText(/^registerWa-[\w-]+\.js$/);
    expect([main.length > 0, main.includes('--wa-'), wa.includes('--wa-')]).toEqual([true, false, true]);
  });
});
