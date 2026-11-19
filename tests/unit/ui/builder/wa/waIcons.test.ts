/**
 * Owns the builder's inline icon markup: one safe, self-contained SVG per name. How an icon looks is owned by the
 * builder screenshots in tests/e2e/.
 */
import { describe, expect, it } from 'vitest';
import { WA_ICON_PATHS } from '../../../../../src/ui/builder/wa/waIconPaths';
import { iconSvg, type WaIconName } from '../../../../../src/ui/builder/wa/waIcons';

const isIconName = (key: string): key is WaIconName => key in WA_ICON_PATHS;
const NAMES = Object.keys(WA_ICON_PATHS).filter(isIconName);

describe('iconSvg', () => {
  // catches the checks below passing on an empty list
  it('has the eleven builder icons', () => {
    expect(NAMES).toHaveLength(11);
  });

  // catches a broken wrapper or a path entry that opens a second svg, which would draw two icons in one button
  it.each(NAMES)('draws %s as exactly one 20 px svg hidden from assistive technology', (name) => {
    const svg = iconSvg(name);
    expect([
      svg.split('<svg').length - 1,
      svg.includes('viewBox="0 0 20 20"'),
      svg.includes('aria-hidden="true"'),
    ]).toEqual([1, true, true]);
  });

  // catches a wa-icon, which fetches from the Font Awesome CDN and fails offline, and any script in the markup
  it.each(NAMES)('gives %s no wa-icon and no script', (name) => {
    const svg = iconSvg(name);
    // the wrapper's class is wa-icon-svg, so the check is on the element tag
    expect([svg.includes('<wa-icon'), svg.includes('<script')]).toEqual([false, false]);
  });
});
