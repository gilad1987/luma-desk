import { familyModels } from './families/familyModels';
import { once } from './modelGeometry';
import { FORTE_HEAD } from './models/forteHead';
import { MEGAPOINTE_HEAD } from './models/megapointeHead';
import type { BuiltModel, FixtureModel, ModelContext, ModelKit } from './models/ModelContext';
import { PARFECT_MODEL } from './models/parfectModel';
import { robeBaseGeometry } from './models/robeBase';
import { buildRobeMover, type RobeHead } from './models/robeMover';
import { robeYokeGeometry } from './models/robeYoke';
import { SOURCE_FOUR_MODEL } from './models/sourceFourModel';
import { SPIIDER_HEAD } from './models/spiiderHead';
import { STRIKE4_MODEL } from './models/strike4Model';
import { TETRA2_MODEL } from './models/tetra2Model';
import { WTF_MODEL } from './models/wtfModel';

/** Builds one fixture's body into its context. */
export type ModelBuilder = (c: ModelContext) => BuiltModel;

/** The builder for each `FixtureType.model`. */
export type FixtureModelTable = Readonly<Record<string, ModelBuilder>>;

/**
 * One procedural builder per real product. Geometry is in fixture units (the visual scales the group by T.size),
 * built in the hang orientation (base up, tilt axis at the origin, lens facing -Y), and made on the first fixture
 * of each model, then shared by every fixture of that model; so the table belongs to one scene build. The catalogue
 * products follow the 9 natives, keyed by product id, and share the Robe base cache with them.
 */
export function createFixtureModels(kit: ModelKit): FixtureModelTable {
  const robeBase = once(() => robeBaseGeometry(kit.prims));
  const robe = (head: RobeHead, fs: boolean): ModelBuilder => {
    const geometry = once(() => ({ ...head.geometry(kit.prims, fs), ...robeYokeGeometry(kit.prims, head.ax) }));
    return (c) => buildRobeMover(kit, c, { model: head, geometry: geometry(), base: robeBase() });
  };
  const product = <G extends object>(model: FixtureModel<G>): ModelBuilder => {
    const geometry = once(() => model.geometry(kit.prims));
    return (c) => model.build(kit, geometry(), c);
  };
  const natives: FixtureModelTable = {
    forte: robe(FORTE_HEAD, false),
    forteFS: robe(FORTE_HEAD, true),
    megapointe: robe(MEGAPOINTE_HEAD, false),
    spiider: robe(SPIIDER_HEAD, false),
    wtf: product(WTF_MODEL),
    strike4: product(STRIKE4_MODEL),
    parfect: product(PARFECT_MODEL),
    s4: product(SOURCE_FOUR_MODEL),
    tetra2: product(TETRA2_MODEL),
  };
  return { ...natives, ...familyModels(kit, { robeBase }) };
}
