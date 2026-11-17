import { FakeElement } from '../../fakes/FakeElement';

/** A host element panels render into: it records the markup and answers `querySelectorAll` from `found`. */
export class FakeHost extends FakeElement {
  html = '';
  readonly found = new Map<string, FakeElement[]>();

  insertAdjacentHTML(where: string, html: string): void {
    this.html = where === 'afterbegin' ? html + this.html : this.html + html;
  }

  querySelectorAll(selector: string): FakeElement[] {
    return this.found.get(selector) ?? [];
  }
}
