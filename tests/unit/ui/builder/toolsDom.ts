/**
 * Reads and drives the builder tool panels on the FakeDom by what the user sees: a control by its label text, a
 * button by its text. The panels build their DOM with `createElement`, so the walk follows `children`.
 */
import type { FakeElement } from '../../../shared/dom';

/** A DOM property the fake does not declare (`role`, `hidden`, `ariaSelected`, …), as the code set it. */
export function prop(el: FakeElement, name: string): unknown {
  const value: unknown = Reflect.get(el, name);
  return value;
}

/** `root` and every element below it, depth first. */
export function descendants(root: FakeElement): FakeElement[] {
  return [root, ...root.children.flatMap(descendants)];
}

/** The control of the `<label>` whose text is `text`. */
export function control(root: FakeElement, text: string): FakeElement {
  const label = descendants(root).find((el) => el.tagName === 'label' && el.children[0]?.textContent === text);
  const found = label?.children[1];
  if (!found) throw new Error(`no control labelled ${text}`);
  return found;
}

/** The button whose text is `text`. */
export function button(root: FakeElement, text: string): FakeElement {
  const found = descendants(root).find((el) => el.tagName === 'button' && el.textContent === text);
  if (!found) throw new Error(`no button ${text}`);
  return found;
}

/** Clicks `el` as the user does. */
export function click(el: FakeElement): void {
  el.onclick?.({ target: el });
}

/** Types `value` into an input or picks it in a select, then fires `change`. */
export function change(el: FakeElement, value: string): void {
  el.value = value;
  fireChange(el);
}

/** Sets a checkbox, then fires `change`. */
export function check(el: FakeElement, isOn: boolean): void {
  Object.assign(el, { checked: isOn });
  fireChange(el);
}

/** The text of every error line that shows. */
export function shownErrors(root: FakeElement): string[] {
  return descendants(root)
    .filter((el) => el.className === 'field-error' && prop(el, 'hidden') === false)
    .map((el) => el.textContent);
}

function fireChange(el: FakeElement): void {
  const handler = prop(el, 'onchange');
  if (!isHandler(handler)) throw new Error(`no change handler on ${el.tagName}`);
  handler();
}

function isHandler(value: unknown): value is () => void {
  return typeof value === 'function';
}
