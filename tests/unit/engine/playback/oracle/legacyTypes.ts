// Shapes of the untyped original (index.base.html 1529-1536). Type-only: they let the copied code compile unchanged.

export type LVals = Record<string, Record<string, number | undefined>>;
export interface LInst {
  type: string;
  rate: number;
  size: number;
  spread: number;
  ids: number[];
}
export interface LRef {
  inst: LInst;
  idx: number;
  n: number;
}
export type LFx = Record<string, LRef>;
export interface LCue {
  num: number;
  name: string;
  fade?: number;
  vals: LVals;
  fx?: LInst[];
}
export interface LFade {
  from: LVals;
  to: LVals;
  t0: number;
  dur: number;
  paused: boolean;
  pausedAt?: number;
}
export interface LExec {
  name: string;
  cues: LCue[];
  cur: number;
  level: number;
  on: boolean;
  lastGo: number;
  vals: LVals;
  fx: LFx;
  fade: LFade | null;
  flash: boolean;
  flashOnly?: boolean;
  cache: Record<number, { vals: LVals; fx: LFx }>;
  auto?: boolean;
}
