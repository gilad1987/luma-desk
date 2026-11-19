// @vitest-environment jsdom
/** The "Desk hall" row of the layer list: it says where the hall in the picture comes from and turns the desk's off. */
import { expect, it } from 'vitest';
import { HALL_ADDED, HALL_OF_FILE, HALL_OFF, hallLine, hallRow } from '../../../../../src/ui/panels/mvr/hallRow.ts';
import { fillLayerList } from '../../../../../src/ui/panels/mvr/layerList.ts';

it('words the line for the desk hall, for none and for the hall of the file', () => {
  expect(hallLine(true, false)).toBe('The hall around the stage is added by the desk; it is not in the file.');
  expect([hallLine(true, false), hallLine(false, false), hallLine(true, true), hallLine(false, true)]).toEqual([
    HALL_ADDED,
    HALL_OFF,
    HALL_OF_FILE,
    HALL_OF_FILE,
  ]);
});

it('starts with the choice of the stage, reports each change and words the line again', () => {
  const host = document.body.appendChild(document.createElement('div'));
  const states: boolean[] = [];
  const control = { fileHall: () => false, shown: () => true, onChange: (shown: boolean) => states.push(shown) };
  hallRow(host, control, () => []);
  const box = host.querySelector<HTMLInputElement>('#mvrHall');
  const note = host.querySelector('#mvrHallNote');
  expect([box?.checked, box?.disabled, note?.textContent]).toEqual([true, false, HALL_ADDED]);
  box?.click();
  expect([states, note?.textContent]).toEqual([[false], HALL_OFF]);
});

it('follows the layer boxes: while a hall layer of the file is shown the desk adds none and the box is off', () => {
  const host = document.body.appendChild(document.createElement('div'));
  const hall = {
    fileHall: (hidden: readonly string[]) => !hidden.includes('H'),
    shown: () => true,
    onChange: () => undefined,
  };
  const layers = [
    { uuid: 'S', name: 'Stage' },
    { uuid: 'H', name: 'Venue' },
  ];
  fillLayerList(host, { layers, hiddenLayers: ['H'], hall }, () => undefined);
  const note = host.querySelector('#mvrHallNote');
  const desk = host.querySelector<HTMLInputElement>('#mvrHall');
  expect([note?.textContent, desk?.disabled]).toEqual([HALL_ADDED, false]);
  // the hall row is the last row, after the layers
  expect(host.lastElementChild).toBe(note);
  const boxes = Array.from(host.querySelectorAll<HTMLInputElement>('input[type=checkbox]:not(.mvrLayerLed)'));
  boxes.find((box) => box !== desk && !box.checked)?.click();
  expect([note?.textContent, desk?.disabled]).toEqual([HALL_OF_FILE, true]);
});
