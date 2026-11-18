import type { Statement } from '../statements';
import type { TokenCursor } from './TokenCursor';

/**
 * Parses what follows `Store`: `Group n`, `Preset t.s`, or `[Cue] [n] {Fade s | Exec n}`. In the cue form the
 * `Fade`/`Exec` suffixes may repeat in any order and the last one wins, as in the original loop.
 */
export function parseStore(cursor: TokenCursor): Statement {
  if (cursor.optKeyword('group')) return { kind: 'storeGroup', group: cursor.num() };
  if (cursor.optKeyword('preset')) return { kind: 'storePreset', ref: cursor.presetRef() };
  cursor.optKeyword('cue');
  const cue = cursor.peek() === '#' ? cursor.num() : null;
  let fade: number | undefined;
  let exec: number | undefined;
  for (;;) {
    if (cursor.optKeyword('fade')) fade = cursor.num();
    else if (cursor.peek() === 'exec') exec = cursor.optExec();
    else return { kind: 'storeCue', cue, fade, exec };
  }
}
