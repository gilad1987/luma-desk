// Reference oracle: detectBpm 2645-2658 from index.html (index.base.html), formatted by Prettier. Changes: types,
// and indexed reads go through at() (0 past the end) because the original's reads are untyped; every in-range read
// is unchanged. `on[Math.round(t)] || 0` also maps NaN to 0, so the offset scan keeps `|| 0` after at().

interface Pcm {
  sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

const at = (a: ArrayLike<number>, i: number): number => a[i] ?? 0;

export function detectBpm(ab: Pcm): { bpm: number; off: number } {
  const ch = ab.getChannelData(0),
    sr = ab.sampleRate,
    hop = 512;
  const start = Math.min(Math.floor(sr * 20), Math.max(0, ch.length - sr * 60)),
    end = Math.min(ch.length, start + sr * 60);
  let lp = 0,
    acc = 0,
    n = 0;
  const env: number[] = [];
  for (let i = start; i < end; i++) {
    lp += (at(ch, i) - lp) * 0.06;
    acc += lp * lp;
    if (++n === hop) {
      env.push(Math.sqrt(acc / hop));
      acc = 0;
      n = 0;
    }
  }
  const on = env.map((v, i) => (i ? Math.max(0, v - at(env, i - 1)) : 0)),
    fps = sr / hop;
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
  const per = (fps * 60) / bb;
  let bp = -1,
    bo = 0;
  for (let o = 0; o < per; o++) {
    let sm = 0;
    for (let t = o; t < on.length; t += per) sm += at(on, Math.round(t)) || 0;
    if (sm > bp) {
      bp = sm;
      bo = o;
    }
  }
  return { bpm: Math.round(bb), off: (start / sr + bo / fps) % (60 / bb) };
}
