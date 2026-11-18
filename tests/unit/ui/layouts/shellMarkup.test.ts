import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { guideMarkup } from '../../../../src/ui/guide/guideMarkup';
import { appShellMarkup } from '../../../../src/ui/layouts/appShellMarkup';
import { DESK_CONSOLE_MARKUP } from '../../../../src/ui/layouts/deskConsoleMarkup';
import { MA_CONSOLE_MARKUP } from '../../../../src/ui/layouts/maConsoleMarkup';
import { encodersMarkup } from '../../../../src/ui/panels/encoders/encodersMarkup';
import { topBarMarkup } from '../../../../src/ui/panels/top/topBarMarkup';
import { legacyPage } from '../../../shared/legacy';

/** Elements that are block-level in these fragments (no stylesheet makes any of them inline). */
const BLOCK = 'div|section|nav|header|main|aside|footer|h2|h4|p';
const breakAfterBlock = new RegExp(`(<\\/?(?:${BLOCK})\\b[^>]*>)\\n\\s*(?=<)`, 'g');
const breakBeforeBlock = new RegExp(`>\\n\\s*(?=<\\/?(?:${BLOCK})\\b)`, 'g');

/**
 * The markup the parser and the CSS see, without the layout Prettier adds. Exactly three differences are dropped:
 * a line break plus indent inside an end tag (`</i\n  >`), which the tokenizer discards; a line break plus indent
 * between two tags where one side is a block element, which is collapsible white space at a line start or end and
 * renders nothing; and spaces around `:` and `;` in a style attribute, which CSS parsing ignores. A line break between
 * two inline elements would render a space, so it is kept and fails the comparison.
 */
function renderEquivalent(html: string): string {
  return html
    .replace(/(<\/[a-z0-9]+)\n\s*>/g, '$1>')
    .replace(breakAfterBlock, '$1')
    .replace(breakBeforeBlock, '>')
    .replace(/ style="([^"]*)"/g, (_, s: string) => ` style="${s.replace(/\s*([:;])\s*/g, '$1')}"`);
}

const page = readFileSync('index.html', 'utf8');
const legacySource = legacyPage();
const legacy = renderEquivalent(legacySource);

describe('shell markup', () => {
  it('keeps a line break between two inline elements, so it cannot hide a rendered space', () => {
    expect(renderEquivalent('<b>a</b>\n  <i>b</i>')).toBe('<b>a</b>\n  <i>b</i>');
  });

  for (const [name, markup] of [
    ['desk console', DESK_CONSOLE_MARKUP],
    ['MA console', MA_CONSOLE_MARKUP],
    ['guide and tour', guideMarkup()],
  ] as const) {
    it(`${name} is render-equivalent to the legacy page`, () => {
      expect(legacy).toContain(renderEquivalent(markup));
    });
  }

  it('leaves the page body to the composition root: index.html holds only the module script', () => {
    expect(page).toMatch(/<body>\s*<script type="module" src="\.\/src\/main\.ts"><\/script>\s*<\/body>/);
  });

  it('wraps the panel slots in the legacy containers, in order', () => {
    const shell = renderEquivalent(appShellMarkup({ viewer: 'V', side: 'S', desk: 'D' }));
    expect(shell).toMatch(
      /^<div id="app"><main id="main"><section id="viewer">V<\/section><aside id="side">S<\/aside><\/main><section id="console">/,
    );
    expect(shell).toMatch(/<\/section><footer id="desk">D<\/footer><\/div><div id="guide">/);
  });

  it('leaves header#top and section#enc to TopBar and EncodersPanel, so each is in the page once', () => {
    const shell = appShellMarkup({ viewer: '', side: '', desk: '' });
    const withPanels = shell
      .replace('<div id="app">', `<div id="app">${topBarMarkup}`)
      .replace('</main>', `</main>${encodersMarkup}`);
    for (const tag of ['<header id="top">', '<section id="enc">']) {
      expect(shell).not.toContain(tag);
      expect(withPanels.split(tag)).toHaveLength(2);
      expect(legacySource.split(tag)).toHaveLength(2);
    }
    const order = (html: string): number[] =>
      ['<header id="top">', '<main id="main">', '</main>', '<section id="enc">', '<section id="console">'].map((t) =>
        html.indexOf(t),
      );
    expect(order(withPanels)).toEqual([...order(withPanels)].sort((a, b) => a - b));
    expect(order(legacySource)).toEqual([...order(legacySource)].sort((a, b) => a - b));
  });

  it('ends with the legacy overlay bytes', () => {
    const tail = '\n<div id="modal"><div class="mbox" id="mbox"></div></div>\n<div id="toast"></div>';
    expect(legacySource).toContain(`</div>${tail}\n`);
    expect(appShellMarkup({ viewer: '', side: '', desk: '' }).endsWith(tail)).toBe(true);
  });
});
