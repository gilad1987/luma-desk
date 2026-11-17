import type { AutoShow } from '../../../autoshow/AutoShow';
import type { PulseSource } from '../../../autoshow/AutoSettings';
import { byId } from '../../dom';

const PULSE_SOURCES: readonly string[] = ['off', 'beat', 'audio'] satisfies PulseSource[];
const isPulseSource = (value: string): value is PulseSource => PULSE_SOURCES.includes(value);

/** Binds a checkbox to one boolean setting. */
function bindCheck(id: string, set: (on: boolean) => void): void {
  const box = byId(id, HTMLInputElement);
  box.onchange = () => set(box.checked);
}

/**
 * Wires the sliders, selects and checkboxes to the auto-show settings. Energy starts a new look only when the slider
 * is released (`change`); every other control takes effect on the next look.
 */
export function wireAutoSettings(auto: AutoShow): void {
  const s = auto.settings;
  const energy = byId('aEnergy', HTMLInputElement),
    master = byId('aMaster', HTMLInputElement);
  energy.oninput = () => {
    s.energy = Number(energy.value) / 100;
    byId('aEnergyV').textContent = energy.value;
  };
  energy.onchange = () => {
    if (auto.on) auto.newLook();
  };
  master.oninput = () => {
    s.master = Number(master.value) / 100;
    byId('aMasterV').textContent = master.value;
  };
  const bars = byId('aBars', HTMLSelectElement),
    pulse = byId('aPulse', HTMLSelectElement);
  bars.onchange = () => {
    s.bars = Number(bars.value);
  };
  pulse.onchange = () => {
    if (isPulseSource(pulse.value)) s.pulse = pulse.value;
  };
  bindCheck('aStrobe', (on) => (s.strobes = on));
  bindCheck('aHits', (on) => (s.hits = on));
  bindCheck('aScreen', (on) => (s.screen = on));
  bindCheck('aTake', (on) => (s.take = on));
}
