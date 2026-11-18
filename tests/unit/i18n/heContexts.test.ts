import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { he } from '../../../src/i18n/he';
import { NEW_TEXT_AREAS } from '../../shared';

/** The single-file page before the refactor: the source of truth for every Hebrew string. */
const legacy = execFileSync('git', ['show', '48a3b63:index.html'], { encoding: 'utf8' });

/**
 * Each named string by its path in `he`, with the exact legacy code around it (`{}` marks the string). The order test
 * in he.test.ts cannot see two key names swapped in place; this table pins each name to the one place it came from.
 */
const CONTEXTS: Readonly<Record<string, string>> = {
  'topBar.rec.unsupported': "!window.MediaRecorder) { toast('{}')",
  'topBar.rec.cannotStart': "catch (e) { toast('{}'); return; }",
  'topBar.rec.saved': "$('#recBtn').textContent = '● REC'; toast('{}')",
  'topBar.rec.started': "$('#recBtn').classList.add('on'); toast('{}')",
  'topBar.fullscreen.unavailable': "requestFullscreen?.().catch(() => toast('{}'))",
  'topBar.install.done': "$('#installBtn').style.display = 'none'; toast('{}')",
  'messages.selectFixturesFirst': "if (!sel.length) { toast('{}')",
  'messages.color.noColorControl': "if (!ok.length) toast('{}')",
  'messages.color.noneLit': "toast('{}'); return []; }",
  'messages.show.downloaded': "`luma-show-${stamp()}.json`); toast('{}')",
  'panels.layoutTitle': '<select id="layoutSel" title="{}">',
  'panels.zoomTitle': '<select id="deskZoom" title="{}">',
  'panels.recTitle': '<button id="recBtn" title="{}">',
  'panels.fullscreenTitle': '<button id="fsBtn" title="{}">',
  'panels.install': '<button id="installBtn" style="display:none">{}</button>',
  'panels.guide': '<button id="helpBtn" class="on">{}</button>',
  'guide.frame.close': '<button id="gClose">{}</button>',
  'guide.frame.prev': '<button id="gPrev">{}</button>',
  'guide.frame.next': '<button id="gNext">{}</button>',
  'guide.nav.title': '<div class="gt"><i></i>{}</div>',
  'guide.nav.tourButton': '<button class="tourBtn" id="gTour">{}</button>',
  'tour.next': '<button class="nx" id="tNext">{}</button>',
  'tour.end': '<button id="tEnd">{}</button>',
};

/** The path of every string held by a plain object in `node` (arrays are positional and checked in he.test.ts). */
function namedStringPaths(node: object, prefix = ''): string[] {
  if (Array.isArray(node)) return [];
  return Object.entries(node).flatMap(([key, value]: [string, unknown]) => {
    if (typeof value === 'string') return [prefix + key];
    return value && typeof value === 'object' ? namedStringPaths(value, `${prefix}${key}.`) : [];
  });
}

/** The value at a dotted path of `he`. */
function stringAt(path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, key) => (node && typeof node === 'object' ? new Map(Object.entries(node)).get(key) : undefined),
      he,
    );
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('he key names', () => {
  it('pins every named string to its exact legacy context', () => {
    for (const [path, context] of Object.entries(CONTEXTS)) {
      const text = stringAt(path);
      expect(typeof text, path).toBe('string');
      expect(legacy, path).toContain(context.replace('{}', String(text)));
    }
  });

  it('pins each auto-style tagline to its style id', () => {
    for (const [id, text] of Object.entries(he.autoStyleTaglines)) {
      expect(legacy, id).toMatch(new RegExp(`\\b${id}: \\{ name: '[^']*', he: '${escapeRegExp(text)}'`));
    }
  });

  it('leaves no named string out of the table', () => {
    expect(Object.keys(he.autoStyleTaglines)).toHaveLength(9);
    // the taglines are pinned by style id above; the new-text areas have no legacy context
    const named = Object.fromEntries(
      Object.entries(he).filter(([area]) => !['autoStyleTaglines', ...NEW_TEXT_AREAS].includes(area)),
    );
    expect(namedStringPaths(named).sort()).toEqual(Object.keys(CONTEXTS).sort());
  });
});
