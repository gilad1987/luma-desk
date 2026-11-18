import { FakeElement } from './FakeElement';

/** A fake element whose `click()` runs its `onclick`, as a real synthetic click does. */
export class FakeButton extends FakeElement {
  click(): void {
    this.onclick?.({ target: this });
  }
}

/** A fake container with `firstChild`, for the feedback lines the command line trims. */
export class FakeList extends FakeElement {
  get firstChild(): FakeElement | null {
    return this.children[0] ?? null;
  }
}
