import type { MvrDesignInfo, MvrFixtureInfo } from '../../domain/stage/mvr';
import { fileColorOf, type MvrAuxName } from '../../domain/stage/mvrFileData';
import { uuidKey } from '../scene/auxNames';
import { xmlElement, xmlText } from './xmlWriter';

/** MVR 1.6, UUID: "Formatted as `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`", "The nil UUID (all zeros) is not permitted." */
const UUID = /^(?![0-]+$)[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/**
 * The uuid a `<Classing>` or `<Position>` reference is written with: the file's own, when the file defined the node
 * (the design holds its name) and the text is a UUID. A dangling reference names a node that exists nowhere, so it
 * is not written again; `plainLosses` counts it.
 */
export function auxUuid(entry: MvrAuxName | undefined): string | undefined {
  return entry?.name !== undefined && UUID.test(entry.uuid) ? entry.uuid : undefined;
}

/** The file data of one fixture as `<Fixture>` children, by their place in the MVR 1.6 Table 26 child order. */
export interface FileDataXml {
  /** `Classing`, after `Matrix`. */
  readonly classing: readonly string[];
  /** `CastShadow`, `DMXInvertPan`, `DMXInvertTilt`, `Position`, `Function`, after `GDTFMode` (and `Focus`). */
  readonly traits: readonly string[];
  /** `CustomCommands`, then `Color`, after `Addresses`. */
  readonly drawn: readonly string[];
}

const one = (tag: string, text: string | undefined): string[] => (text === undefined ? [] : [xmlText(tag, text)]);
/** MVR 1.6, Bool: "When representing `true` inidcate with true, when `false` indicate with false." */
const bool = (tag: string, value: boolean | undefined): string[] => one(tag, value?.toString());
/** Six decimals, as the spec's own example `0.314303,0.328065,87.699166`; the design holds four. */
const float = (value: number): string => String(+value.toFixed(6));

/**
 * What the design holds of the file's `<Fixture>` data, written again so the plain export loses none of it. Every
 * node is one Table 26 defines. `commands` are the `CustomCommand` texts that are still true for the desk fixture
 * (`writtenCommands`), in file order: "The Custom command contains the command that will be executed on the fixture."
 * `Color`: "CIE 1931 xyY absolute color point. Formatted as three Floats `x,y,Y`".
 */
export function fileDataXml(
  mvr: MvrDesignInfo | undefined,
  info: MvrFixtureInfo | undefined,
  texts: readonly string[],
): FileDataXml {
  if (mvr === undefined || info === undefined) return { classing: [], traits: [], drawn: [] };
  const commands = texts.map((text) => xmlText('CustomCommand', text));
  const xyY = fileColorOf(mvr, info)?.xyY;
  return {
    classing: one('Classing', auxUuid(mvr.classes?.[info.classing ?? -1])),
    traits: [
      ...bool('CastShadow', info.castShadow),
      ...bool('DMXInvertPan', info.dmxInvertPan),
      ...bool('DMXInvertTilt', info.dmxInvertTilt),
      ...one('Position', auxUuid(mvr.positions?.[info.position ?? -1])),
      ...one('Function', info.fixtureFunction),
    ],
    drawn: [
      ...(commands.length === 0 ? [] : [xmlElement('CustomCommands', {}, commands)]),
      ...one('Color', xyY?.map(float).join(',')),
    ],
  };
}

/** One node per entry the references can name, the first of each uuid. */
function auxNodes(tag: string, entries: readonly MvrAuxName[] | undefined): string[] {
  const seen = new Set<string>();
  return (entries ?? []).flatMap((entry) => {
    const uuid = auxUuid(entry);
    if (uuid === undefined || seen.has(uuidKey(uuid))) return [];
    seen.add(uuidKey(uuid));
    return [xmlElement(tag, { uuid, name: entry.name ?? '' }, [])];
  });
}

/**
 * The `<Position>` and `<Class>` nodes of `<AUXData>` the fixtures refer to, in the order of the MVR 1.6 Table 7
 * (`Symdef`, `Position`, `MappingDefinition`, `Class`). Each has the uuid and the name the file gave it: Table 11
 * and Table 14 define only `uuid` and `name`, and the design holds both, so nothing is made up.
 */
export function auxNameNodes(mvr: MvrDesignInfo | undefined): string[] {
  return [...auxNodes('Position', mvr?.positions), ...auxNodes('Class', mvr?.classes)];
}
