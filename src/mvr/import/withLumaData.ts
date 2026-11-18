import type { DesignResult } from '../design/toStageDesign';
import { LUMA_MESH_PREFIX, type LumaStageData } from '../luma/lumaData';
import type { MvrWarningCode } from '../MvrWarning';
import type { MvrScene } from '../scene/MvrScene';
import { applyLumaData, type LumaApplied } from './applyLumaData';

/**
 * The scene without the desk's own `luma_*` meshes when the file holds luma data. The desk rebuilds those stage parts
 * from that data, so drawing the meshes too would show the stage twice and give beams two copies of every surface.
 * Other tools have no luma data and draw the meshes, which is why the export writes them.
 */
export function withoutLumaMeshes(scene: MvrScene, luma: LumaStageData | undefined): MvrScene {
  if (!luma) return scene;
  return { ...scene, placements: scene.placements.filter((placement) => !placement.file.startsWith(LUMA_MESH_PREFIX)) };
}

/**
 * The design step's result with the luma data applied. The luma data rebuilds the stage parts, so a file without any
 * mesh still shows a whole stage and its `no-geometry` warning would be noise; stored hidden layers replace the
 * hall rule's, so its `hidden-layers` line would name layers that are not hidden.
 */
export function withLumaData(result: DesignResult, luma: LumaStageData | undefined): LumaApplied {
  if (!luma) return result;
  const applied = applyLumaData(result.design, luma);
  const noise: readonly MvrWarningCode[] = luma.hiddenLayers ? ['no-geometry', 'hidden-layers'] : ['no-geometry'];
  const designWarnings = result.warnings.filter((warning) => !noise.includes(warning.code));
  return { design: applied.design, warnings: [...designWarnings, ...applied.warnings] };
}
