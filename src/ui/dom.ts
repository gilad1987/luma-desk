/** A class usable with `instanceof`; abstract so the DOM interface constructors (`HTMLInputElement`, …) fit. */
type ElementKind<T extends HTMLElement> = abstract new (...args: never[]) => T;

/**
 * The element with `id`, checked against `kind` when one is given. It throws instead of returning null: every id the
 * UI asks for comes from a TS template (the page shell the composition root inserts before any panel runs, or a
 * panel's own markup), so a miss means a template and its code disagree. That bug should fail at boot, not hide
 * behind a `!` until the first click.
 */
export function byId(id: string): HTMLElement;
export function byId<T extends HTMLElement>(id: string, kind: ElementKind<T>): T;
export function byId<T extends HTMLElement>(id: string, kind?: ElementKind<T>): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`#${id} is missing from the page`);
  if (kind && !(found instanceof kind)) throw new Error(`#${id} is not a ${kind.name}`);
  return found;
}

/**
 * The first element under `root` that matches `selector`. Components look up the parts of markup they built
 * themselves, so a miss is a bug in that markup and throws, the same contract as {@link byId}.
 */
export function requireChild(root: ParentNode, selector: string): HTMLElement {
  const found = root.querySelector(selector);
  if (!(found instanceof HTMLElement)) throw new Error(`no HTML element matches ${selector}`);
  return found;
}
