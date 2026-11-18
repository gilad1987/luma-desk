/** One tab: its English label, Hebrew tooltip and the panel it shows. */
export interface ToolTab {
  readonly label: string;
  readonly title: string;
  readonly panel: HTMLElement;
}

/** Tab steps of the arrow keys in a left-to-right page; a right-to-left page flips them, so Left is the next tab. */
const ARROW_STEPS: Readonly<Record<string, number>> = { ArrowRight: 1, ArrowLeft: -1 };

/**
 * The Stage, Trusses and Fixtures tabs, in that order, as an ARIA tablist: one tab in the Tab order (roving
 * `tabIndex`), arrow keys and Home/End move between tabs. It owns which panel shows, not what the panels draw.
 */
export class ToolTabs {
  readonly root: HTMLElement;
  readonly #tabs: HTMLButtonElement[];
  readonly #panels: HTMLElement[];
  /** The tablist; its computed `direction` flips the arrow keys, so a `dir` on any ancestor counts, not only `<html>`. */
  readonly #list: HTMLElement;
  #active = 0;

  constructor(tabs: readonly ToolTab[]) {
    this.root = document.createElement('div');
    this.root.className = 'tool-tabs';
    const list = document.createElement('div');
    this.#list = list;
    list.className = 'tool-tablist';
    list.role = 'tablist';
    this.root.appendChild(list);
    this.#panels = tabs.map((tab) => tab.panel);
    this.#tabs = tabs.map((tab, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tool-tab';
      button.role = 'tab';
      button.textContent = tab.label;
      button.title = tab.title;
      button.onclick = () => this.show(index);
      button.onkeydown = (ev) => this.#moveByKey(ev);
      tab.panel.classList.add('tool-panel');
      tab.panel.role = 'tabpanel';
      tab.panel.ariaLabel = tab.label;
      list.appendChild(button);
      this.root.appendChild(tab.panel);
      return button;
    });
    this.show(0);
  }

  /** Shows the panel at `index` and marks its tab selected. */
  show(index: number): void {
    this.#active = index;
    this.#tabs.forEach((tab, i) => {
      tab.ariaSelected = String(i === index);
      tab.tabIndex = i === index ? 0 : -1;
      tab.classList.toggle('is-active', i === index);
    });
    this.#panels.forEach((panel, i) => (panel.hidden = i !== index));
  }

  #moveByKey(ev: KeyboardEvent): void {
    const target = this.#targetOf(ev.key);
    if (target === null) return;
    ev.preventDefault();
    this.show(target);
    this.#tabs[target]?.focus();
  }

  #targetOf(key: string): number | null {
    const count = this.#tabs.length;
    if (key === 'Home') return 0;
    if (key === 'End') return count - 1;
    const step = ARROW_STEPS[key];
    if (step === undefined) return null;
    const direction = getComputedStyle(this.#list).direction === 'rtl' ? -step : step;
    return (this.#active + direction + count) % count;
  }
}
