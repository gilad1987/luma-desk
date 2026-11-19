// @vitest-environment jsdom
/**
 * `raiseVersion` raises only a version the file declares: a missing or blank `verMajor` or `verMinor` is no version
 * 0, so the root keeps it as it is and the summary says nothing of a "declared MVR 0.0".
 */
import { describe, expect, it } from 'vitest';
import { raiseVersion } from '../../../../src/mvr/export/passThrough/rootAttributes.ts';
import { parseXml } from '../../../../src/mvr/xml/parseXml.ts';

const rootOf = (attributes: string): Element => parseXml(`<GeneralSceneDescription ${attributes}/>`).documentElement;
const version = (root: Element): (string | null)[] => [root.getAttribute('verMajor'), root.getAttribute('verMinor')];

describe('raiseVersion', () => {
  it.each([
    ['no version', '', [null, null]],
    ['no minor', 'verMajor="1"', ['1', null]],
    ['no major', 'verMinor="4"', [null, '4']],
    ['blank parts', 'verMajor="" verMinor=" "', ['', ' ']],
  ])('keeps %s', (_, attributes, kept) => {
    const root = rootOf(attributes);
    expect(raiseVersion(root)).toBeUndefined();
    expect(version(root)).toEqual(kept);
  });

  it('raises a declared 1.4 to 1.6', () => {
    const root = rootOf('verMajor="1" verMinor="4"');
    expect(raiseVersion(root)).toBe('1.4');
    expect(version(root)).toEqual(['1', '6']);
  });
});
