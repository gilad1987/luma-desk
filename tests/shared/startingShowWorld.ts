import { rigFromDesign } from '../../src/domain/stage/deriveRig';
import { frameOf } from '../../src/domain/stage/StageFrame';
import { createTemplate, type TemplateId } from '../../src/domain/stage/templates';
import { buildDemoShowFile } from '../../src/show/demo/demoShowFile';
import { StartingShow } from '../../src/show/startingShow/StartingShow';
import { showWorld } from './showWorld';

/** A stage as the stage service shows it after an import of template `id`. */
export function importedSourceOf(id: TemplateId) {
  const design = createTemplate(id);
  return { rig: rigFromDesign(design), design, frame: frameOf(design), cause: 'import', isBuiltIn: false } as const;
}

/**
 * A show world, a stage that can change (set `stage.current`), and the starting show over both, for the starting
 * show tests. The live stage reads `stage.current` at each call, as the stage service does after a rig change.
 */
export function startingShowWorld(id: TemplateId = 'theatre') {
  const world = showWorld();
  const stage = { current: importedSourceOf(id) };
  const live = {
    get rig() { return stage.current.rig; }, // prettier-ignore
    get design() { return stage.current.design; }, // prettier-ignore
    get frame() { return stage.current.frame; }, // prettier-ignore
    cause: 'import',
    isBuiltIn: false,
  } as const;
  const demo = { load: () => world.serializer.load(buildDemoShowFile(live.rig, live)) };
  const deps = { stage: live, demo, execs: world.execs, bus: world.bus };
  const show = new StartingShow({ ...deps, groupLibrary: world.groups, presetLibrary: world.presets });
  return { world, stage, live, show };
}
