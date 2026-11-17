import { CommandError } from '../CommandError';
import type { Statement } from '../statements';
import { parseStore } from './parseStore';
import type { TokenCursor } from './TokenCursor';

/** Parses `Label (Cue|Group|Exec) n Name…`; the name is the rest of the line with one pair of quotes stripped. */
function parseLabel(cursor: TokenCursor): Statement {
  const target = cursor.peek();
  cursor.skip();
  const num = cursor.num();
  const name = cursor.rest().replace(/^"|"$/g, '');
  if (target !== 'cue' && target !== 'group' && target !== 'exec')
    throw new CommandError('Label Cue|Group|Exec n Name');
  return { kind: 'label', target, num, name };
}

/**
 * Parses the statement that starts with keyword `word` (already read), for every keyword that is not a selection or
 * a level. Goto, Delete, Label Cue, Fade and Pause take no `Exec n` (quirk C3): they act on the selected executor.
 */
export function parseCommand(word: string | undefined, cursor: TokenCursor): Statement {
  switch (word) {
    case 'store':
      return parseStore(cursor);
    case 'exec':
      return { kind: 'selectExec', exec: cursor.num() - 1 };
    case 'go':
      return { kind: 'go', direction: 1, exec: cursor.optExec() };
    case 'goback':
      return { kind: 'go', direction: -1, exec: cursor.optExec() };
    case 'goto':
      cursor.optKeyword('cue');
      return { kind: 'gotoCue', cue: cursor.num() };
    case 'pause':
      return { kind: 'pause' };
    case 'off':
      return { kind: 'off', exec: cursor.optExec() };
    case 'clear':
      return { kind: 'clear' };
    case 'clearall':
      return { kind: 'clearAll' };
    case 'preset':
      return { kind: 'applyPreset', ref: cursor.presetRef() };
    case 'delete':
      cursor.optKeyword('cue');
      return { kind: 'deleteCue', cue: cursor.num() };
    case 'label':
      return parseLabel(cursor);
    case 'highlight':
      return { kind: 'toggleHighlight' };
    case 'blackout':
      return { kind: 'toggleBlackout' };
    case 'fade':
      return { kind: 'cueFade', seconds: cursor.num() };
    case undefined: // no keyword left: reported like an unknown one
    default:
      throw new CommandError(`Unknown keyword "${cursor.lastOriginal ?? ''}"`);
  }
}
