import { vi } from 'vitest';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { EditorSession } from '../../../../src/ui/builder/EditorSession';
import { TopView } from '../../../../src/ui/builder/TopView';
import { asReal, FakeDom, FakeElement } from '../../../shared/dom';
import { fakeStage } from './fakeStage';

/** A 2D context that records every call and property write, so a test can read what was drawn. */
export function recordingContext(): { ctx: object; calls: unknown[][] } {
  const calls: unknown[][] = [];
  const get =
    (_target: object, name: string | symbol) =>
    (...args: unknown[]) =>
      void calls.push([String(name), ...args]);
  const set = (_target: object, name: string | symbol, value: unknown): boolean =>
    calls.push([`${String(name)}=`, value]) > 0;
  return { ctx: new Proxy({}, { get, set }), calls };
}

/**
 * A top view over the theatre template in a 448 px canvas, with the frames, the CSS palette and the 2D context faked:
 * a palette colour reads as its custom property name, and `runFrames` runs the pending frame by hand. Call
 * `vi.unstubAllGlobals()` after each test.
 */
export function mountTopView() {
  new FakeDom();
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (name: string) => name }));
  const stage = fakeStage(createTemplate('theatre'));
  const session = new EditorSession({ stage, schedule: () => () => undefined });
  const slot = new FakeElement(),
    frames: (() => void)[] = [],
    cancelled: number[] = [];
  const deps = {
    nextFrame: (paint: () => void) => frames.push(paint),
    cancelFrame: (h: number) => void cancelled.push(h),
    report: vi.fn(),
  };
  const view = new TopView(asReal<HTMLElement>(slot), session, deps);
  const [canvas] = slot.children;
  if (!canvas) throw new Error('the view appends its canvas');
  const { ctx, calls } = recordingContext();
  Object.assign(canvas, { offsetWidth: 448, offsetHeight: 448, getContext: () => ctx });
  const runFrames = (): void => frames.splice(0).forEach((paint) => paint());
  return { stage, session, slot, view, canvas, calls, frames, cancelled, runFrames };
}
