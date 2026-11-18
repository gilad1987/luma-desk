import type { LoadedSong } from '../../../audio/SongPlayer';
import type { AutoStyle } from '../../../autoshow/AutoStyle';
import { sectionName, type Section } from '../../../autoshow/sections';
import { cssRgb } from '../../../core';
import { colorByName } from '../../../engine/colorByName';

/** The idle text of `#autoStatus`. */
export const IDLE_STATUS =
  "Pick a style and press START. Looks are generated on the bar, following the style's song sections " +
  '(verse / chorus / build / drop). Use TAP or load a song to lock to the music.';

const ACCENT = '<b style="color:var(--acc)">';

const swatch = (name: string): string => {
  const c = colorByName(name);
  return cssRgb(c.r, c.g, c.b);
};

/** The inside of one style button: a bar in the style's first palette pair, its name and its Hebrew tagline. */
export function styleCardHtml(style: AutoStyle, tagline: string): string {
  const pair = style.pal[0];
  if (!pair) throw new Error(`Auto style ${style.name} has no palette`);
  const bar = `<div class="sb" style="background:linear-gradient(90deg,${swatch(pair[0])},${swatch(pair[1])})"></div>`;
  return `${bar}<b>${style.name}</b><span dir="rtl">${tagline}</span>`;
}

/** The `#autoSec` line while running: the section and how many bars until the next look. */
export function lookCountdown(section: Section | '', left: number): string {
  return `${sectionName(section) || ''} · next look in ${left} bar${left > 1 ? 's' : ''}`;
}

/** The `#autoStatus` text while running. An unknown section prints `undefined`, as the original did. */
export function runningStatus(style: AutoStyle, section: Section | '', barsPerLook: number): string {
  return (
    `<b>● AUTO RUNNING</b> — ${style.name}, section <b>${String(sectionName(section))}</b>, fade ${style.fade}s, ` +
    `change every ${barsPerLook} bars.<br>Programmer still overrides Auto, so you can grab fixtures live. ` +
    'Executor faders (HTP) add on top.'
  );
}

/** The `#songStat` line after a song loads: name, detected BPM and length as m:ss (both parts rounded). */
export function songStatHtml(song: LoadedSong): string {
  const minutes = Math.round(song.duration / 60),
    seconds = String(Math.round(song.duration % 60)).padStart(2, '0');
  return `${ACCENT}${song.name}</b> · detected ${ACCENT}${song.bpm} BPM</b> · ${minutes}:${seconds}`;
}
