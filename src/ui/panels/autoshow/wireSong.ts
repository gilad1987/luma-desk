import { byId } from '../../dom';
import type { AutoShowDeps } from './AutoShowDeps';
import { songStatHtml } from './autoShowText';

/** Decodes the chosen song, shows its tempo and switches the pulse to the music; a bad file only says so. */
async function loadSong(file: File, { song, auto }: AutoShowDeps, play: HTMLButtonElement): Promise<void> {
  const stat = byId('songStat');
  stat.textContent = 'Analyzing tempo…';
  try {
    stat.innerHTML = songStatHtml(await song.load(file));
    play.disabled = false;
    byId('aPulse', HTMLSelectElement).value = 'audio';
    auto.settings.pulse = 'audio';
  } catch {
    stat.textContent = 'Could not read this audio file.';
  }
}

/** Wires the song file input and the play button; playing a song starts Auto if it is off. */
export function wireSong(deps: AutoShowDeps): void {
  const { song, auto } = deps;
  const file = byId('songFile', HTMLInputElement),
    play = byId('songPlay', HTMLButtonElement);
  file.onchange = () => {
    const chosen = file.files?.[0];
    if (chosen) void loadSong(chosen, deps, play);
  };
  play.onclick = () => {
    const state = song.toggle();
    if (state === 'playing') {
      play.textContent = '❚❚ Pause';
      if (!auto.on) auto.start();
    } else if (state === 'paused') play.textContent = '▶ Play';
  };
}
