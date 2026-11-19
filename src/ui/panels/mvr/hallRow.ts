import { createElement } from '../../shared';

/** What the hall row needs from the app. */
export interface HallControl {
  /** Whether a hall layer of the file is shown while the layers with the uuids in `hidden` are not. */
  readonly fileHall: (hidden: readonly string[]) => boolean;
  /** The choice now: a list that opens later shows it. */
  readonly shown: () => boolean;
  readonly onChange: (shown: boolean) => void;
}

export const HALL_ADDED = 'The hall around the stage is added by the desk; it is not in the file.';
export const HALL_OFF = 'No hall is shown around the stage.';
export const HALL_OF_FILE = 'The hall of the file is shown; the desk adds none.';

/**
 * The summary line of the hall. It says in every state where the walls in the picture come from, so nobody takes
 * the desk's walls and ceiling for the venue of the MVR.
 */
export function hallLine(shown: boolean, fileHall: boolean): string {
  if (fileHall) return HALL_OF_FILE;
  return shown ? HALL_ADDED : HALL_OFF;
}

/**
 * The "Desk hall" row at the end of the layer list: a box and the summary line. The desk adds its hall only while no
 * hall layer of the file is shown, so the box is off while one is; `hidden` gives the uuids of the unchecked layers
 * now. It returns the call that words the line again, for the list to make when a layer box changes. The labels are
 * English inline, like the other summary labels.
 */
export function hallRow(host: HTMLElement, control: HallControl, hidden: () => readonly string[]): () => void {
  const row = createElement('label', 'mvrLayer');
  const box = createElement('input');
  box.type = 'checkbox';
  box.id = 'mvrHall';
  box.checked = control.shown();
  const name = createElement('span');
  name.textContent = 'Desk hall';
  const note = createElement('div');
  note.id = 'mvrHallNote';
  const update = (): void => {
    const fileHall = control.fileHall(hidden());
    box.disabled = fileHall;
    note.textContent = hallLine(box.checked, fileHall);
  };
  box.onchange = () => {
    control.onChange(box.checked);
    update();
  };
  row.appendChild(box);
  row.appendChild(name);
  host.appendChild(row);
  host.appendChild(note);
  update();
  return update;
}
