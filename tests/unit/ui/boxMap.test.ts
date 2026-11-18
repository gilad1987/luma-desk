import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byId } from '../../../src/ui/dom';
import { boxMap } from '../../../src/ui/shared';
import { FakeCanvas, FakeDom } from '../../shared/dom';

/** A real perspective: x and y shrink with depth, which grows down the screen (the MA console tilt). */
const tilt = (x: number, y: number): readonly [number, number] => {
  const w = 1 + 0.002 * y;
  return [(30 + 2 * x) / w, (40 + 1.5 * y) / w];
};

describe('boxMap', () => {
  let dom: FakeDom;
  beforeEach(() => (dom = new FakeDom()));
  afterEach(() => vi.unstubAllGlobals());

  it('inverts the projected quad: a projected box point maps back to its 0..1 position', () => {
    const pad = dom.add('pad');
    Object.assign(pad, { offsetWidth: 200, offsetHeight: 100, clientLeft: 3, clientTop: 2 });
    dom.project = tilt;
    const map = boxMap(byId('pad'));
    // the probes sit at the border-box corners (offset by -clientLeft/-clientTop) and are removed again
    const [x, y] = tilt(-3 + 50, -2 + 75);
    const [u, v] = map({ clientX: x, clientY: y });
    expect(u).toBeCloseTo(0.25, 10);
    expect(v).toBeCloseTo(0.75, 10);
    expect(pad.children).toEqual([]);
  });

  it('scales the size by the CSS zoom for relative drags', () => {
    Object.assign(dom.add('knob'), { offsetWidth: 40, offsetHeight: 50, currentCSSZoom: 1.5 });
    const map = boxMap(byId('knob'));
    expect([map.w, map.h]).toEqual([60, 75]);
  });

  it('falls back to the bounding rectangle for a zero-size box', () => {
    dom.add('wheel').rect = { left: 10, top: 20, width: 40, height: 80 };
    const map = boxMap(byId('wheel'));
    expect(map({ clientX: 20, clientY: 40 })).toEqual([0.25, 0.25]);
    expect([map.w, map.h]).toEqual([40, 80]);
  });

  it('puts a canvas probe in its offset parent at the canvas offset', () => {
    const host = dom.add('host');
    const canvas = dom.add('pad', new FakeCanvas());
    Object.assign(canvas, { offsetParent: host, offsetLeft: 7, offsetTop: 9, offsetWidth: 100, offsetHeight: 50 });
    const map = boxMap(byId('pad'));
    expect(map({ clientX: 7 + 50, clientY: 9 + 25 })).toEqual([0.5, 0.5]);
    expect(host.children).toEqual([]);
  });

  it('throws for a canvas without an offset parent', () => {
    dom.add('pad', new FakeCanvas());
    expect(() => boxMap(byId('pad'))).toThrow('no offset parent');
  });
});
