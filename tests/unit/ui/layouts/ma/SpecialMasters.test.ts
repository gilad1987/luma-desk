import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpecialMasters } from '../../../../../src/ui/layouts/ma/SpecialMasters';
import { FakeDom, FakeElement } from '../../../../shared/dom';

/** A strip part that accepts the change listeners the strip adds; its own parts are the same kind. */
class Part extends FakeElement {
  readonly addEventListener = vi.fn();
  override querySelector(selector: string): FakeElement | null {
    if (!this.parts.has(selector)) this.parts.set(selector, new Part());
    return super.querySelector(selector);
  }
}

/** A slider with the range the strip reads and the events it fires. */
class Slider extends FakeElement {
  readonly dispatchEvent = vi.fn();
  readonly min: string;
  readonly max: string;
  constructor(min: string, max: string) {
    super('input');
    this.min = min;
    this.max = max;
  }
}

/** The four sliders by id; AUTO gets a 20..80 range so the strip must use min and max, not 0..100. */
const RANGES = [
  ['house', '0', '100'],
  ['haze', '0', '100'],
  ['aEnergy', '0', '100'],
  ['aMaster', '20', '80'],
] as const;

describe('SpecialMasters (same strips as the original MA special masters)', () => {
  let dom: FakeDom, host: FakeElement, sliders: Slider[];
  beforeEach(() => {
    dom = new FakeDom();
    Object.assign(document, { createElement: (tag: string) => new Part(tag) });
    host = dom.add('maSpecs');
    sliders = RANGES.map(([id, min, max]) => dom.add(id, new Slider(min, max)));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('builds one strip per slider with the markup of the old SPECS.forEach', () => {
    new SpecialMasters();
    const legacy = (i: number, name: string): string =>
      `<span class="sk">S${i + 1}</span><span class="sn">${name}</span><span class="sv"></span><span class="sl"></span>` +
      '<div class="fader"><div class="ff"></div><div class="cap"></div></div>';
    expect(host.children.map((c) => [c.className, c.innerHTML])).toEqual(
      ['HOUSE', 'HAZE', 'ENERGY', 'AUTO'].map((name, i) => ['spc', legacy(i, name)]),
    );
  });

  it('paints value, --lv, fill and cap from each slider, with the same strings as before', () => {
    const masters = new SpecialMasters();
    sliders.forEach((s, i) => (s.value = String([29, 0, 100, 50][i])));
    masters.paint();
    const strips = host.children;
    expect(strips.map((s) => s.style.custom.get('--lv'))).toEqual(['0.29', '0', '1', '0.5']);
    expect(strips.map((s) => s.part('.sv').textContent)).toEqual(['29', '0', '100', '50']);
    expect(strips.map((s) => s.part('.ff').style.height)).toEqual([0.29 * 100 + '%', '0%', '100%', '50%']);
    expect(strips.map((s) => s.part('.cap').style.bottom)).toEqual([0.29 * 100 + '%', '0%', '100%', '50%']);
  });

  it('paint writes the parts found at build time and looks nothing up again', () => {
    const masters = new SpecialMasters();
    const lookups = host.children.map((strip) => vi.spyOn(strip, 'querySelector'));
    sliders.forEach((s) => (s.value = '70'));
    masters.paint();
    masters.paint();
    for (const spy of lookups) expect(spy).not.toHaveBeenCalled();
    expect(host.children.map((s) => s.part('.sv').textContent)).toEqual(['70', '70', '70', '70']);
  });
});
