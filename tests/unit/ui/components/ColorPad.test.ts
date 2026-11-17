import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { colorPad } from '../../../../src/ui/components/ColorPad';
import { asReal } from '../fakes/asReal';
import { FakeCanvas } from '../fakes/FakeElement';
import { pointer } from '../fakes/fakePointer';
import { FakeDom } from '../fakes/installFakeDom';

/** A canvas whose 2D context records every fill. */
class PaintCanvas extends FakeCanvas {
  width = 3;
  height = 2;
  readonly fills: string[] = [];
  readonly context = {
    fillStyle: '',
    fillRect: () => this.fills.push(this.context.fillStyle),
  };
  getContext(): typeof this.context {
    return this.context;
  }
}

const programmerWith = (targets: number[]) => ({ colorTargets: vi.fn(() => targets), set: vi.fn() });

describe('colorPad', () => {
  let dom: FakeDom;
  beforeEach(() => (dom = new FakeDom()));
  afterEach(() => vi.unstubAllGlobals());

  const setup = (targets: number[]) => {
    const canvas = new PaintCanvas();
    canvas.rect = { left: 0, top: 0, width: 3, height: 2 };
    canvas.offsetParent = dom.body;
    const programmer = programmerWith(targets);
    colorPad(asReal<HTMLCanvasElement>(canvas), programmer);
    return { canvas, programmer };
  };

  it('paints one rect per pixel with 0..255 channels (Q21, not cssRgb)', () => {
    const { canvas } = setup([]);
    expect(canvas.fills).toHaveLength(6);
    expect(canvas.fills[0]).toBe('rgb(255,0,0)');
    expect(canvas.fills[1]).toBe('rgb(255,127.5,127.5)');
  });

  it('does not capture without colour targets', () => {
    const { canvas, programmer } = setup([]);
    canvas.onpointerdown?.(pointer(1, 1));
    expect(canvas.captured.size).toBe(0);
    expect(programmer.set).not.toHaveBeenCalled();
  });

  it('sets full-value hue and saturation on the targets fixed at pointer-down', () => {
    const { canvas, programmer } = setup([7]);
    canvas.onpointerdown?.(pointer(0, 0));
    expect(canvas.captured.has(1)).toBe(true);
    expect(programmer.set.mock.calls).toEqual([
      [7, 'r', 100],
      [7, 'g', 0],
      [7, 'b', 0],
    ]);
  });
});
