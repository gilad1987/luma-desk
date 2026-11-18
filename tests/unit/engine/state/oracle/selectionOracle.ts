import { clamp } from '../../../../../src/core';

// Reference oracles: the original setSel 1795-1803, the kRev handler 2242 (selection part) and the tap handler 2249
// from index.html at 48a3b63, formatted by Prettier. Changes: types; the globals (sel, FX, taps, bpm, beatOrigin)
// live in a state object; the f.sel and uiDirty writes are dropped (Selection.has replaces f.sel).

export type SelState = { sel: number[] };

export function setSelOracle(s: SelState, FX: Record<number, unknown>, ids: number[], mode = 'replace'): void {
  let sel = s.sel;
  ids = ids.filter((id) => FX[id]);
  if (mode === 'replace') sel = [...new Set(ids)];
  else if (mode === 'add') {
    for (const id of ids) if (!sel.includes(id)) sel.push(id);
  } else if (mode === 'sub') sel = sel.filter((id) => !ids.includes(id));
  else if (mode === 'toggle') {
    for (const id of ids) sel = sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id];
  }
  s.sel = sel;
}

export function reverseOracle(s: SelState, FX: Record<number, unknown>): void {
  s.sel.reverse();
  setSelOracle(s, FX, [...s.sel]);
}

export type TapState = { taps: number[]; bpm: number; beatOrigin: number };

export function tapOracle(s: TapState, t: number): void {
  let { taps, bpm, beatOrigin } = s;
  taps = taps.filter((x) => t - x < 2500);
  taps.push(t);
  beatOrigin = t / 1000;
  if (taps.length >= 2) {
    const iv = ((taps[taps.length - 1] as number) - (taps[0] as number)) / (taps.length - 1);
    bpm = clamp(Math.round(60000 / iv), 40, 220);
  }
  Object.assign(s, { taps, bpm, beatOrigin });
}
