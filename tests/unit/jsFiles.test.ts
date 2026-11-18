import { describe, expect, it } from 'vitest';
import { findJsFiles, readTrackedFiles } from '../../scripts/jsFiles.ts';

// Owns the path filter of `npm run check:no-js`; reading the file list from git is left to the script itself.
describe('findJsFiles', () => {
  it('reports .js, .mjs and .cjs files anywhere in the tree', () => {
    const paths = ['sw.js', 'scripts/old.mjs', 'build/plugin.cjs', 'src/main.ts', 'tests/e2e/smoke.spec.ts'];
    expect(findJsFiles(paths)).toEqual(['sw.js', 'scripts/old.mjs', 'build/plugin.cjs']);
  });

  it('reports a vendored copy too: vendor/ is no longer an exception', () => {
    const paths = ['vendor/three/three.module.js', 'src/vendor/x.js'];
    expect(findJsFiles(paths)).toEqual(['vendor/three/three.module.js', 'src/vendor/x.js']);
  });

  it('does not match an extension that only starts like one', () => {
    expect(findJsFiles(['data.json', 'notes.jsx.md', 'types.d.ts'])).toEqual([]);
  });
});

describe('readTrackedFiles', () => {
  it('splits the NUL-separated ls-files output and drops the trailing empty entry', () => {
    expect(readTrackedFiles(() => 'src/main.ts\0sw.ts\0')).toEqual(['src/main.ts', 'sw.ts']);
  });

  it('turns a git failure into one line that names the missing checkout', () => {
    const noCheckout = (): string => {
      throw new Error('fatal: not a git repository (or any of the parent directories): .git');
    };
    expect(() => readTrackedFiles(noCheckout)).toThrow(/^check:no-js needs a git checkout \(git ls-files\)$/);
  });
});
