import { vi } from 'vitest';
import { FakeClassList } from './FakeClassList';
import type { FakePointerEvent } from './fakePointer';
import { matcherFor } from './fakeSelector';
import { FakeStyle } from './FakeStyle';

type Handler<E> = ((ev: E) => void) | null;

/**
 * Just enough of an element for the components. `querySelector` finds `#id` and `[data-name="value"]` among the
 * children (`matcherFor`); when no child matches, or for any other selector, it hands out one stable part per
 * selector, which stands in for the markup a component writes with `innerHTML`.
 */
export class FakeElement {
  id = '';
  className = '';
  innerHTML = '';
  textContent = '';
  value = '';
  offsetWidth = 0;
  offsetHeight = 0;
  clientLeft = 0;
  clientTop = 0;
  offsetLeft = 0;
  offsetTop = 0;
  currentCSSZoom = 1;
  offsetParent: FakeElement | null = null;
  parent: FakeElement | null = null;
  rect = { left: 0, top: 0, width: 0, height: 0 };
  readonly tagName: string;
  readonly dataset: Record<string, string> = {};
  readonly classList = new FakeClassList();
  readonly style = new FakeStyle();
  readonly children: FakeElement[] = [];
  /** Children by selector; a null entry makes the selector match nothing. */
  readonly parts = new Map<string, FakeElement | null>();
  readonly captured = new Set<number>();
  /** Moves `document.activeElement` here, as the DOM does, when a FakeDom document is installed. */
  readonly focus = vi.fn(
    (): void => void (typeof document === 'object' && Object.assign(document, { activeElement: this })),
  );
  readonly select = vi.fn();
  onclick: Handler<{ readonly target: unknown }> = null;
  ondblclick: Handler<undefined> = null;
  onkeydown: Handler<{ readonly key: string }> = null;
  onpointerdown: Handler<FakePointerEvent> = null;
  onpointermove: Handler<FakePointerEvent> = null;
  onpointerup: Handler<FakePointerEvent> = null;
  onpointerleave: Handler<FakePointerEvent> = null;
  onwheel: Handler<{ readonly deltaY: number; readonly shiftKey: boolean; readonly preventDefault: () => void }> = null;

  constructor(tagName = 'div') {
    this.tagName = tagName;
  }

  appendChild(child: FakeElement): FakeElement {
    child.parent = this;
    this.children.push(child);
    return child;
  }
  remove(): void {
    this.parent?.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = null;
  }
  /** As the DOM does: removes every child, then appends `children`. The builder panels re-render this way. */
  replaceChildren(...children: FakeElement[]): void {
    for (const child of [...this.children]) child.remove();
    for (const child of children) this.appendChild(child);
  }
  /** True for this element and every element below it, as `Node.contains`. */
  contains(other: FakeElement | null): boolean {
    for (let el = other; el !== null; el = el.parent) if (el === this) return true;
    return false;
  }
  querySelector(selector: string): FakeElement | null {
    const matches = matcherFor(selector);
    const child = matches ? this.#descendants().find(matches) : undefined;
    if (child) return child;
    if (!this.parts.has(selector)) this.parts.set(selector, new FakeElement());
    return this.parts.get(selector) ?? null;
  }
  /** The child `querySelector` hands out for `selector`, created on first use. */
  part(selector: string): FakeElement {
    const found = this.querySelector(selector);
    if (!found) throw new Error(`no fake part ${selector}`);
    return found;
  }
  setPointerCapture = (id: number): void => void this.captured.add(id);
  hasPointerCapture = (id: number): boolean => this.captured.has(id);
  getBoundingClientRect(): { left: number; top: number; width: number; height: number } {
    return this.rect;
  }
  #descendants(): FakeElement[] {
    return this.children.flatMap((child) => [child, ...child.#descendants()]);
  }
}

/** A distinct class for the `HTMLCanvasElement` stub, so boxMap takes its canvas path. */
export class FakeCanvas extends FakeElement {}
