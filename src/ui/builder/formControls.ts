import { FIXTURE_ROLES } from '../../domain/stage/types';

/** One `<option>`: the stored value and the English text the user sees. */
export interface Choice {
  readonly value: string;
  readonly text: string;
}

/** A select control; `onPick` gets the value of the option the user picked. */
export interface SelectOptions {
  readonly label: string;
  /** The Hebrew tooltip. */
  readonly title: string;
  readonly choices: readonly Choice[];
  readonly value: string;
  readonly onPick: (value: string) => void;
}

/** Every fixture role as a choice; role names are console terms, so they stay English (decision 16). */
export const ROLE_CHOICES: readonly Choice[] = FIXTURE_ROLES.map((role) => ({ value: role, text: role }));

/** A `<label class="field">`: its English text, then `control`, so the label names the control for screen readers. */
export function labelled(text: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'field';
  const name = document.createElement('span');
  name.textContent = text;
  label.appendChild(name);
  label.appendChild(control);
  return label;
}

/** A plain button with an English text and a Hebrew tooltip. */
export function makeButton(text: string, title: string, onPress: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.title = title;
  button.onclick = () => onPress();
  return button;
}

/** A labelled checkbox; `onToggle` gets the new state. */
export function makeCheckbox(
  text: string,
  title: string,
  isOn: boolean,
  onToggle: (isOn: boolean) => void,
): HTMLElement {
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = isOn;
  box.title = title;
  box.onchange = () => onToggle(box.checked);
  return labelled(text, box);
}

/** A labelled select over `options.choices`, showing `options.value`. */
export function makeSelect(options: SelectOptions): HTMLElement {
  const select = document.createElement('select');
  select.title = options.title;
  for (const choice of options.choices) {
    const option = document.createElement('option');
    option.value = choice.value;
    option.textContent = choice.text;
    select.appendChild(option);
  }
  select.value = options.value;
  select.onchange = () => options.onPick(select.value);
  return labelled(options.label, select);
}

/** A section heading inside a panel. */
export function makeHeading(text: string): HTMLElement {
  const heading = document.createElement('h3');
  heading.className = 'panel-heading';
  heading.textContent = text;
  return heading;
}

/** Removes every child of `root`, the first step of a panel re-render. */
export function clearChildren(root: HTMLElement): void {
  for (const child of Array.from(root.children)) child.remove();
}

/**
 * The member of `list` equal to `value`, typed as the list's union. Options are built from the same list, so a miss
 * is a bug in the markup.
 * @throws Error when `value` is not in `list`.
 */
export function oneOf<T extends string>(list: readonly T[], value: string): T {
  const found = list.find((item) => item === value);
  if (found === undefined) throw new Error(`oneOf: ${value} is not one of ${list.join(', ')}`);
  return found;
}
