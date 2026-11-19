import type { StageDesign } from '../../domain/stage/StageDesign';
import { exportContext, type ExportContext } from './ExportContext';
import { planLayers, type LayerPlan } from './exportLayers';
import { LUMA_PROVIDER } from '../luma/lumaData';
import { planPatches, type PatchPlan } from './autoPatch';
import { auxNameNodes } from './fixtureFileData';
import { fixtureXml } from './fixtureXml';
import { gdtfIdentity, isStandInSpec } from './gdtfIdentity';
import { writeLumaData } from './lumaUserData';
import { LUMA_PROVIDER_VERSION } from './passThrough/rootAttributes';
import { stageObjects, type StageObject } from './stageObjects';
import { writeSymdefs } from './symdefs';
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
  /** Fixtures that name a desk stand-in GDTF (`isStandInSpec`), which is no file anywhere. */
  readonly standIns: number;
}

/** MVR 1.6: "The first XML node is always the XML description node: `<?xml version="1.0" encoding="UTF-8"?>`". */
const DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
const ROOT = { verMajor: '1', verMinor: '6', provider: LUMA_PROVIDER, providerVersion: LUMA_PROVIDER_VERSION };

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
    return xmlElement('Layer', { uuid: layer.fileUuid ?? layer.uuid, name: layer.name }, [childList]);
  });
  const aux = writeSymdefs(objects, context, auxNameNodes(design.mvr));
  const scene = xmlElement('Scene', {}, [...aux, xmlElement('Layers', {}, layerXml)]);
  // the hidden layers by the keys the next import gives the layers as written, so it hides the same ones
  const hiddenLayers = design.mvr?.hiddenLayers.map((key) => layers.keyAfter.get(key) ?? key) ?? [];
  const written = design.mvr ? { ...design, mvr: { ...design.mvr, hiddenLayers } } : design;
  const root = xmlElement('GeneralSceneDescription', ROOT, [writeLumaData(written, context.offset), scene]);
  const specs = design.fixtures.map((fixture) => gdtfIdentity(fixture, design.mvr).spec);
  const gdtfSpecs = [...new Set(specs)].filter(Boolean);
  const fixtures = design.fixtures.length;
  const standIns = specs.filter(isStandInSpec).length;
  const xml = `${DECLARATION}\n${root}\n`;
  return { xml, fixtures, patchPlan, objects, layers: layers.all.length, gdtfSpecs, standIns };
}
