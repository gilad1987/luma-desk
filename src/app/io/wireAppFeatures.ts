import type { SongPlayer } from '../../audio/SongPlayer';
import type { Clock } from '../../core';
import type { EngineBus } from '../../engine/events';
import { BrowserCapture } from '../../io/BrowserCapture';
import { downloadBlob } from '../../io/download';
import { Fullscreen } from '../../io/Fullscreen';
import { Install } from '../../io/Install';
import { Recorder } from '../../io/Recorder';
import { registerServiceWorker } from '../../io/serviceWorkerRegistration';
import type { Guide } from '../../ui/guide/Guide';
import { byId } from '../../ui/dom';

/** The main.ts objects the top bar's app buttons need, named after the main.ts variables they replace. */
export interface AppFeaturesDeps {
  /** The stage canvas (`#c`) the recorder captures. */
  readonly canvas: HTMLCanvasElement;
  /** Its audio graph adds the song's sound to a recording; it is read at each start, so a later song is heard. */
  readonly songPlayer: Pick<SongPlayer, 'audioGraph'>;
  readonly bus: EngineBus;
  readonly clock: Clock;
  /** F does nothing while the guide is open. */
  readonly guide: Pick<Guide, 'isOpen'>;
}

/** The wired features; no other main.ts code calls them today, so the composition root may ignore them. */
export interface AppFeaturesHandles {
  readonly recorder: Recorder;
  readonly fullscreen: Fullscreen;
  readonly install: Install;
}

/**
 * Wires video recording, fullscreen, the install button and the offline service worker, in the legacy order: the REC
 * button and its 500 ms timer, `#fsBtn`, the F key (keydown listener K4, capture on `document`, after the guide's K3),
 * window `beforeinstallprompt`, `#installBtn`, window `appinstalled`, then the worker registration. The registration
 * stays synchronous in boot, at its legacy point, so the worker installs on the first visit as before.
 */
export function wireAppFeatures(deps: AppFeaturesDeps): AppFeaturesHandles {
  const { canvas, songPlayer, bus, clock, guide } = deps;
  const recBtn = byId('recBtn');
  const capture = new BrowserCapture(canvas, () => songPlayer.audioGraph);
  const recorder = new Recorder({ button: recBtn, capture, bus, clock, save: downloadBlob });
  recBtn.onclick = () => recorder.toggle();

  const fullscreen = new Fullscreen({ document, isGuideOpen: () => guide.isOpen(), bus });
  byId('fsBtn').onclick = () => fullscreen.toggle();
  document.addEventListener('keydown', (ev) => fullscreen.handleKey(ev), true);

  const installBtn = byId('installBtn');
  const install = new Install({ button: installBtn, bus });
  addEventListener('beforeinstallprompt', (ev) => install.offer(ev));
  installBtn.onclick = () => void install.prompt();
  addEventListener('appinstalled', () => install.installed());

  registerServiceWorker();
  return { recorder, fullscreen, install };
}
