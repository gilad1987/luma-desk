import type { PcmSource } from '../../../src/audio/BpmDetector';

/**
 * A synthetic mono click track: a short decaying 2 kHz burst on every beat from `firstBeat` seconds, silence between.
 * Deterministic, so BPM detection on it can be compared bit for bit.
 */
export function clickTrack(bpm: number, seconds: number, firstBeat = 0.1, sampleRate = 44100): PcmSource {
  const pcm = new Float32Array(Math.round(seconds * sampleRate));
  const period = (60 / bpm) * sampleRate,
    click = Math.round(0.03 * sampleRate);
  for (let beat = firstBeat * sampleRate; beat < pcm.length; beat += period)
    for (let i = 0; i < click && beat + i < pcm.length; i++)
      pcm[Math.floor(beat) + i] = Math.sin((2 * Math.PI * 2000 * i) / sampleRate) * Math.exp(-i / (0.006 * sampleRate));
  return { sampleRate, getChannelData: () => pcm };
}
