import { multiply, type Mat4 } from '../math/Mat4';
import { attr, childElement, childText } from '../xml/elements';
import type { MeshPlacement, MvrLayerInfo } from './MvrScene';
import type { SymbolExpander } from './symbols';

/**
 * The mesh placements of one scene element: every `<Geometry3D>` and expanded `<Symbol>` in its `<Geometries>`, taken
 * to world space by the element's `world` matrix. It works by the presence of `<Geometries>`, not by tag, so the
 * spec objects (`SceneObject`, `Truss`, `Support`, `VideoScreen`, `Projector`, `GroupObject`), the Vectorworks
 * `Speaker` and `SpeakerBumper`, and any tag a newer writer invents all give stage geometry the same way. `kind` is
 * the tag, so render can style kinds apart; an element without `<Geometries>` gives no placements.
 */
export function placementsOf(el: Element, world: Mat4, layer: MvrLayerInfo, symbols: SymbolExpander): MeshPlacement[] {
  const geometries = childElement(el, 'Geometries');
  if (!geometries) return [];
  const uuid = attr(el, 'uuid') ?? '';
  // MVR lets a scene object, truss, support, video screen or projector name a GDTF (`GDTFSpec`, 0 or 1)
  const gdtfSpec = childText(el, 'GDTFSpec') ?? '';
  return symbols.meshesOf(geometries).map((mesh) => ({
    file: mesh.file,
    matrix: multiply(world, mesh.matrix),
    layer: layer.uuid,
    layerName: layer.name,
    kind: el.localName,
    name: attr(el, 'name') ?? '',
    uuid,
    ...(mesh.symdef === undefined ? {} : { symdef: mesh.symdef }),
    ...(gdtfSpec === '' ? {} : { gdtfSpec }),
  }));
}
