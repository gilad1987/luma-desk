// @vitest-environment jsdom
/**
 * Owns what the start screen covers: the columns and the drawer are laid out under it but `inert` until a choice,
 * and reachable after it. The rest of mountBuilder is owned by mountBuilder.test.ts. jsdom, for real attributes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { builderMarkup } from '../../../../src/ui/builder/builderMarkup.ts';
import { EditorSession } from '../../../../src/ui/builder/EditorSession.ts';
import { mountBuilder } from '../../../../src/ui/builder/mountBuilder.ts';
import { sampleDesign } from '../../domain/stage/edit/sampleDesign.ts';
import { BuilderHarness } from './builderHarness.ts';
import { defineFakeSplitPanel } from './shell/defineFakeSplitPanel.ts';

const COVERED = ['.builder-library', '.builder-centre', '.builder-inspector', '.inspector-drawer'];

describe('mountBuilder on the start screen', () => {
  let host: HTMLElement;
  beforeEach(() => {
    vi.useFakeTimers();
    defineFakeSplitPanel();
    const h = new BuilderHarness(sampleDesign());
    host = document.body.appendChild(document.createElement('section'));
    host.innerHTML = builderMarkup;
    mountBuilder(host, new EditorSession(h.deps), h.deps);
  });
  afterEach(() => {
    host.remove();
    vi.useRealTimers();
  });
  const inert = (): [string, boolean][] =>
    COVERED.map((selector) => [selector, host.querySelector(selector)?.hasAttribute('inert') ?? false]);

  // Bug: Tab past the last start card reached the covered inspector, and its keys edited the draft before a choice
  it('makes the covered columns and the drawer inert before a choice', () => {
    expect(inert()).toEqual(COVERED.map((selector) => [selector, true]));
  });

  // catches a builder whose tools stay out of reach after the choice
  it('makes them reachable again once a template and a venue are chosen', () => {
    ['[data-template="theatre"]', '[data-venue="black-box"]'].forEach((selector) =>
      host.querySelector<HTMLElement>(selector)?.click(),
    );
    expect([host.classList.contains('is-editing'), inert()]).toEqual([
      true,
      COVERED.map((selector) => [selector, false]),
    ]);
  });
});
