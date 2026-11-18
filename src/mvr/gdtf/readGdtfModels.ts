import { attr, childElement, childElements } from '../xml/elements';
import type { GdtfModel } from './GdtfBody';

/** GDTF: mesh files sit in `models/<folder>`, and glTF is the preferred format, so it is looked for first. */
const FOLDERS = [
  ['gltf', 'glb'],
  ['3ds', '3ds'],
] as const;

/** GDTF: optional meshes with fewer or more vertices sit under the same file name in folders with these endings. */
const DETAILS = ['_low', '_high'] as const;

/** A model dimension in metres; missing, negative or not a number reads as the GDTF default 0. */
function dimension(model: Element, name: string): number {
  const value = Number(attr(model, name)?.trim() || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Where the mesh of a model `File` is in the GDTF archive. `entries` maps lower-case entry names to the stored
 * names, because writers do not agree on the case of folders and extensions.
 */
function locate(file: string, entries: ReadonlyMap<string, string>): Pick<GdtfModel, 'path' | 'format' | 'details'> {
  if (file === '') return { details: [] };
  const entry = (folder: string, extension: string): string | undefined =>
    entries.get(`models/${folder}/${file}.${extension}`.toLowerCase());
  const details = FOLDERS.flatMap(([folder, extension]) =>
    DETAILS.map((ending) => folder + ending).filter((name) => entry(name, extension) !== undefined),
  );
  for (const [folder, format] of FOLDERS) {
    const path = entry(folder, format);
    if (path !== undefined) return { path, format, details };
  }
  return { details };
}

/**
 * The `Model` collect of a GDTF `FixtureType` by model name, each model resolved against `entryNames`, the entry
 * names of the GDTF archive. Without entry names (a size-only read) no model gets a path.
 */
export function readModels(fixtureType: Element, entryNames: readonly string[]): Map<string, GdtfModel> {
  const entries = new Map(entryNames.map((name) => [name.toLowerCase(), name] as const));
  const collect = childElement(fixtureType, 'Models');
  const models = new Map<string, GdtfModel>();
  for (const el of collect ? childElements(collect, 'Model') : []) {
    const name = attr(el, 'Name') ?? '';
    const file = attr(el, 'File')?.trim() ?? '';
    models.set(name, {
      name,
      file,
      ...locate(file, entries),
      size: [dimension(el, 'Length'), dimension(el, 'Width'), dimension(el, 'Height')],
      primitiveType: attr(el, 'PrimitiveType') ?? 'Undefined',
    });
  }
  return models;
}
