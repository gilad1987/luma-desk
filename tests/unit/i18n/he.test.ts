import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { he } from '../../../src/i18n/he';
import type { GuideMarkup } from '../../../src/i18n/he/guideChapter';

/** The single-file page before the refactor: the source of truth for every Hebrew string. */
const legacy = execFileSync('git', ['show', '48a3b63:index.html'], { encoding: 'utf8' });

/** Every plain string under `node`, functions and the chapter bodies excluded. */
function leaves(node: unknown): string[] {
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(leaves);
  if (node && typeof node === 'object') return Object.values(node).flatMap(leaves);
  return [];
}

/** Renders a chapter back into its source form, so it can be found verbatim in the legacy script. */
const sourceForm: GuideMarkup = {
  kbd: (k) => `\${K('${k}')}`,
  code: (c) => `\${CD('${c}')}`,
  rigRows: () => '\u0000',
  groupRows: () => '\u0000',
};

describe('he', () => {
  it('holds only strings that the legacy page has byte for byte', () => {
    const strings = leaves(he);
    expect(strings.length).toBeGreaterThan(80);
    for (const s of strings) expect(legacy, s).toContain(s);
  });

  it('renders every guide chapter body exactly as the legacy template literal', () => {
    expect(he.guide.chapters).toHaveLength(12);
    for (const chapter of he.guide.chapters) {
      let from = 0;
      for (const piece of chapter.html(sourceForm).split('\u0000')) {
        const at = legacy.indexOf(piece, from);
        expect(at, `${chapter.title}: ${piece.slice(0, 60)}`).toBeGreaterThan(-1);
        from = at + piece.length;
      }
    }
  });

  it('keeps the counted and layout-dependent strings', () => {
    expect(he.guide.fixturesCount(12)).toBe('12 גופים');
    expect(legacy).toContain('${g.ids.length} גופים');
    expect(he.tour.steps).toHaveLength(17);
    expect(he.guide.rigLocations).toHaveLength(23);
  });

  it('keeps the auto-show taglines for the style grid', () => {
    expect(Object.keys(he.autoStyleTaglines)).toHaveLength(9);
  });
});
