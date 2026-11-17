import { buildLookList } from '../../../autoshow/buildLookList';
import { savedLookCue } from '../../../autoshow/savedLookCue';
import { nextCueNumber } from '../../../engine/CueList';
import { byId } from '../../dom';
import type { AutoShowDeps } from './AutoShowDeps';

/** "Save look → cue": appends the playing auto look to the selected executor as its next whole-numbered cue. */
export function saveLook({ auto, pool, state, storage, bus }: AutoShowDeps): void {
  const look = pool.autoExec.cues[0];
  if (!auto.on || !look) {
    bus.emit('message', { kind: 'toast', text: 'Start Auto first' });
    return;
  }
  const n = state.selExec + 1,
    e = pool.execs[state.selExec];
  if (!e) throw new Error(`no executor ${n}`);
  const num = nextCueNumber(e.cues);
  e.cues.push(savedLookCue(look, num, auto.style));
  if (!e.name) e.name = `Seq ${n}`;
  e.invalidate();
  storage.persist();
  bus.emit('stateDirty', undefined);
  bus.emit('message', { kind: 'toast', text: `Look saved as Cue ${num} in Exec ${n}` });
  bus.emit('message', { kind: 'log', text: `Auto look → Exec ${n} Cue ${num}`, level: 'ok' });
}

/** "Build cue list": fills the first empty executor after Exec 1 with eight looks of the style and selects it. */
export function buildCueList({ auto, looks, pool, state, storage, bus }: AutoShowDeps): void {
  const style = auto.style,
    index = pool.execs.findIndex((e, i) => i > 0 && !e.cues.length),
    e = pool.execs[index];
  if (!e) {
    bus.emit('message', { kind: 'toast', text: 'No empty executor — clear one first' });
    return;
  }
  const cues = buildLookList(looks, style, auto.settings);
  e.name = style.name;
  e.cues = cues;
  e.resetTracking();
  storage.persist();
  state.selectExec(index); // marks the UI dirty, as the original did after the save
  bus.emit('message', { kind: 'toast', text: `8-cue ${style.name} list built in Exec ${index + 1}` });
  bus.emit('message', { kind: 'log', text: `Built ${style.name} cue list → Exec ${index + 1}`, level: 'ok' });
}

/** Wires "Next look now" (starts Auto when off), "Save look → cue" and "Build cue list". */
export function wireLookButtons(deps: AutoShowDeps): void {
  const { auto } = deps;
  byId('aNext').onclick = () => {
    if (!auto.on) auto.start();
    else auto.newLook();
  };
  byId('aSave').onclick = () => saveLook(deps);
  byId('aList').onclick = () => buildCueList(deps);
}
