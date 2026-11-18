import type { SongAnalyser } from '../audio/SongAnalyser';
import type { CaptureDevice, RecordingCallbacks, RecordingSession } from './CaptureDevice';

/** Frames per second of the stage capture. */
const CAPTURE_FPS = 30;
/** 12 Mbit/s keeps the moving beams sharp in the file. */
const VIDEO_BITS_PER_SECOND = 12e6;

/**
 * The real {@link CaptureDevice}: the stage canvas through `captureStream`, plus the song's sound through a media
 * stream destination tapped off the song's analyser. The tap is created once, on the first recording after a song
 * has played, and stays connected. Gets the canvas and `SongPlayer.audioGraph` (as a function) from main.ts.
 */
export class BrowserCapture implements CaptureDevice {
  readonly #canvas: HTMLCanvasElement;
  readonly #songGraph: () => SongAnalyser | null;
  #songTap: MediaStreamAudioDestinationNode | undefined;

  constructor(canvas: HTMLCanvasElement, songGraph: () => SongAnalyser | null) {
    this.#canvas = canvas;
    this.#songGraph = songGraph;
  }

  get isSupported(): boolean {
    return 'captureStream' in this.#canvas && 'MediaRecorder' in window;
  }

  isTypeSupported(mimeType: string): boolean {
    return MediaRecorder.isTypeSupported(mimeType);
  }

  open(mimeType: string, callbacks: RecordingCallbacks): RecordingSession {
    const stream = this.#canvas.captureStream(CAPTURE_FPS);
    for (const track of this.#songTracks()) stream.addTrack(track);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: VIDEO_BITS_PER_SECOND });
    recorder.ondataavailable = (event) => callbacks.onData(event.data);
    recorder.onstop = () => callbacks.onStop();
    return recorder;
  }

  /** The song's audio tracks, or none before the first song play (no audio context exists yet). */
  #songTracks(): MediaStreamTrack[] {
    const graph = this.#songGraph();
    if (!graph) return [];
    if (!this.#songTap) {
      this.#songTap = graph.context.createMediaStreamDestination();
      graph.node.connect(this.#songTap);
    }
    return this.#songTap.stream.getAudioTracks();
  }
}
