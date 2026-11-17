import type { Clock } from '../core';
import type { Tempo } from '../engine/Tempo';
import { detectBpm } from './BpmDetector';
import { SongAnalyser } from './SongAnalyser';

/** What the auto panel shows after a song loads. */
export interface LoadedSong {
  readonly name: string;
  readonly bpm: number;
  /** Length in seconds. */
  readonly duration: number;
}

/**
 * Plays one song file and locks the tempo grid to it. Loading decodes the file once to detect its BPM and beat
 * offset; while it plays, `sync` sets the tempo from the song every frame, so tap tempo has no lasting effect
 * (quirk E3). The panel owns every label and button; this class reports state and leaves the DOM alone.
 */
export class SongPlayer {
  private element: HTMLAudioElement | null = null;
  private analyser: SongAnalyser | null = null;
  private bpm: number | null = null;
  private offset = 0;
  private readonly clock: Clock;
  private readonly onEnded: () => void;

  /** `onEnded` runs when the song plays to its end, so the panel can reset its play button. */
  constructor(clock: Clock, onEnded: () => void) {
    this.clock = clock;
    this.onEnded = onEnded;
  }

  /** The audio graph once the song has played; null before. The recorder captures the song from it. */
  get audioGraph(): SongAnalyser | null {
    return this.analyser;
  }

  /**
   * Loads a song file and detects its tempo. Decoding goes through a one-second 44.1 kHz mono offline context, which
   * only serves to decode (it resamples). Rejects when the file cannot be decoded; the element keeps the new source
   * and the previous tempo stays.
   */
  async load(file: File): Promise<LoadedSong> {
    if (!this.element) {
      this.element = new Audio();
      this.element.crossOrigin = 'anonymous';
      this.element.onended = this.onEnded;
    }
    this.element.src = URL.createObjectURL(file);
    const data = await file.arrayBuffer();
    const decoded = await new OfflineAudioContext(1, 44100, 44100).decodeAudioData(data);
    const result = detectBpm(decoded);
    this.bpm = result.bpm;
    this.offset = result.off;
    return { name: file.name, bpm: result.bpm, duration: decoded.duration };
  }

  /** Plays or pauses; returns the new state, or null when no song is loaded. Builds the audio graph on first use. */
  toggle(): 'playing' | 'paused' | null {
    const element = this.element;
    if (!element) return null;
    this.analyser ??= new SongAnalyser(element);
    void this.analyser.context.resume();
    if (element.paused) {
      void element.play();
      return 'playing';
    }
    element.pause();
    return 'paused';
  }

  /** The bass level for the beat pump, or null before the audio graph exists. */
  bassLevel(): number | null {
    return this.analyser ? this.analyser.bassLevel() : null;
  }

  /** While the song plays, sets the tempo and puts the beat origin where the song's beat grid says. */
  sync(tempo: Tempo): void {
    const element = this.element;
    if (element && !element.paused && this.bpm) {
      tempo.setBpm(this.bpm);
      tempo.setBeatOrigin(this.clock.nowSeconds() - (element.currentTime - this.offset));
    }
  }
}
