export type { DeskTestApi, FixtureOutput } from './deskApi';
export type { SavedShow } from './savedShow';
export { STORAGE_KEYS } from './storageKeys';
export { TIMER_POLLING } from './timerPolling';
export { jsonRoundTrip } from './jsonRoundTrip';
export { readGolden } from './readGolden';
export { recordEvents } from './recordEvents';
export { makeZip } from './mvr/makeZip';
export { makeMvr } from './mvr/makeMvr';
export { sceneXml } from './mvr/sceneXml';
export { customCommands, fileDataFixture, fileDataMvr, type FileDataPlace } from './mvr/fileDataMvr';
export { PASS, passThroughMvr, treeOf } from './mvr/passThroughMvr';
export { fx, passFile, passScene, passUuid, ROT90Z, SIZED_TYPE, UNSIZED_TYPE } from './mvr/passScene';
export { loadNoDevices, withoutDevices } from './mvr/withoutDevices';
export { makeGdtf } from './mvr/makeGdtf';
export { gdtfFunctionMode, opticsOf, type FunctionChannel } from './mvr/gdtfFunctions';
export { OPTICS_MVR, OPTICS_PNG, OPTICS_REAL_MODE } from './mvr/opticsRig';
export { gdtfMode } from './mvr/gdtfMode';
export { makeGlb } from './mvr/makeGlb';
export { TRIANGLE_BYTES, triangleGlb, triangleGlbWithImage } from './mvr/triangleGlb';
export { make3ds } from './mvr/make3ds';
export { make3dsGroups, type TdsTestMaterial } from './mvr/make3dsGroups';
export { makeFixtureRecord, makeScene } from './mvr/makeFixtureRecord';
export { floorGrid, proxyAt, seatRows, wallGrid } from './mvr/makeProxyPlacements';
export { expectRigKept } from './mvr/expectRigKept';
export { SAMPLES_DIR, sampleFiles, readSample } from './mvr/localSamples';
export { importCounts, type ImportCounts } from './mvr/importCounts';
export { mvrMatrix } from './mvr/mvrMatrix';
export { meshScene, type TestPlacement } from './mvr/meshScene';
export { makeRawNameZip, type RawNamedFile } from './mvr/makeRawNameZip';
export { exportRoundTrip, type ExportRoundTrip } from './mvr/exportRoundTrip';
export { exportedBoxes } from './mvr/exportedBoxes';
export { RENDER_RIG_FIXTURES, renderStageMvr } from './mvr/renderStageMvr';
export { measureFrames, quantile, type RenderMeasure, type RenderStats } from './mvr/renderStats';
export { FakeIndexedDb } from './fakeIndexedDb';
export { fakeMvrFlowDeps, type FakeMvrFlow } from './mvr/fakeMvrFlowDeps';
export { MemoryStore } from './MemoryStore';
export { engineParts, stillClock } from './engineParts';
export { readSavedShow, showWorld } from './showWorld';
export { importedSourceOf, startingShowWorld } from './startingShowWorld';
export { BAD_STAGE, BUILT_IN, stageWorld } from './stageWorld';
export { importedDesign } from './importedDesign';
export { decodePng, encodePng, type RgbaImage } from './image/png';
export { BLOCK, perceptualDiff, type PerceptualDiff } from './image/perceptualDiff';
export { IMAGE_LIMITS, imageGateFailures } from './image/limits';
export { probeMvr, probeScene, type MvrProbe, type ProbeFixture, type ProbeMesh } from './mvrProbe/probeMvr';
export { compose, determinant, place, turn, type Affine, type Vec3 } from './mvrProbe/affine';
export { parseXml, type XmlNode } from './mvrProbe/xml';
export { gateImage, IMAGE_BASELINE_DIR, UPDATE_ENV, type ImageGateResult } from './image/imageGate';
export { ACCURACY_FIXTURES, accuracyStageMvr } from './mvr/accuracyStageMvr';
export { SCENERY_LAYERS, SCENERY_MESHES } from './mvr/accuracyScenery';
export { drawnSceneryBoxes, probeLayerBox, type DrawnSceneryBox } from './mvrProbe/sceneryBoxes';
export {
  angleDeg,
  axesInThree,
  drawnPlacements,
  toThree,
  turnByQuat,
  type DrawnPlacements,
} from './mvrProbe/threeFrame';
export { scaledStageMvr } from './mvr/scaledStageMvr';
export { DEFAULT_MESH_DIR, MOVER_DROPS, MOVER_SIZES, shippedDefaultMesh } from './mvr/shapeRig';
export { importShapeRig, shapeMover, shapeStatic } from './mvr/shapeRig';
