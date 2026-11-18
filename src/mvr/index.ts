/**
 * Public API of the MVR layer. Callers import only from here, so the parser's inner steps (archive, scene walk, GDTF,
 * mesh bounds, design) and the writer's steps can change without touching the UI or render code.
 */
export { exportMvr, type MvrExport, type MvrExportOptions } from './export/exportMvr';
export type { MvrExportSummary } from './export/MvrExportSummary';
export type { MeshShape } from './export/MeshShape';
export { meshShapes } from './export/meshShapes';
export { importMvr, type MvrImportOptions } from './importMvr';
export type { LayerBox } from './design/layerBoxes';
export { stageBox } from './design/stageBox';
export { isFiniteBox, type Aabb, type Point3 } from './math/Aabb';
export type { MvrGeometry, MvrImport, MvrSummary } from './MvrImport';
export { mvrToThreeMatrix, pointToThree, toThree } from './math/axes';
export { FAR, fileBox, outside } from './import/importProxies';
export { archiveName } from './mesh/archiveName';
export { isEmbeddedUri } from './mesh/isEmbeddedUri';
export { meshFormatOf } from './mesh/meshFormatOf';
export { MvrError, type MvrWarning, type MvrWarningCode } from './MvrWarning';
export type { MeshPlacement } from './scene/MvrScene';
export type { MvrProxy, ProxyKind, SeatProxy } from './scene/ProxyPlacement';
export { seatProxies } from './scene/proxyWarnings';
export { isScreenPlacement } from './scene/isScreenPlacement';
