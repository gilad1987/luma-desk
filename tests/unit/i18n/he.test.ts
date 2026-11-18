import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { he } from '../../../src/i18n/he';
import type { GuideMarkup } from '../../../src/i18n/he/guideChapter';

/** The single-file page before the refactor: the source of truth for every Hebrew string. */
const legacy = execFileSync('git', ['show', '48a3b63:index.html'], { encoding: 'utf8' });

/**
 * The plain strings of `node`, grouped by the object or array that holds them (siblings in declaration order);
 * functions and the chapter bodies are excluded.
 */
function siblingGroups(node: unknown): string[][] {
  if (!node || typeof node !== 'object') return [];
  const children: unknown[] = Object.values(node);
  const strings = children.filter((c): c is string => typeof c === 'string');
  return [...(strings.length ? [strings] : []), ...children.flatMap(siblingGroups)];
}

/**
 * How far apart two sibling strings may sit in the legacy page. Siblings came from one block of the page; the cap
 * stops a swapped string from matching a later copy of itself in the guide prose.
 */
const MAX_SIBLING_GAP = 1500;

/** Whether the group's strings follow each other in order, each within the gap, starting at legacy offset `at`. */
function followsFrom(group: readonly string[], at: number): boolean {
  let from = at;
  for (const s of group) {
    const next = legacy.indexOf(s, from);
    if (next === -1 || next - from > MAX_SIBLING_GAP) return false;
    from = next + s.length;
  }
  return true;
}

/** Every offset where `s` starts in the legacy page. */
function offsetsOf(s: string): number[] {
  const offsets: number[] = [];
  for (let at = legacy.indexOf(s); at !== -1; at = legacy.indexOf(s, at + 1)) offsets.push(at);
  return offsets;
}

/** Renders a chapter back into its source form, so it can be found verbatim in the legacy script. */
const sourceForm: GuideMarkup = {
  kbd: (k) => `\${K('${k}')}`,
  code: (c) => `\${CD('${c}')}`,
  rigRows: () => '\u0000',
  groupRows: () => '\u0000',
};

describe('he', () => {
  it('holds only legacy strings, siblings in the legacy order, so two swapped values fail', () => {
    // the stage builder's texts are new copy, so the legacy page has none of them
    const groups = siblingGroups({ ...he, builder: {} });
    expect(groups.flat().length).toBeGreaterThan(100);
    for (const group of groups) {
      const starts = offsetsOf(group[0] ?? '');
      expect(
        starts.some((at) => followsFrom(group, at)),
        group.join(' | '),
      ).toBe(true);
    }
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
    expect(he.messages.color.appliedToLit(3)).toBe('אין בחירה — הצבע הוחל על כל 3 הגופים הדולקים');
    expect(legacy).toContain('toast(`אין בחירה — הצבע הוחל על כל ${lit.length} הגופים הדולקים`)');
    expect(he.tour.steps).toHaveLength(17);
    expect(he.guide.rigLocations).toHaveLength(23);
  });

  it('keeps each programmer toast in the call the legacy page made', () => {
    const { color, selectFixturesFirst } = he.messages;
    for (const text of [color.noColorControl, color.noneLit, selectFixturesFirst]) {
      expect(legacy, text).toContain(`toast('${text}')`);
    }
  });

  it('keeps the auto-show taglines for the style grid', () => {
    expect(Object.keys(he.autoStyleTaglines)).toHaveLength(9);
  });
});
