import type { Rig } from '../../domain/rig';
import { defaultGroups } from '../../engine/defaultGroups';
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
 */
export function buildDemoShowFile(rig: Rig): ShowFileInput {
  const groups = defaultGroups(rig);
  const kit = createDemoKit(rig, groups);
  const song = [...openingCues(kit), ...closingCues(kit)];
  addRingLayers(song, kit);
  addTowerLayers(song, kit);
  song.splice(5, 0, tornadoCue(kit));
  const execs = [{ name: 'Main Show', cues: song, level: 1 }, ...buskingExecs(kit), ...rigExecs(kit)];
  return { groups, execs, bpm: 124, haze: 0.62 };
}
