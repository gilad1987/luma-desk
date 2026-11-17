/**
 * The Web Audio graph behind a playing song: element source -> analyser -> speakers. Created on the first play,
 * because browsers only allow an `AudioContext` to run after a user gesture. The recorder taps `context` and `node`
 * to capture the song's sound.
 */
export class SongAnalyser {
  readonly context: AudioContext;
  readonly node: AnalyserNode;
  readonly #bins: Uint8Array<ArrayBuffer>;
  /** The loudest recent bass level; decays slowly so the pump adapts to quiet and loud songs. */
  #peak = 0.1;

  constructor(element: HTMLMediaElement) {
    this.context = new AudioContext();
    const source = this.context.createMediaElementSource(element);
    this.node = this.context.createAnalyser();
    this.node.fftSize = 1024;
    this.node.smoothingTimeConstant = 0.5;
    source.connect(this.node);
    this.node.connect(this.context.destination);
    this.#bins = new Uint8Array(this.node.frequencyBinCount);
  }

  /**
   * The current bass (frequency bins 1-6) relative to the recent peak, 0-1. Each call reads the analyser and updates
   * the peak, so call it once per frame.
   */
  bassLevel(): number {
    this.node.getByteFrequencyData(this.#bins);
    let bass = 0;
    for (let i = 1; i < 7; i++) bass += this.#bins[i] ?? 0;
    bass /= 6 * 255;
    this.#peak = Math.max(bass, this.#peak * 0.996, 0.05);
    return bass / this.#peak;
  }
}
