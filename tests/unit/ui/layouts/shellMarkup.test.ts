import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { guideMarkup } from '../../../../src/ui/guide/guideMarkup';
import { appShellMarkup } from '../../../../src/ui/layouts/appShellMarkup';
import { DESK_CONSOLE_MARKUP } from '../../../../src/ui/layouts/deskConsoleMarkup';
import { MA_CONSOLE_MARKUP } from '../../../../src/ui/layouts/maConsoleMarkup';

/** Whitespace runs render as one space (or nothing between blocks), so compare with them collapsed. */
const collapse = (html: string): string => html.replace(/\s+/g, ' ').trim();
/** The legacy page has no formatter whitespace between tags; compare structure and text only. */
const tagsOnly = (html: string): string =>
  collapse(html)
    .replace(/ >/g, '>')
    .replace(/> </g, '><')
    .replace(/ style="([^"]*)"/g, (_, s: string) => ` style="${s.replace(/[: ;]+/g, '')}"`);

const page = collapse(readFileSync('index.html', 'utf8'));
const legacy = tagsOnly(execFileSync('git', ['show', '48a3b63:index.html'], { encoding: 'utf8' }));

describe('shell markup', () => {
  for (const [name, markup] of [
    ['desk console', DESK_CONSOLE_MARKUP],
    ['MA console', MA_CONSOLE_MARKUP],
    ['guide and tour', guideMarkup()],
  ] as const) {
    it(`${name} matches the current page and the legacy page`, () => {
      expect(page).toContain(collapse(markup));
      expect(legacy).toContain(tagsOnly(markup));
    });
  }

  it('wraps the panel slots in the legacy containers, in order', () => {
    const shell = collapse(appShellMarkup({ top: 'T', viewer: 'V', side: 'S', enc: 'E', desk: 'D' }));
    expect(shell).toMatch(
      /^<div id="app"> <header id="top">T<\/header> <main id="main"> <section id="viewer">V<\/section> <aside id="side">S<\/aside> <\/main> <section id="enc">E<\/section> <section id="console">/,
    );
    expect(shell).toMatch(/<\/section> <footer id="desk">D<\/footer> <\/div> <div id="guide">/);
    expect(shell.endsWith('<div id="modal"><div class="mbox" id="mbox"></div></div> <div id="toast"></div>')).toBe(
      true,
    );
  });
});
