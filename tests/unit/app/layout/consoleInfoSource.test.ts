import { describe, expect, it } from 'vitest';
import { consoleInfoSource } from '../../../../src/app/layout/consoleInfoSource';
import type { SideTab } from '../../../../src/ui/panels/side/sideTabsMarkup';

/** Mutable state the source reads through getters, so a test can show it reads at call time. */
const state = { tab: 'sheet' as SideTab, feature: 'dim', ids: [1, 2, 3] as readonly number[], selExec: 1 };

const read = consoleInfoSource({
  sideTabs: {
    get current() {
      return state.tab;
    },
    show: () => undefined,
  },
  feature: () => state.feature,
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

describe('consoleInfoSource', () => {
  it('reports the tab, feature, selection count and executor', () => {
    state.selExec = 0;
    expect(read()).toEqual({ sideTab: 'sheet', feature: 'dim', selected: 3, execIndex: 0, execName: 'Intro' });
  });

  it('reads the state again on every call', () => {
    Object.assign(state, { tab: 'pools', feature: 'pos', ids: [], selExec: 1 });
    expect(read()).toEqual({ sideTab: 'pools', feature: 'pos', selected: 0, execIndex: 1, execName: '' });
  });

  it('reads an executor outside the list as unnamed', () => {
    state.selExec = 5;
    expect(read().execName).toBe('');
  });
});
