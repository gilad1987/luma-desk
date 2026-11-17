import type { Executor } from '../../../engine/Executor';

/** The executor picker: one option per executor with its name and cue count; the selected executor is preselected. */
export function execOptions(execs: readonly Executor[], selExec: number): string {
  return execs
    .map(
      (e, i) =>
        `<option value="${i}" ${i === selExec ? 'selected' : ''}>Exec ${i + 1} — ${e.name || 'empty'} (${e.cues.length})</option>`,
    )
    .join('');
}

/** The row class: `cur` on the live cue, `nxt` on the one GO+ plays next (only while the executor runs). */
function rowClass(e: Executor, i: number): string {
  if (i === e.cur) return 'cur';
  return e.on && i === (e.cur + 1) % e.cues.length ? 'nxt' : '';
}

/**
 * The cue table of `e`: header, one row per cue (`data-i` is the cue index), or a hint row when there are no cues.
 * Cue names are not escaped (quirk Q11).
 */
export function cueTable(e: Executor): string {
  const rows = e.cues.map((c, i) => {
    const nf = Object.keys(c.vals).length,
      nx = c.fx.length;
    return (
      `<tr data-i="${i}" class="${rowClass(e, i)}"><td class="num">${c.num}</td><td class="name">${c.name}</td>` +
      `<td class="fade">${c.fade}s</td><td class="info">${nf} fix${nx ? ` · ${nx} fx` : ''}</td></tr>`
    );
  });
  const empty =
    '<tr><td colspan="4" style="color:var(--mut);padding:14px">No cues. Build a look in the programmer, then STORE → ' +
    'click this executor (or type <b>Store Cue 1</b>).</td></tr>';
  return `<tr><th>Cue</th><th>Name</th><th>Fade</th><th>Content</th></tr>` + rows.join('') + (rows.length ? '' : empty);
}
