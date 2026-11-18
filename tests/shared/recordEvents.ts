import type { EngineBus } from '../../src/engine/events';

/**
 * Subscribes to every engine event and records each as one line, in delivery order, in the same form the oracles
 * record the original `log()`, `renderPools()` and `persist()` calls: `log:<level>:<text>`, `toast:<text>`, or the
 * event name (with `:<payload>` when it has one).
 */
export function recordEvents(bus: EngineBus): string[] {
  const lines: string[] = [];
  bus.on('message', (m) => lines.push(m.kind === 'log' ? `log:${m.level}:${m.text}` : `toast:${m.text}`));
  bus.on('cueStored', (c) => lines.push(`cueStored:${c.exec}.${c.num}`));
  bus.on('poolsChanged', () => lines.push('poolsChanged'));
  bus.on('selectionChanged', () => lines.push('selectionChanged'));
  bus.on('stateDirty', () => lines.push('stateDirty'));
  bus.on('showChanged', () => lines.push('showChanged'));
  bus.on('storeModeChanged', (s) => lines.push(`storeModeChanged:${String(s.on)}`));
  bus.on('rigChanged', (r) => lines.push(`rigChanged:${r.design.source.name}`));
  return lines;
}
