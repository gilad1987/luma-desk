import type { EditOp } from './EditorSession';

/** Runs one edit from a control and shows what the session says about it. */
export type RunEdit = (op: EditOp) => void;

/**
 * The line that shows why an edit was refused, next to the control that made it. A refused edit changes nothing, so
 * the panels do not re-render and the text stays until the next edit the session accepts rebuilds the panel.
 */
export class ErrorText {
  readonly root: HTMLElement;

  constructor() {
    this.root = document.createElement('span');
    this.root.className = 'field-error';
    this.root.role = 'alert';
    this.show(null);
  }

  /** Shows `text`, or hides the line for `null`. */
  show(text: string | null): void {
    this.root.textContent = text ?? '';
    this.root.hidden = text === null;
  }
}
