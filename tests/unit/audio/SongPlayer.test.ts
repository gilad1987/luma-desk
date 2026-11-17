import { afterEach, describe, expect, it, vi } from 'vitest';
import { SongPlayer } from '../../../src/audio/SongPlayer';
import type { Clock } from '../../../src/core';
import { Tempo } from '../../../src/engine/Tempo';
import { clickTrack } from './clickTrack';
import { detectBpm as legacyDetectBpm } from './oracle/legacyDetectBpm';

// Browser audio stand-ins: just enough of <audio>, AudioContext and OfflineAudioContext for SongPlayer.
class FakeAudio {
  paused = true;
  currentTime = 0;
  src = '';
  crossOrigin: string | null = null;
  onended: (() => void) | null = null;
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}
const bins = new Uint8Array(512).fill(51);
const analyser = {
  fftSize: 0,
  smoothingTimeConstant: 0,
  frequencyBinCount: 512,
  connect: vi.fn(),
  getByteFrequencyData: (out: Uint8Array) => out.set(bins),
};
class FakeAudioContext {
  destination = {};
  resume = vi.fn(() => Promise.resolve());
  createMediaElementSource = () => ({ connect: vi.fn() });
  createAnalyser = () => analyser;
}
const track = clickTrack(120, 70);
class FakeOfflineAudioContext {
  decodeAudioData = () => Promise.resolve({ ...track, duration: 70 });
}

const clock: Clock = { nowSeconds: () => 50, nowMs: () => 50000 };
const songFile = { name: 'song.mp3', arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) } as unknown as File;

function stubAudio() {
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('OfflineAudioContext', FakeOfflineAudioContext);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:song');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SongPlayer', () => {
  it('does nothing before a song is loaded', () => {
    const player = new SongPlayer(clock, () => undefined);
    expect(player.toggle()).toBeNull();
    expect(player.bassLevel()).toBeNull();
  });

  it('loads a song, detects its tempo and reports name, BPM and length', async () => {
    stubAudio();
    const player = new SongPlayer(clock, () => undefined);
    await expect(player.load(songFile)).resolves.toEqual({ name: 'song.mp3', bpm: 120, duration: 70 });
  });

  it('plays and pauses, builds the graph once and reads the bass relative to its peak', async () => {
    stubAudio();
    const player = new SongPlayer(clock, () => undefined);
    await player.load(songFile);
    expect(player.toggle()).toBe('playing');
    const graph = player.audioGraph;
    expect(analyser.fftSize).toBe(1024);
    expect(analyser.smoothingTimeConstant).toBe(0.5);
    // bins of 51 are 0.2 of full scale; the first read sets the peak to 0.2
    expect(player.bassLevel()).toBe(1);
    expect(player.toggle()).toBe('paused');
    expect(player.audioGraph).toBe(graph);
  });

  it('locks the tempo to the playing song every frame (quirk E3) and not while paused', async () => {
    stubAudio();
    const player = new SongPlayer(clock, () => undefined);
    const tempo = new Tempo();
    tempo.setBpm(99);
    await player.load(songFile);
    player.sync(tempo);
    expect(tempo.bpm).toBe(99);
    player.toggle();
    player.sync(tempo);
    expect(tempo.bpm).toBe(120);
    expect(tempo.beatOrigin).toBe(50 + legacyDetectBpm(track).off);
  });
});
