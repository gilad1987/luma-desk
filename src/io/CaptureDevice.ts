/** One running recording; a browser `MediaRecorder` fits it as is. */
export interface RecordingSession {
  /** The container and codecs the browser really uses; '' when it did not say. */
  readonly mimeType: string;
  /** Starts recording, handing out a chunk every `timesliceMs` milliseconds. */
  start(timesliceMs: number): void;
  stop(): void;
}

/** Where a session reports to: each recorded chunk, then the end after `stop()`. */
export interface RecordingCallbacks {
  onData(chunk: Blob): void;
  onStop(): void;
}

/**
 * The browser boundary of the video recorder: canvas capture, the song's sound and `MediaRecorder`. The recorder's
 * state machine depends on this, not on the browser, so it runs in a unit test with a fake device.
 */
export interface CaptureDevice {
  /** False when the browser lacks canvas capture or `MediaRecorder`. */
  readonly isSupported: boolean;
  isTypeSupported(mimeType: string): boolean;
  /**
   * Captures the stage (with the song's sound when a song has played) and creates a recorder for it, not started.
   *
   * @throws DOMException or TypeError when the browser refuses the recorder options.
   */
  open(mimeType: string, callbacks: RecordingCallbacks): RecordingSession;
}
