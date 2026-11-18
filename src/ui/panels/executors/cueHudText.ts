import { SECTION_NAMES } from '../../../autoshow/sections';
import type { Executor } from '../../../engine/Executor';
import type { HudAutoShow } from './ExecutorsDeps';

/** The HUD's three lines; `cueHtml` is HTML because names are not escaped (quirk Q11). */
export interface CueHudText {
  readonly exec: string;
  readonly cueHtml: string;
  readonly next: string;
}

/** The current-cue line: the cue as HTML, else whether GO would start the executor or it has no cues. */
function cueLineHtml(e: Executor): string {
  const cue = e.cues[e.cur];
  if (cue) return `<span>${cue.num}</span> ${cue.name}`;
  return e.cues.length ? 'Off — press GO' : 'No cues';
}

/** The HUD for the selected executor `e` (0-based `i`); the next line has two spaces before the fade (quirk Q31). */
export function executorHudText(e: Executor, i: number): CueHudText {
  const nx = e.cues.length > 1 ? e.cues[(e.cur + 1) % e.cues.length] : null;
  return {
    exec: `Exec ${i + 1} · ${e.name || 'empty'}`,
    cueHtml: cueLineHtml(e),
    next: nx ? `Next: ${nx.num} ${nx.name}  (fade ${nx.fade}s)` : '',
  };
}

/** The HUD while the Auto Show runs: style, section and the look length at the current tempo. */
export function autoHudText(auto: HudAutoShow, bpm: number, bars: number): CueHudText {
  return {
    exec: 'AUTO SHOW · ' + auto.style.name,
    cueHtml: `<span>●</span> ${(auto.section && SECTION_NAMES[auto.section]) || ''}`,
    next: `${bpm} BPM · new look every ${bars} bars`,
  };
}
