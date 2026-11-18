import type { StageDesign, StageFixture } from '../../domain/stage/StageDesign';
import type { FixtureVisuals } from '../../render/fixtures/FixtureVisuals';
import type { GdtfBodyInput, GdtfBodyLibrary, GdtfPlacement } from '../../render/fixtures/gdtf';
import type { BodyLine } from '../../mvr/import/bodyWarnings';
import { bodyNoteLines } from './bodyNoteLines';
import { measureMvrBodies, type MvrBodyInfo } from './measureMvrBodies';

export interface GdtfBodyFlowDeps {
  readonly visuals: Pick<FixtureVisuals, 'setGdtf' | 'visuals'>;
  /** The stage design of the moment: a body follows its fixture when the builder moves it. */
  readonly design: () => StageDesign;
}

/**
 * The real fixture bodies of the imported stage. The rig exists before the model files are parsed (a stored MVR is
 * imported again at boot), so the fixtures start with their desk bodies and the rig is rebuilt once when the bodies
 * are ready. The body code is a lazy chunk and creates no three.js object before the first MVR load, so the
 * built-in stage keeps its creation order (decision 24).
 */
export class GdtfBodyFlow {
  readonly #deps: GdtfBodyFlowDeps;
  #library: GdtfBodyLibrary | undefined;
  #bodies: GdtfBodyInput['bodies'] | undefined;
  #run = 0;
  #index: { readonly design: StageDesign; readonly byId: ReadonlyMap<number, StageFixture> } | undefined;

  constructor(deps: GdtfBodyFlowDeps) {
    this.#deps = deps;
  }

  /** The body lines as the draw left them (`bodyNoteLines`); undefined when a later call won. Never rejects. */
  async show(input: GdtfBodyInput): Promise<readonly BodyLine[] | undefined> {
    const run = ++this.#run;
    let library: GdtfBodyLibrary | undefined;
    let handed = false;
    try {
      const [{ GdtfBodyLibrary, gdtfBodySource }, { bodyShift }] = await Promise.all([
        import('../../render/fixtures/gdtf'),
        import('../../mvr/design/bodyShift'),
      ]);
      library = new GdtfBodyLibrary();
      await library.load(input);
      if (run !== this.#run) return (library.dispose(), undefined);
      // the export moves a fixture to its MVR insertion point with the same shift, so the root lands where MVR put it
      const placementOf = (id: number): GdtfPlacement | undefined => {
        const design = this.#deps.design(),
          uuid = design.mvr?.fixtures[id]?.uuid,
          fixture = this.#fixture(design, id);
        if (uuid === undefined || !fixture) return undefined;
        return { uuid, insertion: bodyShift(fixture, design.mvr, 'toMount') };
      };
      handed = true;
      this.#deps.visuals.setGdtf(gdtfBodySource(library, placementOf));
      // held only once the visuals draw it: a failed rebuild frees it in the catch and the old one stays held
      const old = this.#library;
      [this.#library, this.#bodies] = [library, input.bodies];
      old?.dispose();
      return bodyNoteLines(input.bodies, library.notes);
    } catch (error) {
      console.warn('GDTF fixture bodies failed; the desk bodies stay', error); // and the lines say so
      // a rebuild that threw may have left the new source with the visuals, and its library is freed here
      if (handed) this.#unset();
      if (library !== this.#library) library?.dispose();
      return run === this.#run ? bodyNoteLines(input.bodies, undefined) : undefined;
    }
  }

  /** Puts every fixture back on its desk body and frees the geometries; a `show` that still parses is dropped. */
  clear(): void {
    this.#run++;
    if (this.#library) this.#unset();
  }

  /** Takes the source from the visuals and frees the held library. Never throws: `show` calls it from its catch. */
  #unset(): void {
    const library = this.#library;
    this.#library = this.#bodies = undefined;
    try {
      this.#deps.visuals.setGdtf(undefined);
    } catch (error) {
      console.warn('GDTF fixture bodies: the desk bodies cannot be rebuilt', error);
    }
    library?.dispose();
  }

  /** Measures every drawn light body; only the test hook calls it. */
  measure(): Promise<readonly MvrBodyInfo[]> {
    return measureMvrBodies(this.#deps.visuals.visuals, this.#deps.design().mvr, this.#bodies);
  }

  #fixture(design: StageDesign, id: number): StageFixture | undefined {
    if (this.#index?.design !== design)
      this.#index = { design, byId: new Map(design.fixtures.map((fixture) => [fixture.id, fixture])) };
    return this.#index.byId.get(id);
  }
}
