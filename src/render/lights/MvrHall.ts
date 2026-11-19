import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, PMREMGenerator, type Scene } from 'three';
import type { StageBounds } from '../../domain/stage/types';
import { prefilterHall, syncHallReflection } from '../lighting/hallReflection';
import { lightHallShell, placeHallShell, resetHallShell } from '../venue/hall/hallShell';
import { showsFileHall } from '../venue/hall/hallShellPlan';
import { MvrHallLight } from './MvrHallLight';

/**
 * The hall of an imported stage: its work light (`MvrHallLight`), the hall map that metals mirror
 * (`hallReflection`) and, while the file shows no hall of its own, the desk-made shell around stage and seats
 * (`placeHallShell`). All of it goes with the hall, so a built-in stage has none of it.
 */
export class MvrHall extends MvrHallLight {
  readonly #scene: Scene;
  /** What the last scenery fit said; a hall that comes on before its scenery is known has no file hall yet. */
  #fileHall = false;
  /** A point-sized mesh that draws nothing: the renderer hands itself over through it, to prefilter the hall map. */
  #probe: Mesh | null = null;

  constructor(scene: Scene) {
    super(scene);
    this.#scene = scene;
  }

  override show(box: StageBounds): void {
    super.show(box);
    if (this.#probe) return;
    const point = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(9), 3));
    const probe = new Mesh(point, new MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
    probe.frustumCulled = false;
    // with the map made the probe has no more work: hidden, it is not drawn and makes no closure per frame
    probe.onBeforeRender = (renderer) =>
      void (probe.visible = !prefilterHall((panorama) => {
        const generator = new PMREMGenerator(renderer);
        const map = generator.fromEquirectangular(panorama);
        generator.dispose();
        return map;
      }));
    this.#probe = probe;
    this.#scene.add(probe);
  }

  /**
   * Places the lights and the shell over `box`. The scenery fit also gives the uuids of the file's hall layers and
   * of the hidden layers: the shell stands only while none of the file's hall layers is shown.
   */
  override place(box: StageBounds, hallLayers?: readonly string[], hidden: readonly string[] = []): void {
    super.place(box);
    if (!this.isOn) return;
    if (hallLayers) this.#fileHall = showsFileHall(hallLayers, hidden);
    placeHallShell(this.#scene, this.#fileHall ? undefined : box);
  }

  /** The house control, for the work lights and for the walls of the shell, which show that light. */
  override setLevel(level: number): void {
    super.setLevel(level);
    if (this.isOn) lightHallShell(level);
  }

  override hide(): void {
    super.hide();
    this.#fileHall = false;
    resetHallShell();
    // at once, not at the next frame: the bodies of the next stage sync before the scene lights do
    syncHallReflection(undefined);
    if (!this.#probe) return;
    this.#scene.remove(this.#probe);
    this.#probe.geometry.dispose();
    if (!Array.isArray(this.#probe.material)) this.#probe.material.dispose();
    this.#probe = null;
  }
}
