import type { StageFixture } from '../../domain/stage/StageDesign';
import type { StageTruss } from '../../domain/stage/trussTypes';
import { he } from '../../i18n/he';
import type { EditorSession } from './EditorSession';
import { fixtureProps } from './fixtureProps';
import { clearChildren, makeHeading } from './formControls';
import { trussProps } from './trussProps';

/**
 * The fields of the first selected item, below the tabs: a fixture first, else a truss, else a hint. It shows one
 * item because a field of several items would need a mixed-value state the MVP does not have.
 */
export class PropertyPanel {
  readonly root: HTMLElement = document.createElement('div');
  readonly #session: EditorSession;

  constructor(session: EditorSession) {
    this.#session = session;
    this.root.className = 'prop-panel';
    this.render();
  }

  /** Rebuilds the panel from the current draft and selection. */
  render(): void {
    clearChildren(this.root);
    const { draft, selection } = this.#session;
    const fixture = draft.fixtures.find((f) => f.id === selection.fixtures[0]);
    const truss = draft.trusses.find((t) => t.id === selection.trusses[0]);
    for (const part of [makeHeading('Properties'), ...this.#fieldsOf(fixture, truss)]) this.root.appendChild(part);
  }

  #fieldsOf(fixture: StageFixture | undefined, truss: StageTruss | undefined): HTMLElement[] {
    if (fixture) return fixtureProps(this.#session, fixture);
    if (truss) return trussProps(this.#session, truss);
    const hint = document.createElement('p');
    hint.className = 'panel-hint';
    hint.textContent = he.builder.props.nothingSelected;
    return [hint];
  }
}
