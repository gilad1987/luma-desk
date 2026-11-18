/** Checks the tour's view switches: side panes go through SideTabs.show (legacy `sideTo`), features click their tab. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTourHooks } from '../../../../src/app/io/createTourHooks';
import { FakeElement } from '../../../shared/dom';

class ClickableElement extends FakeElement {
  readonly click = vi.fn();
}

function setup() {
  const clicked: string[] = [];
  vi.stubGlobal('HTMLElement', FakeElement);
  vi.stubGlobal('document', {
    querySelector: (selector: string) => {
      const element = new ClickableElement();
      element.click.mockImplementation(() => clicked.push(selector));
      return element;
    },
  });
  return { clicked, sideTabs: { show: vi.fn() } };
}

describe('createTourHooks', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('switches the side pane through SideTabs.show, which owns the MA skip of pools', () => {
    const { clicked, sideTabs } = setup();
    const hooks = createTourHooks(sideTabs, () => true);
    hooks.showSide('pools');
    hooks.showSide('auto');
    expect([sideTabs.show.mock.calls, clicked]).toEqual([[['pools'], ['auto']], []]);
  });

  it('clicks the feature tab and reports the layout through isMa', () => {
    const { clicked, sideTabs } = setup();
    let isMa = false;
    const hooks = createTourHooks(sideTabs, () => isMa);
    hooks.showFeature('pos');
    isMa = true;
    expect([clicked, hooks.isMa(), sideTabs.show.mock.calls]).toEqual([['#featTabs [data-f=pos]'], true, []]);
  });
});
