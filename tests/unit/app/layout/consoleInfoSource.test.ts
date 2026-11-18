import { describe, expect, it } from 'vitest';
import { consoleInfoSource } from '../../../../src/app/layout/consoleInfoSource';
import type { FeatureTab } from '../../../../src/ui/panels/encoders/encoderList';
import type { SideTab } from '../../../../src/ui/panels/side/sideTabsMarkup';

interface ConsoleState {
  tab: SideTab;
  feature: FeatureTab;
  ids: readonly number[];
  selExec: number;
}

/** A source over fresh state that it reads through getters, so a test can show it reads at call time. */
function setup(selExec: number) {
  const state: ConsoleState = { tab: 'sheet', feature: 'dim', ids: [1, 2, 3], selExec };
  const read = consoleInfoSource({
    sideTabs: {
      get current() {
        return state.tab;
      },
      show: () => undefined,
    },
    encoders: {
      get feature() {
        return state.feature;
      },
    },
    selection: {
      get ids() {
        return state.ids;
      },
    },
    appState: {
      get selExec() {
        return state.selExec;
      },
    },
    execs: [{ name: 'Intro' }, { name: '' }],
  });
  return { state, read };
}

describe('consoleInfoSource', () => {
  it('reports the tab, feature, selection count and executor', () => {
    const { read } = setup(0);
    expect(read()).toEqual({ sideTab: 'sheet', feature: 'dim', selected: 3, execIndex: 0, execName: 'Intro' });
  });

  it('reads the state again on every call', () => {
    const { state, read } = setup(0);
    read();
    Object.assign(state, { tab: 'pools', feature: 'pos', ids: [], selExec: 1 });
    expect(read()).toEqual({ sideTab: 'pools', feature: 'pos', selected: 0, execIndex: 1, execName: '' });
  });

  it('reads an executor outside the list as unnamed', () => {
    expect(setup(5).read().execName).toBe('');
  });
});
