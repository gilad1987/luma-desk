import { vi } from 'vitest';
import { FakeCanvas, FakeElement } from './FakeElement';
import { escapeCss } from './fakeSelector';

type Project = (x: number, y: number) => readonly [number, number];

/**
 * The page as the components see it, installed with `vi.stubGlobal` (no DOM library is installed): ids resolve to
 * registered fakes, `Element`/`HTMLElement`/`HTMLInputElement` are the fake class, `CSS.escape` is `escapeCss`, and the
 * `<i>` probes of boxMap report where `project` puts their `left`/`top`. Call `vi.unstubAllGlobals()` after each test.
 */
export class FakeDom {
  readonly body = new FakeElement('body');
  /** Every element `document.createElement` made, in order (boxMap probes excluded). */
  readonly created: FakeElement[] = [];
  readonly documentClicks: ((ev: { readonly target: unknown }) => void)[] = [];
  readonly #elements = new Map<string, FakeElement>();
  project: Project = (x, y) => [x, y];

  constructor() {
    vi.stubGlobal('document', {
      body: this.body,
      getElementById: (id: string) => this.#elements.get(id) ?? null,
      createElement: (tag: string) => (tag === 'i' ? this.#probe() : this.#create(tag)),
      addEventListener: (_type: string, listener: (ev: { readonly target: unknown }) => void) =>
        this.documentClicks.push(listener),
    });
    vi.stubGlobal('Element', FakeElement);
    vi.stubGlobal('HTMLElement', FakeElement);
    vi.stubGlobal('HTMLInputElement', FakeElement);
    vi.stubGlobal('HTMLCanvasElement', FakeCanvas);
    vi.stubGlobal('CSS', { escape: escapeCss });
  }

  /** Registers `element` (a new fake by default) under `id`. */
  add<T extends FakeElement>(id: string, element: T): T;
  add(id: string): FakeElement;
  add(id: string, element = new FakeElement()): FakeElement {
    element.id = id;
    this.#elements.set(id, element);
    return element;
  }

  /** The fake registered under `id`. */
  get(id: string): FakeElement {
    const found = this.#elements.get(id);
    if (!found) throw new Error(`no fake #${id}`);
    return found;
  }

  #create(tag: string): FakeElement {
    const element = new FakeElement(tag);
    this.created.push(element);
    return element;
  }

  #probe(): FakeElement {
    const probe = new FakeElement('i');
    probe.getBoundingClientRect = () => {
      const px = (name: string): number => Number(new RegExp(`${name}:(-?[\\d.]+)px`).exec(probe.style.cssText)?.[1]);
      const [left, top] = this.project(px('left'), px('top'));
      return { left, top, width: 0, height: 0 };
    };
    return probe;
  }
}
