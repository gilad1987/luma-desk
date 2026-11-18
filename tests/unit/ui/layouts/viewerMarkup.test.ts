import { describe, expect, it } from 'vitest';
import { viewerMarkup } from '../../../../src/ui/layouts/viewerMarkup';
import { cueHudMarkup } from '../../../../src/ui/panels/executors/cueHudMarkup';
import { legacyPage } from '../../../shared/legacy';

const legacy = legacyPage();
const open = '<section id="viewer">';
const legacyViewer = legacy.slice(
  legacy.indexOf(open) + open.length,
  legacy.indexOf('</section>', legacy.indexOf(open)),
);
const tip = '<div id="tip"></div>';

describe('viewer markup', () => {
  it('is the legacy viewer children byte for byte once the executors panel adds the cue HUD after #tip', () => {
    expect(legacyViewer).toContain(cueHudMarkup);
    expect(viewerMarkup.replace(tip, `${tip}\n      ${cueHudMarkup}`)).toBe(legacyViewer);
  });

  it('holds every element the renderer and the HUD look up, and no cue HUD of its own', () => {
    for (const id of ['c', 'ov', 'selRect', 'vhud', 'selInfo', 'progInfo', 'tip', 'viewHint']) {
      expect(viewerMarkup).toContain(`id="${id}"`);
    }
    expect(viewerMarkup).not.toContain('cueHud');
  });
});
