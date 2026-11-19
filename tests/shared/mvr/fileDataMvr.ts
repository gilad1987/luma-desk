import { makeMvr } from './makeMvr';
import { sceneXml } from './sceneXml';

/** Where a synthetic fixture hangs, in metres from the stage centre; 5 m up when no height is given. */
export interface FileDataPlace {
  readonly x: number;
  readonly y?: number;
  readonly z?: number;
}

/**
 * A hanging `<Fixture>` of an invented product with no GDTF file, so the desk types it from its name (`Ghost@Wash`
 * is a wash). `children` is the file data under test: `<Color>`, `<CustomCommands>`, `<Position>` and the like.
 */
export function fileDataFixture(uuid: string, children: string, place: FileDataPlace = { x: 0 }, spec = 'Ghost@Wash') {
  const at = `{${place.x * 1000},${(place.y ?? 0) * 1000},${(place.z ?? 5) * 1000}}`;
  return (
    `<Fixture uuid="${uuid}" name="${uuid}"><Matrix>{1,0,0}{0,1,0}{0,0,1}${at}</Matrix>` +
    `<GDTFSpec>${spec}</GDTFSpec><GDTFMode>Std</GDTFMode>${children}</Fixture>`
  );
}

/** The `<CustomCommands>` node of the given command texts. */
export function customCommands(...texts: readonly string[]): string {
  return `<CustomCommands>${texts.map((text) => `<CustomCommand>${text}</CustomCommand>`).join('')}</CustomCommands>`;
}

/** An `.mvr` of one layer with the given fixtures and `<AUXData>` content, with no GDTF and no mesh. */
export function fileDataMvr(fixtures: readonly string[], auxData = ''): Uint8Array {
  return makeMvr(sceneXml(`<Layer uuid="L1" name="Rig"><ChildList>${fixtures.join('')}</ChildList></Layer>`, auxData));
}
