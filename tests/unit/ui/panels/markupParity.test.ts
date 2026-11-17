import { describe, expect, it } from 'vitest';
import { commandLineMarkup } from '../../../../src/ui/panels/command/commandLineMarkup';
import { poolsMarkup } from '../../../../src/ui/panels/pools/poolsMarkup';
import { sequenceMarkup } from '../../../../src/ui/panels/sequence/sequenceMarkup';
import { sheetMarkup } from '../../../../src/ui/panels/sheet/sheetMarkup';
import { sideTabsMarkup } from '../../../../src/ui/panels/side/sideTabsMarkup';
import { topBarMarkup } from '../../../../src/ui/panels/top/topBarMarkup';
import { legacyMarkup } from './fakes/legacyMarkup';

// byte for byte, whitespace included: no normalisation, so no whitespace claim needs proof
describe('panel markup equals the original page', () => {
  it.each([
    ['sideTabs', sideTabsMarkup],
    ['pools', poolsMarkup],
    ['sequence', sequenceMarkup],
    ['sheet', sheetMarkup],
    ['commandLine', commandLineMarkup],
    ['topBar', topBarMarkup],
  ])('%s', (name, markup) => {
    expect(markup).toBe(legacyMarkup(name));
  });
});
