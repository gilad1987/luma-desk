import { MAX_SCENE_DEPTH } from '../../scene/walkScene';
import { childElement, childElements } from '../../xml/elements';

/**
 * The `<Fixture>` elements in the order the import's walk meets them (`walkScene`): through the first `<ChildList>` of
 * each layer and of each element in it, parent before child, down to the same depth. A malformed file can hold a
 * `<Fixture>` elsewhere (beside a `<ChildList>`, in a second one). The import never saw it, so it has no desk fixture
 * and no place in the count of repeated uuids; counting it would hand it the edit of another fixture. Such an element
 * stays in the file as it is.
 */
export function walkedFixtures(layers: Element): Element[] {
  const found: Element[] = [];
  const walk = (owner: Element, depth: number): void => {
    const list = depth > MAX_SCENE_DEPTH ? undefined : childElement(owner, 'ChildList');
    for (const child of list ? childElements(list) : []) {
      if (child.localName === 'Fixture') found.push(child);
      walk(child, depth + 1);
    }
  };
  for (const layer of childElements(layers, 'Layer')) walk(layer, 0);
  return found;
}
