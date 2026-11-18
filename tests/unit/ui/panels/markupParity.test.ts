import { describe, expect, it } from 'vitest';
import { commandLineMarkup } from '../../../../src/ui/panels/command/commandLineMarkup';
import { poolsMarkup } from '../../../../src/ui/panels/pools/poolsMarkup';
import { sequenceMarkup } from '../../../../src/ui/panels/sequence/sequenceMarkup';
import { sheetMarkup } from '../../../../src/ui/panels/sheet/sheetMarkup';
import { sideTabsMarkup } from '../../../../src/ui/panels/side/sideTabsMarkup';
import { buildStageButton, topBarMarkup } from '../../../../src/ui/panels/top/topBarMarkup';
import { legacyMarkup } from '../../../shared/legacy';

/**
 * The one declared exception: the Stage Builder adds the "Build Stage" button to the top bar, which the original page
 * did not have. The test removes exactly that constant, once, and the rest of the bar must still match byte for byte.
 */
const topBarWithoutBuildButton = (): string => {
  expect(topBarMarkup.split(buildStageButton)).toHaveLength(2);
  return topBarMarkup.replace(buildStageButton, '');
};

// byte for byte, whitespace included: no normalisation, so no whitespace claim needs proof
describe('panel markup equals the original page', () => {
  it('topBar, except the declared Build Stage button', () => {
    expect(topBarWithoutBuildButton()).toBe(legacyMarkup('topBar'));
  });

  it.each([
    ['sideTabs', sideTabsMarkup],
    ['pools', poolsMarkup],
    ['sequence', sequenceMarkup],
    ['sheet', sheetMarkup],
    ['commandLine', commandLineMarkup],
  ])('%s', (name, markup) => {
    expect(markup).toBe(legacyMarkup(name));
  });
});
