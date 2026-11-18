import { mirrorLeftToRight } from '../../domain/stage/edit/mirror';
import { requireChild } from '../dom';
import { editToolbarMarkup } from './builderMarkup';
import type { KeyAction } from './builderKeys';
import type { EditorSession } from './EditorSession';
import { isEmptySelection } from './selection';
import { deleteSelection, duplicateSelection } from './selectionOps';

/** Every toolbar action: the keyboard ones plus Mirror, which has no key. */
export type EditAction = KeyAction | 'mirror';

/** The session members the toolbar uses. */
type ToolbarSession = Pick<EditorSession, 'undo' | 'redo' | 'edit' | 'selection' | 'canUndo' | 'canRedo' | 'onChange'>;

const ACTIONS: readonly EditAction[] = ['undo', 'redo', 'duplicate', 'delete', 'mirror'];

/**
 * Undo, Redo, Duplicate, Delete and Mirror for the draft. The keyboard shortcuts call `run` too, so a key and its
 * button can never do different things. A button that has nothing to act on gets `is-disabled`.
 */
export class EditToolbar {
  readonly #session: ToolbarSession;
  readonly #report: (text: string) => void;
  readonly #buttons: ReadonlyMap<EditAction, HTMLElement>;
  readonly #stop: () => void;

  /** `report` shows the text of an edit the domain refused (a toast in the app). */
  constructor(root: HTMLElement, session: ToolbarSession, report: (text: string) => void) {
    this.#session = session;
    this.#report = report;
    root.innerHTML = editToolbarMarkup;
    this.#buttons = new Map(ACTIONS.map((action) => [action, requireChild(root, `[data-edit="${action}"]`)]));
    for (const [action, button] of this.#buttons) button.onclick = () => this.run(action);
    this.#stop = session.onChange(() => this.#paint());
    this.#paint();
  }

  /** Runs one action on the session; a refused edit is reported, not thrown. */
  run(action: EditAction): void {
    const refused = this.#apply(action);
    if (refused !== null) this.#report(refused);
  }

  /** Stops following the session (U6). */
  dispose(): void {
    this.#stop();
  }

  #apply(action: EditAction): string | null {
    const session = this.#session;
    switch (action) {
      case 'undo':
        session.undo();
        return null;
      case 'redo':
        session.redo();
        return null;
      case 'duplicate':
        return session.edit(duplicateSelection(session.selection));
      case 'delete':
        return session.edit(deleteSelection(session.selection));
      case 'mirror':
        return session.edit(mirrorLeftToRight);
    }
  }

  #paint(): void {
    const isEmpty = isEmptySelection(this.#session.selection);
    const isOff: Readonly<Record<EditAction, boolean>> = {
      undo: !this.#session.canUndo,
      redo: !this.#session.canRedo,
      duplicate: isEmpty,
      delete: isEmpty,
      mirror: false,
    };
    for (const [action, button] of this.#buttons) button.classList.toggle('is-disabled', isOff[action]);
  }
}
