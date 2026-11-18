import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byId, requireChild } from '../../../src/ui/dom';
import { FakeDom, FakeElement } from '../../shared/dom';

class FakeInput extends FakeElement {}

describe('ui/dom', () => {
  let dom: FakeDom;
  beforeEach(() => (dom = new FakeDom()));
  afterEach(() => vi.unstubAllGlobals());

  it('byId returns the element with the id', () => {
    const toast = dom.add('toast');
    expect(byId('toast')).toBe(toast);
  });

  it('byId throws on a missing id instead of returning null', () => {
    expect(() => byId('nope')).toThrow('#nope is missing from the page');
  });

  it('byId checks the element kind when one is given', () => {
    vi.stubGlobal('HTMLInputElement', FakeInput);
    const input = dom.add('mIn', new FakeInput());
    dom.add('mOk');
    expect(byId('mIn', HTMLInputElement)).toBe(input);
    expect(() => byId('mOk', HTMLInputElement)).toThrow('#mOk is not a FakeInput');
  });

  it('requireChild returns the matching child and throws when nothing matches', () => {
    const root = dom.add('gmFader');
    root.parts.set('.gone', null);
    expect(requireChild(byId('gmFader'), '.ff')).toBe(root.part('.ff'));
    expect(() => requireChild(byId('gmFader'), '.gone')).toThrow('no HTML element matches .gone');
  });
});
