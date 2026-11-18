import type { MvrWarning } from '../MvrWarning';
import type { MvrProxy, SeatProxy } from './ProxyPlacement';

const count = (n: number, one: string, many: string): string => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/**
 * The summary lines for the placements of Symdefs without geometry: what is drawn as a proxy and that its size is an
 * inference, and what is not drawn. The counts of the two lines sum to the number of such placements in the file.
 */
export function proxyWarnings(proxies: readonly MvrProxy[]): MvrWarning[] {
  const panels = proxies.filter((proxy) => proxy.kind === 'panel').length;
  const seats = proxies.filter((proxy) => proxy.kind === 'seat').length;
  const unknown = proxies.filter((proxy) => proxy.kind === 'unknown');
  const shown = [
    ...(panels > 0 ? [count(panels, 'LED panel', 'LED panels')] : []),
    ...(seats > 0 ? [count(seats, 'seat', 'seats')] : []),
  ];
  const lines: string[] = [];
  if (shown.length > 0) {
    const [verb, size] = panels + seats === 1 ? ['is', 'a proxy; its'] : ['are', 'proxies; their'];
    lines.push(`${shown.join(' and ')} ${verb} shown as ${size} size is inferred from spacing.`);
  }
  if (unknown.length > 0) {
    const symbols = new Set(unknown.map((proxy) => proxy.symdef)).size;
    const [verb, are] = unknown.length === 1 ? ['has', 'is'] : ['have', 'are'];
    const what = `${count(unknown.length, 'object', 'objects')} of ${count(symbols, 'symbol', 'symbols')}`;
    lines.push(`${what} ${verb} no geometry in the file and ${are} not shown.`);
  }
  return lines.map((message) => ({ code: 'empty-symdef', message }));
}

/**
 * The seat proxies as the audience needs them: where each stands and which way it looks, in the MVR frame
 * (millimetres, Z up). Both are inferred from the spacing of the rows, as the file gives the seats no geometry.
 */
export function seatProxies(proxies: readonly MvrProxy[]): SeatProxy[] {
  return proxies.flatMap(({ kind, frame, layer }) => {
    if (kind !== 'seat' || !frame) return [];
    const at = (index: number): number => frame[index] ?? 0;
    return [{ position: [at(12), at(13), at(14)], facing: [at(4), at(5), at(6)], layer }];
  });
}
