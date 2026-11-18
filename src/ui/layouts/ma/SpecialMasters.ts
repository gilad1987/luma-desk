import { byId, requireChild } from '../../dom';
import { bindFader, createElement } from '../../shared';

/** The top-bar and auto-show sliders the MA special masters drive, with the label printed on each strip. */
const SPECS = [
  ['house', 'HOUSE'],
  ['haze', 'HAZE'],
  ['aEnergy', 'ENERGY'],
  ['aMaster', 'AUTO'],
] as const;

/** One strip, with the parts `paint` writes looked up once at build time (it runs every 50 ms). */
interface Strip {
  readonly input: HTMLInputElement;
  readonly root: HTMLElement;
  readonly value: HTMLElement;
  readonly fill: HTMLElement;
  readonly cap: HTMLElement;
}

/**
 * The four special-master faders of the MA deck. They do not own a value: each moves its slider and fires the
 * slider's own events, so the slider stays the one source the rest of the app reads. It does not create the sliders.
 */
export class SpecialMasters {
  private readonly strips: readonly Strip[];

  constructor() {
    const host = byId('maSpecs');
    this.strips = SPECS.map(([id, name], i) => buildStrip(host, byId(id, HTMLInputElement), `S${i + 1}`, name));
  }

  /** Repaints every strip from its slider (fast UI tick, MA only). */
  paint(): void {
    for (const { input, root, value, fill, cap } of this.strips) {
      const k = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min));
      root.style.setProperty('--lv', String(k));
      value.textContent = input.value;
      fill.style.height = k * 100 + '%';
      cap.style.bottom = k * 100 + '%';
    }
  }
}

function buildStrip(host: HTMLElement, input: HTMLInputElement, key: string, name: string): Strip {
  const lo = Number(input.min),
    hi = Number(input.max);
  const root = createElement(
    'div',
    'spc',
    `<span class="sk">${key}</span><span class="sn">${name}</span><span class="sv"></span><span class="sl"></span><div class="fader"><div class="ff"></div><div class="cap"></div></div>`,
  );
  host.appendChild(root);
  const fader = requireChild(root, '.fader');
  bindFader(
    fader,
    () => (Number(input.value) - lo) / (hi - lo),
    (v) => {
      input.value = String(lo + v * (hi - lo));
      input.dispatchEvent(new Event('input'));
    },
  );
  sendChangeOnRelease(root, fader, input);
  return {
    input,
    root,
    value: requireChild(root, '.sv'),
    fill: requireChild(root, '.ff'),
    cap: requireChild(root, '.cap'),
  };
}

/**
 * The sliders also act on `change` (Energy starts a new auto look on release), so a strip fires it only for a real
 * change: on release when the value moved since pointer-down, or on double-click when it moved since the last send
 * (known quirk Q30, orig:3010-3014).
 */
function sendChangeOnRelease(root: HTMLElement, fader: HTMLElement, input: HTMLInputElement): void {
  let atDown = input.value,
    atSend = input.value;
  const send = (): void => {
    atSend = input.value;
    input.dispatchEvent(new Event('change'));
  };
  root.addEventListener('pointerdown', () => (atDown = input.value), true);
  fader.addEventListener('lostpointercapture', () => {
    if (input.value !== atDown) send();
  });
  fader.addEventListener('dblclick', () => {
    if (input.value !== atSend) send();
  });
}
