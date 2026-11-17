import type { EngineBus, LogLevel } from '../../engine/events';

/** Writes one line to the command feedback; the UI listens for `message` and owns the DOM. */
export function log(bus: EngineBus, text: string, level: LogLevel): void {
  bus.emit('message', { kind: 'log', text, level });
}
