import type { Cue } from '../engine/CueList';
import type { LookOptions } from './AutoSettings';
import type { AutoStyle } from './AutoStyle';
import type { LookGenerator } from './LookGenerator';
import { sectionName } from './sections';
import { sectionAt } from './SongStructure';

/** How many cues "build cue list" writes. */
const LIST_LENGTH = 8;

/**
 * Eight generated looks that walk the style's section cycle from the start, numbered 1-8 and named by section, for
 * "build cue list". They carry no `sec` label (quirk E7, orig:2721). Looks are generated in order, so the random
 * draws are too.
 */
export function buildLookList(looks: LookGenerator, style: AutoStyle, options: LookOptions): Cue[] {
  const cues: Cue[] = [];
  for (let i = 0; i < LIST_LENGTH; i++) {
    const sec = sectionAt(style, i);
    const cue = looks.generate(style, sec, options);
    cue.num = i + 1;
    cue.name = `${sectionName(sec)} ${i + 1}`;
    delete cue.sec;
    cues.push(cue);
  }
  return cues;
}
