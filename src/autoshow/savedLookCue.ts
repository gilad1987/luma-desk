import { jsonClone } from '../core';
import type { Cue } from '../engine/CueList';
import type { AutoStyle } from './AutoStyle';
import { sectionName } from './sections';

/**
 * A copy of the playing auto look as a normal cue numbered `num`, for "save look". It is named by the style's first
 * word and the look's section, and loses the `sec` label so show files never contain it (quirk E7).
 */
export function savedLookCue(look: Cue, num: number, style: AutoStyle): Cue {
  const cue = jsonClone(look);
  cue.num = num;
  cue.name = `${style.name.split(' ')[0]} ${sectionName(cue.sec) || ''}`;
  delete cue.sec;
  return cue;
}
