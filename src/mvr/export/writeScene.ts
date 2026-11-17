import type { StageDesign } from '../../domain/stage/StageDesign';
import { exportContext, type ExportContext } from './ExportContext';
import { planLayers, type LayerPlan } from './exportLayers';
import { LUMA_PROVIDER } from '../luma/lumaData';
import { planPatches, type PatchPlan } from './autoPatch';
import { fixtureXml } from './fixtureXml';
import { gdtfIdentity } from './gdtfIdentity';
import { writeLumaData } from './lumaUserData';
import { stageObjects, type StageObject } from './stageObjects';
import { xmlElement } from './xmlWriter';

/** The written `GeneralSceneDescription.xml` and the facts the export summary reports. */
export interface WrittenScene {
  readonly xml: string;
  readonly fixtures: number;
  readonly patchPlan: Omit<PatchPlan, 'patches'>;
  readonly objects: readonly StageObject[];
  readonly layers: number;
  /** Every GDTF file name the fixtures refer to, once each, in first-use order. */
  readonly gdtfSpecs: readonly string[];
}

const DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>';
const ROOT = { verMajor: '1', verMinor: '6', provider: LUMA_PROVIDER, providerVersion: '1' };

/** Appends the fixtures to their layers; units count per truss in design order. Gives the patch plan. */
function addFixtures(context: ExportContext, layers: LayerPlan, children: Map<string, string[]>): PatchPlan {
  const plan = planPatches(context.design.fixtures, context.design.mvr);
  const units = new Map<string | null, number>();
  for (const fixture of context.design.fixtures) {
    const unit = (units.get(fixture.trussId) ?? 0) + 1;
    units.set(fixture.trussId, unit);
    const xml = fixtureXml(fixture, { patch: plan.patches.get(fixture.id), unit }, context);
    children.get(layers.layerOf(fixture.id))?.push(xml);
  }
  return plan;
}

/**
 * Writes the scene of a design as MVR 1.6 XML: the luma `<UserData>`, then the layers with the fixtures and stage
 * objects. The same design always gives the same text (stable uuids, fixed number format), so two exports compare
 * equal and a diff of two designs shows only what changed.
 */
export function writeScene(design: StageDesign): WrittenScene {
  const context = exportContext(design);
  const layers = planLayers(design);
  const children = new Map<string, string[]>(layers.all.map((layer) => [layer.uuid, []]));
  const patchPlan = addFixtures(context, layers, children);
  const objects = stageObjects(context);
  for (const object of objects) children.get(layers.partLayer(object.part))?.push(object.xml);
  const layerXml = layers.all.map((layer) => {
    const childList = xmlElement('ChildList', {}, children.get(layer.uuid) ?? []);
    return xmlElement('Layer', { uuid: layer.uuid, name: layer.name }, [childList]);
  });
  const scene = xmlElement('Scene', {}, [xmlElement('Layers', {}, layerXml)]);
  const root = xmlElement('GeneralSceneDescription', ROOT, [writeLumaData(design, context.offset), scene]);
  const specs = design.fixtures.map((fixture) => gdtfIdentity(fixture, design.mvr).spec);
  const gdtfSpecs = [...new Set(specs)].filter(Boolean);
  const fixtures = design.fixtures.length;
  return { xml: `${DECLARATION}\n${root}\n`, fixtures, patchPlan, objects, layers: layers.all.length, gdtfSpecs };
}
