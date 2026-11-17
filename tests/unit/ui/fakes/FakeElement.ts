import { vi } from 'vitest';
import type { FakePointerEvent } from './fakePointer';

type Handler<E> = ((ev: E) => void) | null;

/** A class list over a Set, enough for the toggles the components make. */
export class FakeClassList {
  readonly tokens = new Set<string>();
  add = (t: string): void => void this.tokens.add(t);
  remove = (t: string): void => void this.tokens.delete(t);
  contains = (t: string): boolean => this.tokens.has(t);
  toggle = (t: string, force?: boolean): boolean => {
    const on = force ?? !this.tokens.has(t);
    if (on) this.tokens.add(t);
    else this.tokens.delete(t);
    return on;
  };
}

/** The style fields the components write; custom properties land in `custom`. */
export class FakeStyle {
  cssText = '';
  display = '';
  height = '';
  bottom = '';
  transform = '';
  readonly custom = new Map<string, string>();
  setProperty = (name: string, value: string): void => void this.custom.set(name, value);
}

/** Just enough of an element for the components; `querySelector` hands out one stable child per selector. */
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
  readonly focus = vi.fn();
  readonly select = vi.fn();
  onclick: Handler<{ readonly target: unknown }> = null;
  ondblclick: Handler<undefined> = null;
  onkeydown: Handler<{ readonly key: string }> = null;
  onpointerdown: Handler<FakePointerEvent> = null;
  onpointermove: Handler<FakePointerEvent> = null;
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
  }
  querySelector(selector: string): FakeElement | null {
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
}

/** A distinct class for the `HTMLCanvasElement` stub, so boxMap takes its canvas path. */
export class FakeCanvas extends FakeElement {}
