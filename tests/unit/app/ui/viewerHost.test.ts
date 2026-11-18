// @vitest-environment jsdom
/**
 * Owns the 3D viewer move into the builder's pane and back. That the WebGL canvas keeps drawing after the move needs
 * a real browser, so it is owned by tests/e2e/builder-*.spec.ts.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { attachViewer } from '../../../../src/app/ui/viewerHost';

function shell(markup: string): HTMLElement {
  document.body.innerHTML = `<main id="main">${markup}</main>`;
  const pane = document.createElement('div');
  document.body.append(pane);
  return pane;
}

const childIds = (id: string): string[] =>
  Array.from(document.getElementById(id)?.children ?? [], (el: Element) => el.id);

describe('attachViewer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // catches a viewer copied or left behind: the pane must hold the one #viewer, and #main must lose it
  it('moves #viewer into the pane', () => {
    const pane = shell('<section id="viewer"></section><aside id="side"></aside>');
    attachViewer(pane);
    expect([pane.firstElementChild?.id, childIds('main')]).toEqual(['viewer', ['side']]);
  });

  // catches a viewer put back after #side, which breaks the shell grid order
  it('puts #viewer back before #side on dispose', () => {
    const pane = shell('<section id="viewer"></section><aside id="side"></aside>');
    attachViewer(pane)();
    expect([pane.children.length, childIds('main')]).toEqual([0, ['viewer', 'side']]);
  });

  // catches a restore that assumes a sibling after the viewer still exists in #main
  it('puts #viewer first when #side is the only child left', () => {
    const pane = shell('<section id="viewer"></section>');
    const detach = attachViewer(pane);
    document.getElementById('main')?.append(Object.assign(document.createElement('aside'), { id: 'side' }));
    detach();
    expect(childIds('main')).toEqual(['viewer', 'side']);
  });

  // catches a restore that throws on an empty #main (firstChild null must append)
  it('appends #viewer when #main is empty', () => {
    const pane = shell('<section id="viewer"></section>');
    attachViewer(pane)();
    expect(childIds('main')).toEqual(['viewer']);
  });
});
