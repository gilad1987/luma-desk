import type { Rig } from '../../domain/rig';
import type { StageDesign } from '../../domain/stage/StageDesign';
import { defaultGroups } from '../../engine/defaultGroups';
import { defaultPoolOf } from '../../engine/stage/defaultPool';
import { presetFnsOf } from '../../engine/stage/presetFnsOf';
import type { RigSource } from '../../engine/stage/RigSource';
import type { ShowFileInput } from '../ShowFile';
import { buskingExecs } from './buskingExecs';
import { closingCues } from './closingCues';
import { createDemoKit } from './demoKit';
import { openingCues } from './openingCues';
import { rigExecs } from './rigExecs';
import { addRingLayers } from './ringLayers';
import { tornadoCue } from './tornadoCue';
import { addTowerLayers } from './towerLayers';

/**
 * The demo show as a show file: the default groups and presets, a nine-cue song on executor 1 at full, nine busking
 * and effect executors, 124 BPM and the default haze. The build order is the original one (layers before cue 5.5 is
 * inserted), so the saved file matches the recorded golden byte for byte. Pure: no random, no clock.
 *
 * `source`, when given, is the stage `rig` was read from: the demo then takes that stage's default pool and presets.
 * A custom stage is written into the file as its `stage` key, because the loader resets a show without one to the
 * built-in stage; the built-in stage gets no key, so its demo stays the golden file.
 */
export function buildDemoShowFile(rig: Rig, source?: RigSource): ShowFileInput & { stage?: StageDesign } {
  const groups = source ? defaultPoolOf(source) : defaultGroups(rig);
  const kit = createDemoKit(rig, groups, source && presetFnsOf(source.frame));
  const song = [...openingCues(kit), ...closingCues(kit)];
  addRingLayers(song, kit);
  addTowerLayers(song, kit);
  song.splice(5, 0, tornadoCue(kit));
  const execs = [{ name: 'Main Show', cues: song, level: 1 }, ...buskingExecs(kit), ...rigExecs(kit)];
  const file = { groups, execs, bpm: 124, haze: 0.62 };
  return source && !source.isBuiltIn ? { ...file, stage: source.design } : file;
}
