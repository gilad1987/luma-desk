import { FakeElement } from './FakeElement';

/**
 * A file input: the picked files and the `change` handler the MVR pickers set. A subclass, not FakeElement fields,
 * because other tests type their inputs with a wider `files` and a non-null `onchange`.
 */
export class FakeFileInput extends FakeElement {
  /** `null` like a real input that never had a pick. */
  files: readonly File[] | null = null;
  onchange: (() => void) | null = null;

  constructor() {
    super('input');
  }
}
