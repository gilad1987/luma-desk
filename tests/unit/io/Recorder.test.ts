/** Owns the REC state machine with a fake capture device; the real browser capture is owned by the Playwright suite. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../src/core';
import type { EngineEvents, EngineMessage } from '../../../src/engine/events';
import { he } from '../../../src/i18n/he';
import type { CaptureDevice, RecordingCallbacks } from '../../../src/io/CaptureDevice';
import { Recorder } from '../../../src/io/Recorder';

class FakeCapture implements CaptureDevice {
  isSupported = true;
  shouldThrow = false;
  callbacks: RecordingCallbacks | undefined;
  readonly start = vi.fn();
  readonly stop = vi.fn();
  readonly opened: string[] = [];
  isTypeSupported(mimeType: string): boolean {
    return mimeType === 'video/webm';
  }
  open(mimeType: string, callbacks: RecordingCallbacks) {
    if (this.shouldThrow) throw new TypeError('bad options');
    this.opened.push(mimeType);
    this.callbacks = callbacks;
    return { mimeType: '', start: this.start, stop: this.stop };
  }
}

describe('Recorder', () => {
  let capture: FakeCapture, toasts: string[], classes: Set<string>, nowMs: number;
  let button: { textContent: string | null; classList: Pick<DOMTokenList, 'add' | 'remove'> };
  const save = vi.fn<(blob: Blob, name: string) => void>();
  let recorder: Recorder;
  beforeEach(() => {
    vi.useFakeTimers();
    capture = new FakeCapture();
    toasts = [];
    classes = new Set();
    nowMs = 1000;
    button = {
      textContent: '● REC',
      classList: { add: (t) => void classes.add(t), remove: (t) => void classes.delete(t) },
    };
    const bus = new EventBus<EngineEvents>();
    bus.on('message', (message: EngineMessage) => toasts.push(message.text));
    recorder = new Recorder({
      button,
      capture,
      bus,
      clock: { nowMs: () => nowMs, nowSeconds: () => nowMs / 1000 },
      save,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    save.mockClear();
  });

  it('refuses in a browser without canvas capture', () => {
    capture.isSupported = false;
    recorder.toggle();
    expect([toasts, capture.opened]).toEqual([[he.rec.unsupported], []]);
  });

  it('starts with the preferred format, 1 s chunks, the on class and a running time', () => {
    recorder.toggle();
    nowMs += 61_500;
    vi.advanceTimersByTime(500);
    expect([capture.opened, capture.start.mock.calls, [...classes], button.textContent, toasts]).toEqual([
      ['video/webm'],
      [[1000]],
      ['on'],
      '■ 1:01',
      [he.rec.started],
    ]);
  });

  it('stops on the second click and downloads the non-empty chunks as WebM', async () => {
    recorder.toggle();
    recorder.toggle();
    capture.callbacks?.onData(new Blob(['ab']));
    capture.callbacks?.onData(new Blob([]));
    capture.callbacks?.onStop();
    const [blob, name] = save.mock.lastCall ?? [new Blob(['not saved']), ''];
    expect([
      capture.stop.mock.calls.length,
      blob.type,
      await blob.text(),
      name,
      [...classes],
      button.textContent,
    ]).toEqual([1, 'video/webm', 'ab', expect.stringMatching(/^luma-desk-\d{8}-\d{4}\.webm$/), [], '● REC']);
    expect(toasts).toEqual([he.rec.started, he.rec.saved]);
  });

  it('toasts when the browser refuses the recorder and stays idle', () => {
    capture.shouldThrow = true;
    recorder.toggle();
    vi.advanceTimersByTime(500);
    expect([toasts, [...classes], button.textContent]).toEqual([[he.rec.cannotStart], [], '● REC']);
  });
});
