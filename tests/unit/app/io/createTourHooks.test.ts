/** Checks the tour's tab switches: they click the real tab buttons, and skip `pools` in the MA layout (legacy `sideTo`). */
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
  return clicked;
}

describe('createTourHooks', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('clicks the side tab, except pools while the MA layout is on', () => {
    const clicked = setup();
    const ma = createTourHooks(() => true),
      desk = createTourHooks(() => false);
    ma.showSide('pools');
    ma.showSide('sheet');
    desk.showSide('pools');
    expect(clicked).toEqual(['#sideTabs [data-t=sheet]', '#sideTabs [data-t=pools]']);
  });

  it('clicks the feature tab and reports the layout through isMa', () => {
    const clicked = setup();
    let isMa = false;
    const hooks = createTourHooks(() => isMa);
    hooks.showFeature('pos');
    isMa = true;
    expect([clicked, hooks.isMa()]).toEqual([['#featTabs [data-f=pos]'], true]);
  });
});
