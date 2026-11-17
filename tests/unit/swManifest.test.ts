import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cacheName } from '../../build/cacheName.ts';
import { injectManifest } from '../../build/injectManifest.ts';
import { readPublicFiles } from '../../build/readPublicFiles.ts';
import { shellUrls } from '../../build/shellUrls.ts';

const page = { name: 'index.html', content: '<html>' };
const files = [page, { name: 'assets/index-abc.js', content: 'boot()' }];

describe('shellUrls', () => {
  it('starts with the folder URL and lists every file relative to the worker, sorted', () => {
    expect(shellUrls(['index.html', 'assets/index-abc.js'])).toEqual(['./', './assets/index-abc.js', './index.html']);
  });
});

describe('cacheName', () => {
  it('is luma-desk- and a short hex hash', () => {
    expect(cacheName(files)).toMatch(/^luma-desk-[0-9a-f]{10}$/);
  });

  it('does not depend on the order of the files', () => {
    expect(cacheName([...files].reverse())).toBe(cacheName(files));
  });

  it('changes when a file content or a file name changes', () => {
    const base = cacheName(files);
    expect(cacheName([page, { name: 'assets/index-abc.js', content: 'boot(1)' }])).not.toBe(base);
    expect(cacheName([page, { name: 'assets/index-abd.js', content: 'boot()' }])).not.toBe(base);
  });

  it('hashes bytes and text with the same content alike', () => {
    expect(cacheName([{ name: 'a', content: new TextEncoder().encode('x') }])).toBe(
      cacheName([{ name: 'a', content: 'x' }]),
    );
  });
});

describe('injectManifest', () => {
  const manifest = { shell: ['./', './a$&.js'], cache: 'luma-desk-0123456789' };

  it('replaces both placeholders with JSON literals, even where they repeat', () => {
    const code = 'var s=__SW_SHELL__,c=__SW_CACHE__;use(__SW_CACHE__)';
    expect(injectManifest(code, manifest)).toBe(
      'var s=["./","./a$&.js"],c="luma-desk-0123456789";use("luma-desk-0123456789")',
    );
  });

  it('fails when a placeholder is missing, so a broken worker never ships', () => {
    expect(() => injectManifest('var c=__SW_CACHE__', manifest)).toThrow(/__SW_SHELL__/);
    expect(() => injectManifest('var s=__SW_SHELL__', manifest)).toThrow(/__SW_CACHE__/);
  });
});

describe('readPublicFiles', () => {
  it('reads nested files with URL-style names and skips host dotfiles', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sw-public-'));
    mkdirSync(join(dir, 'icons'));
    writeFileSync(join(dir, 'icons', 'icon.png'), 'png');
    writeFileSync(join(dir, 'manifest.webmanifest'), '{}');
    writeFileSync(join(dir, '.nojekyll'), '');
    const names = readPublicFiles(dir).map((file) => file.name);
    expect(names.sort()).toEqual(['icons/icon.png', 'manifest.webmanifest']);
  });

  it('returns nothing when there is no public folder', () => {
    expect(readPublicFiles('')).toEqual([]);
  });
});
