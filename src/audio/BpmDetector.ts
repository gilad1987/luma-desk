/** Decoded audio as `AudioBuffer` offers it; tests pass synthetic PCM in the same shape. */
export interface PcmSource {
  readonly sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

/** The detected tempo and where its beat grid starts. */
export interface BpmResult {
  /** Beats per minute, rounded to a whole number for display and sync. */
  readonly bpm: number;
  /** Seconds from the start of the song to the first beat, within one beat. */
  readonly off: number;
}

/** Samples per envelope frame. */
const HOP = 512;

/** A sample of a list, 0 past its end; NaN passes through, because the original read these samples unguarded. */
const at = (values: ArrayLike<number>, i: number): number => values[i] ?? 0;

/** Rises in loudness per frame of a low-passed RMS envelope: where the beats hit. */
function onsets(pcm: Float32Array, start: number, end: number): number[] {
  let lp = 0,
    acc = 0,
    n = 0;
  const env: number[] = [];
  for (let i = start; i < end; i++) {
    lp += (at(pcm, i) - lp) * 0.06;
    acc += lp * lp;
    if (++n === HOP) {
      env.push(Math.sqrt(acc / HOP));
      acc = 0;
      n = 0;
    }
  }
  return env.map((v, i) => (i ? Math.max(0, v - at(env, i - 1)) : 0));
}

/** The tempo in 0.5 BPM steps from 70 to 180 whose lag best matches the onsets, biased towards 120. */
function bestTempo(on: readonly number[], fps: number): number {
  let best = -1,
    bb = 120;
  for (let b = 70; b <= 180; b += 0.5) {
    const lag = (fps * 60) / b,
      li = Math.floor(lag),
      fr = lag - li;
    let sum = 0;
    for (let i = li + 1; i < on.length; i++) sum += at(on, i) * (at(on, i - li) * (1 - fr) + at(on, i - li - 1) * fr);
    sum /= on.length - lag;
    sum *= 1 - Math.abs(Math.log2(b / 120)) * 0.35;
    if (sum > best) {
      best = sum;
      bb = b;
    }
  }
  return bb;
}

/** The frame offset within one beat period whose grid collects the most onset energy. */
function bestOffset(on: readonly number[], period: number): number {
  let bp = -1,
    bo = 0;
  for (let o = 0; o < period; o++) {
    let sm = 0;
    // || and not ??: the original counted a NaN onset as 0 here, and only here
    for (let t = o; t < on.length; t += period) sm += on[Math.round(t)] || 0;
    if (sm > bp) {
      bp = sm;
      bo = o;
    }
  }
  return bo;
}

/**
 * Detects the tempo of a song from its first channel. It analyses at most 60 s, starting at 20 s (or earlier when the
 * song is short) to skip intros. The BPM is rounded but the offset uses the unrounded tempo (quirk E1), so the grid
 * drifts slowly on a half-step tempo; it is kept because the results must stay identical.
 */
export function detectBpm(audio: PcmSource): BpmResult {
  const pcm = audio.getChannelData(0),
    sr = audio.sampleRate;
  const start = Math.min(Math.floor(sr * 20), Math.max(0, pcm.length - sr * 60)),
    end = Math.min(pcm.length, start + sr * 60);
  const on = onsets(pcm, start, end),
    fps = sr / HOP;
  const bb = bestTempo(on, fps);
  const bo = bestOffset(on, (fps * 60) / bb);
  return { bpm: Math.round(bb), off: (start / sr + bo / fps) % (60 / bb) };
}
