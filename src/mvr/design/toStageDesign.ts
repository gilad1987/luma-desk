import type { StageDesign, StageFixture } from '../../domain/stage/StageDesign';
import { STAGE_DESIGN_VERSION } from '../../domain/stage/StageDesign';
import type { SceneryPart, StageSource, Vec3 } from '../../domain/stage/types';
import { pointToThree, quaternionOf, toThree } from '../math/axes';
import { transformPoint } from '../math/Mat4';
import type { MvrGeometry } from '../MvrImport';
import type { MvrWarning } from '../MvrWarning';
import { assignIds } from './assignIds';
import { assignRole, mountOf } from './assignRole';
import { bodyRotation } from './bodyRotation';
import type { DesignInput, ResolvedFixture } from './DesignInput';
import { fitScene, type FittedScene } from './fitScene';
import { hallLayers } from './hallLayers';
import { layerBoxes } from './layerBoxes';
import { mvrInfo } from './mvrInfo';
import { stageCore } from './stageCore';
import { placementBoxes } from './surfaces';

/** All scenery off: the file brings its own stage, and the venue's deck, trusses and band would stand in it. */
const NO_SCENERY: Readonly<Record<SceneryPart, boolean>> = {
  deck: false,
  trusses: false,
  band: false,
  ledWall: false,
  crowd: false,
};

/** What `toStageDesign` gives the import: the design, the scenery to draw and the design step's own warnings. */
export interface DesignResult {
  readonly design: StageDesign;
  readonly geometry: MvrGeometry;
  readonly warnings: readonly MvrWarning[];
}

/** One desk fixture from a resolved fixture, its id and its fitted position; a body at rest gets no `rotation`. */
function stageFixture(fixture: ResolvedFixture, id: number, position: Vec3, fitted: FittedScene): StageFixture {
  const mount = mountOf(fixture.record.matrix);
  const rotation = bodyRotation(quaternionOf(toThree(fixture.record.matrix)), mount);
  const base: StageFixture = {
    id,
    type: fixture.type,
    role: assignRole(position, mount, fitted.deck),
    trussId: null,
    position,
    mount,
    ...(rotation ? { rotation } : {}),
  };
  return fixture.patch ? { ...base, patch: { ...fixture.patch, mode: fixture.mode } } : base;
}

/**
 * Builds the stage design of an MVR import from the scene and its resolved fixtures. The design uses the `mvr` venue
 * (only a dark ground and the night sky: the walls or terraces of another venue would add objects the file does not
 * have, or cut through its set) with all scenery off, keeps the file's fixtures at their real places (fitted), puts
 * the MVR facts in `mvr`; the meshes go to `geometry`, which render draws. Without any readable mesh the fixtures are
 * still fitted and placed, and a `no-geometry` warning says the stage shows fixtures only.
 */
export function toStageDesign(input: DesignInput): DesignResult {
  const warnings: MvrWarning[] = [];
  const warn = (warning: MvrWarning): void => {
    warnings.push(warning);
  };
  const ids = assignIds(
    input.fixtures.map((fixture) => fixture.record),
    warn,
  );
  const { placements } = input.scene;
  const boxes = placementBoxes(placements, input.meshBoxes);
  if (boxes.length === 0) warn({ code: 'no-geometry', message: 'No mesh could be read; only fixtures are shown.' });
  const raw = input.fixtures.map((fixture) => pointToThree(transformPoint(fixture.record.matrix, [0, 0, 0])));
  const layers = layerBoxes(placements, input.meshBoxes);
  const hall = hallLayers(layers, stageCore(placements, input.meshBoxes, raw), warn);
  const fitted = fitScene({ positions: raw, meshBoxes: boxes, layers, hall }, warn, input.fixed);
  const fixtures = input.fixtures.map((fixture, index) =>
    stageFixture(fixture, ids[index] ?? index + 1, fitted.positions[index] ?? [0, 0, 0], fitted),
  );
  const source: StageSource = {
    kind: 'mvr',
    name: input.name,
    ...(input.fileHash ? { fileHash: input.fileHash } : {}),
  };
  const design: StageDesign = {
    v: STAGE_DESIGN_VERSION,
    source,
    venue: { kind: 'mvr' },
    scenery: NO_SCENERY,
    deck: fitted.deck,
    screens: [],
    risers: [],
    trusses: [],
    fixtures,
    mvr: { ...mvrInfo(input.fixtures, ids, input.scene, fitted.offset), hiddenLayers: hall },
  };
  const { offset, bounds, surfaces } = fitted;
  const geometry = { placements, offset, bounds, surfaces, layers: fitted.layers, hallLayers: hall };
  return { design, geometry, warnings };
}
