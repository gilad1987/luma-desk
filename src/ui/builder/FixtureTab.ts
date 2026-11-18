import type { StageDesign } from '../../domain/stage/StageDesign';
import { he } from '../../i18n/he';
import { addFixtureFields, FLOOR, type AddForm } from './addFixtureFields';
import { addFixturesOp } from './addFixturesOp';
import type { EditorSession } from './EditorSession';
import { ErrorText } from './ErrorText';
import { makeButton, makeHeading } from './formControls';

/**
 * The Fixtures tab: "Add N fixtures" of a type, on a truss or as a floor row, with a role. The choices live here, not
 * in the draft, so they survive re-renders; until the user picks a target, the tab follows the selected truss. Add is
 * disabled while the Count field holds invalid input; a re-render shows the last valid count again and enables it.
 */
export class FixtureTab {
  readonly root: HTMLElement = document.createElement('div');
  readonly #session: EditorSession;
  readonly #form: AddForm = { type: 'wash', count: 6, isCountValid: true, target: null, role: null };

  constructor(session: EditorSession) {
    this.#session = session;
    this.render();
  }

  /** Rebuilds the tab from the current draft, keeping the user's choices. */
  render(): void {
    const d = this.#session.draft;
    const error = new ErrorText();
    this.#form.isCountValid = true;
    const add = makeButton('Add fixtures', he.builder.tools.add, () => error.show(this.#add()));
    const onCount = (): void => {
      add.disabled = !this.#form.isCountValid;
    };
    const fields = addFixtureFields(this.#form, this.#targetIn(d), d.trusses, onCount);
    this.root.replaceChildren(makeHeading('Add fixtures'), ...fields, add, error.root);
  }

  /** Reads the target at click time: a target picked after the last render must count. */
  #add(): string | null {
    const { type, count, role, isCountValid } = this.#form;
    if (!isCountValid) return null;
    const target = this.#targetIn(this.#session.draft);
    return this.#session.edit(addFixturesOp({ type, count, role, trussId: target === FLOOR ? null : target }));
  }

  /** The picked target while it exists, else the selected truss, the first truss, or a floor row. */
  #targetIn(d: StageDesign): string {
    const picked = this.#form.target;
    if (picked === FLOOR) return FLOOR;
    if (picked !== null && d.trusses.some((t) => t.id === picked)) return picked;
    return this.#session.selection.trusses[0] ?? d.trusses[0]?.id ?? FLOOR;
  }
}
