import { describe, expect, it } from 'vitest';
import { findJsFiles } from '../../scripts/jsFiles.ts';

// Owns the path filter of `npm run check:no-js`; reading the file list from git is left to the script itself.
describe('findJsFiles', () => {
  it('reports .js, .mjs and .cjs files anywhere outside vendor/', () => {
    const paths = ['sw.js', 'scripts/old.mjs', 'build/plugin.cjs', 'src/main.ts', 'tests/e2e/smoke.spec.ts'];
    expect(findJsFiles(paths)).toEqual(['sw.js', 'scripts/old.mjs', 'build/plugin.cjs']);
  });

  it('allows the vendored three.js copy until Phase 6 deletes vendor/', () => {
    expect(findJsFiles(['vendor/three/three.module.js', 'src/vendor/x.js'])).toEqual(['src/vendor/x.js']);
  });

  it('does not match an extension that only starts like one', () => {
    expect(findJsFiles(['data.json', 'notes.jsx.md', 'types.d.ts'])).toEqual([]);
  });
});
