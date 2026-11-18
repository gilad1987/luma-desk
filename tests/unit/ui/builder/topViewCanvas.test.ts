/**
 * Owns the canvas box cache of the top view: the box is read once at mount and then only when the resize observer
 * reports a change, never on a drag frame, and dispose stops the observer. That a resize refits the drawn canvas is in
 * `topView.test.ts`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TopViewCanvas } from '../../../../src/ui/builder/TopViewCanvas';
import { asReal, FakeCanvas, FakeDom, FakeResizeObserver } from '../../../shared/dom';
import { prop } from './toolsDom';

/** A 448 px canvas whose `offsetWidth` reads are counted, with the CSS palette faked. */
function mountCanvas() {
  new FakeDom();
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (name: string) => name }));
  const element = new FakeCanvas('canvas');
  const reads = vi.fn(() => 448);
  Object.defineProperty(element, 'offsetWidth', { get: reads });
  Object.assign(element, { offsetHeight: 448 });
  const canvas = new TopViewCanvas(asReal<HTMLCanvasElement>(element));
  return { element, canvas, reads };
}

describe('TopViewCanvas', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the canvas box once at mount and not again on the following drag frames', () => {
    const { canvas, reads } = mountCanvas();
    for (let frame = 0; frame < 5; frame++) canvas.fit();
    expect(reads).toHaveBeenCalledTimes(1);
  });

  it('reads the box again only when the resize observer fires, and resizes the canvas on the next frame', () => {
    const { element, canvas, reads } = mountCanvas();
    canvas.fit();
    reads.mockReturnValue(300);
    canvas.fit();
    const beforeResize = prop(element, 'width');
    FakeResizeObserver.resizeAll();
    canvas.fit();
    canvas.fit();
    expect([beforeResize, reads.mock.calls.length, prop(element, 'width')]).toEqual([448, 2, 300]);
  });

  it('stops observing the canvas on dispose', () => {
    const { element, canvas } = mountCanvas();
    const observed = FakeResizeObserver.made.flatMap((observer) => observer.targets);
    canvas.dispose();
    const after = FakeResizeObserver.made.flatMap((observer) => observer.targets);
    expect([observed, after]).toEqual([[element], []]);
  });
});
