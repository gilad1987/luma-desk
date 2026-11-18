import type { StageFixture } from '../../../domain/stage/StageDesign';
import { LUMA_PROVIDER } from '../../luma/lumaData';
import { attr, childElement, childElements } from '../../xml/elements';
import { parseXml } from '../../xml/parseXml';
import type { PatchPlan } from '../autoPatch';
import type { ExportContext } from '../ExportContext';
import { planLayers } from '../exportLayers';
import { fixtureXml } from '../fixtureXml';
import { writeLumaData } from '../lumaUserData';
import { stableUuid } from '../stableUuid';
import { nameExporter, originalProviderOf } from './rootAttributes';
import { xmlElement } from '../xmlWriter';

/** One element the current writer makes, moved into `doc`. */
function adopt(doc: Document, xml: string): Element {
  return doc.importNode(parseXml(xml).documentElement, true);
}

/** The `<ChildList>` of a layer, made when the layer had none. */
function childListOf(layer: Element): Element {
  return childElement(layer, 'ChildList') ?? layer.appendChild(layer.ownerDocument.createElement('ChildList'));
}

/**
 * The `<ChildList>` a fixture added on the desk goes to: the layer its MVR facts name, unless that layer has its own
 * `<Matrix>` (the writer's pose is a world pose), else the desk's own `Fixtures` layer, made once at the end.
 */
function targetList(layers: Element, layerUuid: string, fallback: { uuid: string; name: string }): Element {
  const all = childElements(layers, 'Layer');
  const named = all.find((layer) => attr(layer, 'uuid') === layerUuid && !childElement(layer, 'Matrix'));
  if (named) return childListOf(named);
  const own = all.find((layer) => attr(layer, 'uuid') === fallback.uuid);
  return childListOf(own ?? layers.appendChild(adopt(layers.ownerDocument, xmlElement('Layer', fallback, []))));
}

/**
 * Appends the fixtures the desk added, written as the current writer writes them (auto-patched like a plain
 * export), each with its 1-based unit among the added fixtures of its truss.
 */
export function appendAdded(
  layers: Element,
  added: readonly StageFixture[],
  context: ExportContext,
  plan: PatchPlan,
): void {
  if (added.length === 0) return;
  const layerPlan = planLayers(context.design);
  // the same uuid and name as the plain writer's fixture layer, so a desk export and this one agree
  const fallback = { uuid: stableUuid('layer|fixtures'), name: 'Fixtures' };
  const units = new Map<string | null, number>();
  for (const fixture of added) {
    const unit = (units.get(fixture.trussId) ?? 0) + 1;
    units.set(fixture.trussId, unit);
    const xml = fixtureXml(fixture, { patch: plan.patches.get(fixture.id), unit }, context);
    targetList(layers, layerPlan.layerOf(fixture.id), fallback).appendChild(adopt(layers.ownerDocument, xml));
  }
}

/**
 * Replaces the desk's own `<Data provider="LUMA DESK">` in the root `<UserData>` with the current one; data of other
 * providers stays. A file without root `<UserData>` gets one as the first child, where the spec puts it.
 */
export function replaceLumaData(doc: Document, context: ExportContext, unpatched: ReadonlyMap<string, number>): void {
  const root = doc.documentElement;
  // Read before the root names the desk and before the old desk data goes: both may hold the first writer.
  const fresh = adopt(doc, writeLumaData(context.design, context.offset, unpatched, originalProviderOf(doc)));
  nameExporter(root);
  const userData = childElement(root, 'UserData');
  if (!userData) {
    root.insertBefore(fresh, root.firstElementChild);
    return;
  }
  for (const data of childElements(userData, 'Data')) if (attr(data, 'provider') === LUMA_PROVIDER) data.remove();
  for (const data of childElements(fresh)) userData.appendChild(data);
}
