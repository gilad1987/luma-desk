import { byId } from '../../dom';
import { importPickedFile } from './importPickedFile';
import type { MvrActions } from './MvrActions';

/** Wires the MVR row of the Show File dialog: Import MVR, Load demo rig and Export MVR. Call it after each `open`. */
export function wireMvrButtons(mvr: MvrActions): void {
  const input = byId('fMvrFile', HTMLInputElement);
  input.onchange = () => importPickedFile(input, mvr);
  byId('fDemoRig').onclick = () => mvr.loadDemoRig();
  byId('fMvrExport').onclick = () => mvr.exportMvr();
}
