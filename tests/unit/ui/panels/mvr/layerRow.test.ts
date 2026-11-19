// @vitest-environment jsdom
/** A layer row of the import summary: the shown box, the name, and the "LED" box that marks the layer as an LED wall. */
import { expect, it } from 'vitest';
import { layerRow } from '../../../../../src/ui/panels/mvr/layerRow.ts';

it('starts from the design, and a click on the word LED sets the LED box and leaves the shown box', () => {
  const host = document.body.appendChild(document.createElement('div'));
  const wall = layerRow(host, { uuid: 'L1', name: 'Wall' }, ['L1'], ['L1']);
  const rig = layerRow(host, { uuid: 'L2', name: 'Rig' }, ['L1'], ['L1']);
  expect([wall.box.checked, wall.led.checked, rig.box.checked, rig.led.checked]).toEqual([false, true, true, false]);
  const marks: boolean[] = [];
  rig.led.onchange = () => marks.push(rig.led.checked);
  host.querySelectorAll<HTMLElement>('.mvrLayerLedWord')[1]?.click();
  expect([marks, rig.box.checked]).toEqual([[true], true]);
  expect(rig.led.title).toMatch(/LED wall/);
  expect(host.textContent).toBe('WallLEDRigLED');
});
