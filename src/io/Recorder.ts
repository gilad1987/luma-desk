import type { Clock } from '../core';
import type { EngineBus } from '../engine/events';
import { he } from '../i18n/he';
import type { CaptureDevice, RecordingSession } from './CaptureDevice';
import { chooseMimeType, formatElapsed, recordingFileName, recordingType } from './recordingFormat';

/** The REC button's idle label. */
const IDLE_LABEL = '● REC';
/** The recorder hands out a chunk every second, so a crash loses at most one second. */
const CHUNK_MS = 1000;
/** How often the running time on the button is refreshed. */
const ELAPSED_REFRESH_MS = 500;

/** What {@link Recorder} needs from main.ts. */
export interface RecorderDeps {
  /** `#recBtn`: it shows `● REC` when idle and the running time with the `on` class while recording. */
  readonly button: { textContent: string | null; readonly classList: Pick<DOMTokenList, 'add' | 'remove'> };
  readonly capture: CaptureDevice;
  readonly bus: EngineBus;
  readonly clock: Clock;
  /** Saves the finished video; main.ts passes `downloadBlob`. */
  readonly save: (blob: Blob, name: string) => void;
}

/**
 * Records the stage (and the song) to a video file the operator downloads. The browser side is behind
 * {@link CaptureDevice}; main.ts forwards `#recBtn` clicks to {@link Recorder.toggle}. The constructor starts the
 * 500 ms timer that writes the running time; it runs for the page's life, as the original did. Emits `message` toasts.
 */
export class Recorder {
  readonly #deps: RecorderDeps;
  #session: RecordingSession | undefined;
  #chunks: Blob[] = [];
  #startedAtMs = 0;

  constructor(deps: RecorderDeps) {
    this.#deps = deps;
    setInterval(() => this.#showElapsed(), ELAPSED_REFRESH_MS);
  }

  /** Stops the running recording (the download follows), or starts a new one. */
  toggle(): void {
    if (this.#session) this.#session.stop();
    else this.#start();
  }

  #start(): void {
    const { capture, button, clock } = this.#deps;
    if (!capture.isSupported) {
      this.#toast(he.topBar.rec.unsupported);
      return;
    }
    const mimeType = chooseMimeType((type) => capture.isTypeSupported(type));
    const callbacks = { onData: (chunk: Blob) => this.#collect(chunk), onStop: () => this.#finish() };
    let session: RecordingSession;
    try {
      session = capture.open(mimeType, callbacks);
    } catch {
      this.#toast(he.topBar.rec.cannotStart);
      return;
    }
    this.#session = session;
    this.#chunks = [];
    this.#startedAtMs = clock.nowMs();
    session.start(CHUNK_MS);
    button.classList.add('on');
    this.#toast(he.topBar.rec.started);
  }

  #collect(chunk: Blob): void {
    if (chunk.size) this.#chunks.push(chunk);
  }

  #finish(): void {
    const { button, save } = this.#deps;
    const type = recordingType(this.#session?.mimeType ?? '');
    save(new Blob(this.#chunks, { type }), recordingFileName(type));
    this.#session = undefined;
    button.classList.remove('on');
    button.textContent = IDLE_LABEL;
    this.#toast(he.topBar.rec.saved);
  }

  #showElapsed(): void {
    if (!this.#session) return;
    this.#deps.button.textContent = `■ ${formatElapsed(this.#deps.clock.nowMs() - this.#startedAtMs)}`;
  }

  #toast(text: string): void {
    this.#deps.bus.emit('message', { kind: 'toast', text });
  }
}
