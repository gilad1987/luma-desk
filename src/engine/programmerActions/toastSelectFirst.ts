import type { EngineBus } from '../events';

/** Tells the operator that the action needs a selection; presets and phasers share the exact (bilingual) text. */
export function toastSelectFirst(bus: EngineBus): void {
  bus.emit('message', { kind: 'toast', text: 'בחר קודם גופים (Select fixtures first)' });
}
