/** The Selection chip: the count, then the ids (all when under 6, else first…last, quirk Q32, orig:2537). */
export function selectionChip(ids: readonly number[]): string {
  if (!ids.length) return 'Selection: <b>0</b>';
  const list = ids.length < 6 ? ids.join(' ') : `${ids[0]}…${ids[ids.length - 1]}`;
  return `Selection: <b>${ids.length}</b> <span style="color:var(--mut)">${list}</span>`;
}

/** The Programmer chip: fixtures with values and running phasers, or `empty`. */
export function programmerChip(fixtures: number, phasers: number): string {
  if (!fixtures && !phasers) return 'Programmer: empty';
  return `Programmer: <b style="color:var(--prog)">${fixtures} fix${phasers ? ' · ' + phasers + ' fx' : ''}</b>`;
}
