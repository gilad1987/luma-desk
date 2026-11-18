import { labelled } from './formControls';

/** A checkbox control; `onToggle` gets the new state. */
export interface CheckboxOptions {
  readonly label: string;
  /**
   * The focus key (`renderKeepingFocus`), required because a box label can repeat in one panel: the Stage tab shows
   * 'LED wall' twice, and a shared key gave the focus to the wrong box after a toggle.
   */
  readonly key: string;
  /** The Hebrew tooltip. */
  readonly title: string;
  readonly isOn: boolean;
  readonly onToggle: (isOn: boolean) => void;
}

/** A labelled checkbox with its own focus key. */
export function makeCheckbox(options: CheckboxOptions): HTMLElement {
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = options.isOn;
  box.title = options.title;
  box.dataset['focusKey'] = options.key;
  box.onchange = () => options.onToggle(box.checked);
  return labelled(options.label, box);
}
